import { MarketProvider } from '../providers/marketProvider';
import { SymbolMapper } from '../providers/symbolMapper';
import { ApiKeyModel } from '../models/ApiKey';
import WebSocket from 'ws';

export class MarketService {
  private static readonly CANDLE_TTL_MS = 60000;
  private static readonly latestPriceCache = new Map<string, { value: any; timestamp: number; isStale: boolean }>();
  private static readonly candleCache = new Map<string, { value: any; expiresAt: number }>();
  private static readonly quotePromises = new Map<string, Promise<any>>();
  private static readonly candlePromises = new Map<string, Promise<any>>();

  private static isRunning = false;
  private static isRefreshing = false;
  private static activeSymbols: string[] = [];
  private static dirtySymbols = new Set<string>();
  
  private static ws: WebSocket | null = null;
  private static binanceWs: WebSocket | null = null;
  private static finnhubWs: WebSocket | null = null;
  // Automatically populated with all non-crypto active symbols
  private static WS_SYMBOLS: string[] = [];

  public static metrics = {
    providerRequests: 0,
    providerErrors: 0,
    cacheHits: 0,
    cacheMisses: 0,
    activeSymbols: 0,
    lastSuccessfulUpdate: 0,
    staleSymbols: 0,
  };

  static async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[MarketService] Starting background market data refresh service');

    try {
      const yahooKey = await ApiKeyModel.findOne({ provider: 'YAHOO' });
      this.isYahooActive = yahooKey ? yahooKey.status === 'ACTIVE' : false;
    } catch(e) {
      console.error('[MarketService] Error fetching YAHOO state on start');
      this.isYahooActive = false;
    }

    this.activeSymbols = await this.getWatchSymbols();
    this.metrics.activeSymbols = this.activeSymbols.length;
    
    const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'LTCUSDT', 'BCHUSDT', 'XRPUSDT', 'DOGEUSDT'].map(s => s.replace('USDT', 'USD'));
    // Populate TwelveData symbols (everything except crypto)
    this.WS_SYMBOLS = this.activeSymbols
      .filter(sym => !cryptoSymbols.includes(sym))
      .map(sym => {
        if (sym.length === 6 && !sym.includes('/')) return `${sym.substring(0,3)}/${sym.substring(3)}`;
        if (sym === 'USOIL') return 'WTI';
        if (sym === 'UKOIL') return 'BRENT';
        return sym;
      });

    // Initial fetch for the WS symbols ONLY to populate the cache
    await this.refreshQuotes(this.WS_SYMBOLS.map(s => s.replace('/', '')));

    // Start fast polling for non-WS symbols using Yahoo Finance
    setInterval(async () => {
      try {
        if (this.activeSymbols.length === 0) return;
        
        const nonWsSymbols = this.activeSymbols.filter(
          sym => !this.WS_SYMBOLS.includes(sym) && !this.WS_SYMBOLS.includes(sym.replace('/', '')) && !cryptoSymbols.includes(sym)
        );
        
        if (nonWsSymbols.length > 0) {
          await this.pollYahooQuotes(nonWsSymbols);
        }
      } catch (err) {
        console.error('[MarketService] Yahoo polling error:', err);
      }
    }, 2500);

    // Connect to Twelve Data WebSocket for real-time live prices
    this.connectWebSocket();
    
    // Connect to Binance WebSocket for FREE real-time Crypto prices
    this.connectBinanceWebSocket();

    // Connect to Finnhub WebSocket for real-time prices (if active)
    this.connectFinnhubWebSocket();

    const symbolRefreshMs = Number(process.env.SYMBOL_REFRESH_MS) || 60000; // Slower refresh
    setInterval(async () => {
      try {
        this.activeSymbols = await this.getWatchSymbols();
        this.metrics.activeSymbols = this.activeSymbols.length;
        
        // Update WS_SYMBOLS list in background
        const updatedWsSymbols = this.activeSymbols
          .filter(sym => !cryptoSymbols.includes(sym))
          .map(sym => {
            if (sym.length === 6 && !sym.includes('/')) return `${sym.substring(0,3)}/${sym.substring(3)}`;
            if (sym === 'USOIL') return 'WTI';
            if (sym === 'UKOIL') return 'BRENT';
            return sym;
          });
          
        // Reconnect if the symbols list changed
        if (updatedWsSymbols.sort().join(',') !== this.WS_SYMBOLS.sort().join(',')) {
          this.WS_SYMBOLS = updatedWsSymbols;
          console.log('[MarketService] Watchlist changed, reconnecting WebSocket...');
          if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
            this.ws.close();
          }
        }
      } catch (err) {
        console.error('[MarketService] Symbol refresh error:', err);
      }
    }, symbolRefreshMs);
  }
  
  private static currentTwelveDataKeyId: string | null = null;
  
  public static async reloadProvider(provider: string) {
    if (provider === 'TWELVEDATA') {
      console.log('[MarketService] Forcing TwelveData WebSocket reload...');
      if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
        this.ws.close();
      } else {
        this.connectWebSocket();
      }
    } else if (provider === 'BINANCE') {
      console.log('[MarketService] Forcing Binance WebSocket reload...');
      if (this.binanceWs && (this.binanceWs.readyState === 0 || this.binanceWs.readyState === 1)) {
        this.binanceWs.close();
      } else {
        this.connectBinanceWebSocket();
      }
    } else if (provider === 'FINNHUB') {
      console.log('[MarketService] Forcing Finnhub WebSocket reload...');
      if (this.finnhubWs && (this.finnhubWs.readyState === 0 || this.finnhubWs.readyState === 1)) {
        this.finnhubWs.close();
      } else {
        this.connectFinnhubWebSocket();
      }
    } else if (provider === 'YAHOO') {
      console.log('[MarketService] Reloading Yahoo status...');
      const keyRecord = await ApiKeyModel.findOne({ provider: 'YAHOO' });
      this.isYahooActive = keyRecord?.status === 'ACTIVE';
    }
  }

  private static async connectWebSocket() {
    let apiKey: string | null = null;
    
    try {
      const keyRecord = await ApiKeyModel.findOne({ provider: 'TWELVEDATA', status: 'ACTIVE' });
      if (keyRecord && keyRecord.keyValue) {
        apiKey = keyRecord.keyValue;
        this.currentTwelveDataKeyId = keyRecord._id as string;
      } else {
        this.currentTwelveDataKeyId = null;
      }
    } catch (e) {
      console.error('[MarketService] Error fetching API Key from DB:', e);
    }

    if (!apiKey) {
      console.warn('[MarketService] No ACTIVE TWELVEDATA_API_KEY found in DB, skipping WebSocket connection');
      return;
    }

    const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.on('open', () => {
      console.log(`[MarketService] TwelveData WebSocket connected`);
      const subscribeMsg = {
        action: 'subscribe',
        params: {
          symbols: this.WS_SYMBOLS.join(',')
        }
      };
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(subscribeMsg));
      }
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.event === 'price') {
          await this.handleTick(message);
        } else if (message.event === 'subscribe-status') {
          console.log('[MarketService] WS Subscribe Status:', message);
          
          // Check for limit exhaustion
          if (message.status === 'error' && message.fails) {
             const hasLimitError = message.fails.some((f: any) => 
               f.message && (f.message.toLowerCase().includes('limit') || f.message.toLowerCase().includes('quota') || f.message.toLowerCase().includes('plan'))
             );
             if (hasLimitError && this.currentTwelveDataKeyId) {
               console.warn('[MarketService] TwelveData API Limit reached! Marking key as EXHAUSTED and rotating...');
               await ApiKeyModel.findByIdAndUpdate(this.currentTwelveDataKeyId, { status: 'EXHAUSTED', errorCount: 1 });
               ws.close(); // Will trigger reconnect in 'close' event
             }
          }
        } else if (message.event === 'error') {
           // Global connection error from TD
           if (message.message && (message.message.toLowerCase().includes('limit') || message.message.toLowerCase().includes('quota') || message.message.toLowerCase().includes('plan'))) {
               console.warn('[MarketService] TwelveData API Limit reached (Global Error)! Marking key as EXHAUSTED and rotating...');
               if (this.currentTwelveDataKeyId) {
                 await ApiKeyModel.findByIdAndUpdate(this.currentTwelveDataKeyId, { status: 'EXHAUSTED', errorCount: 1 });
               }
               ws.close();
           }
        }
      } catch (err) {
        console.error('[MarketService] WS message error:', err);
      }
    });

    ws.on('unexpected-response', (request, response) => {
      console.error(`[MarketService] TwelveData WebSocket unexpected response: ${response.statusCode}`);
      if (response.statusCode === 200) {
        console.error('[MarketService] This usually means API rate limit or plan limit reached.');
      }
    });

    ws.on('close', () => {
      console.log(`[MarketService] TwelveData WebSocket closed. Reconnecting in 10s...`);
      if (this.ws === ws) this.ws = null;
      setTimeout(() => this.connectWebSocket(), 10000);
    });

    ws.on('error', (err) => {
      console.error('[MarketService] TwelveData WebSocket error:', err.message);
    });
  }

  private static async handleTick(tick: any) {
    const normalized = this.normalizeSymbol(tick.symbol.replace('/', ''));
    if (!normalized) return;

    const existingCached = this.latestPriceCache.get(normalized);
    const newPrice = Number(tick.price);
    
    if (existingCached) {
      const quote = existingCached.value;
      const changed = quote.price !== newPrice;

      if (changed) {
        const spreadPips = MarketProvider.getSpread(normalized);
        const digits = MarketProvider.getDigits(normalized);
        const pipSize = digits === 2 || digits === 3 ? 0.01 : 0.0001;
        const spreadValue = spreadPips * pipSize;

        quote.price = newPrice;
        quote.bid = Number(newPrice.toFixed(6));
        quote.ask = Number((newPrice + spreadValue).toFixed(6));
        quote.spread = spreadPips;
        if (newPrice > quote.high) quote.high = newPrice;
        if (newPrice < quote.low) quote.low = newPrice;
        quote.timestamp = Date.now();
        existingCached.isStale = false;

        this.dirtySymbols.add(normalized);
        this.metrics.lastSuccessfulUpdate = Date.now();
        
        const { PriceEngine } = await import('./priceEngine');
        PriceEngine.scheduleProcessing();
      }
    } else {
      // If no base quote exists in cache, fetch it via REST
      if (!this.quotePromises.has(normalized)) {
        const fetchPromise = (async () => {
          try {
            const baseQuote = await MarketProvider.fetchQuote(normalized);
            this.latestPriceCache.set(normalized, { value: baseQuote, timestamp: Date.now(), isStale: false });
            this.dirtySymbols.add(normalized);
            const { PriceEngine } = await import('./priceEngine');
            PriceEngine.scheduleProcessing();
          } catch (err: any) {
            console.warn(`[MarketService] Failed to fetch base quote for ${normalized}: ${err.message}`);
          } finally {
            this.quotePromises.delete(normalized);
          }
        })();
        this.quotePromises.set(normalized, fetchPromise);
      }
    }
  }

  private static async connectFinnhubWebSocket() {
    let apiKey: string | null = null;
    
    try {
      const keyRecord = await ApiKeyModel.findOne({ provider: 'FINNHUB', status: 'ACTIVE' });
      if (keyRecord && keyRecord.keyValue) {
        apiKey = keyRecord.keyValue;
      }
    } catch (e) {
      console.error('[MarketService] Error fetching Finnhub Key from DB:', e);
    }

    if (!apiKey) {
      return;
    }

    const wsUrl = `wss://ws.finnhub.io?token=${apiKey}`;
    const ws = new WebSocket(wsUrl);
    this.finnhubWs = ws;

    ws.on('open', () => {
      console.log(`[MarketService] Finnhub WebSocket connected`);
      for (const symbol of this.WS_SYMBOLS) {
        const fhSymbol = MarketProvider.getFinnhubSymbol(symbol);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'subscribe', symbol: fhSymbol }));
        }
      }
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'trade' && message.data && message.data.length > 0) {
          const trade = message.data[0];
          let internalSymbol = trade.s;
          if (trade.s.startsWith('OANDA:')) {
            internalSymbol = trade.s.replace('OANDA:', '').replace('_', '');
          } else if (trade.s.startsWith('BINANCE:')) {
            internalSymbol = trade.s.replace('BINANCE:', '').replace('USDT', 'USD');
          }
          await this.handleFinnhubTick(internalSymbol, trade);
        }
      } catch (err) {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log('[MarketService] Finnhub WebSocket closed. Reconnecting in 5s...');
      if (this.finnhubWs === ws) this.finnhubWs = null;
      setTimeout(() => this.connectFinnhubWebSocket(), 5000);
    });

    ws.on('error', (err) => {
      console.error('[MarketService] Finnhub WebSocket error:', err);
    });
  }

  private static async handleFinnhubTick(symbol: string, trade: any) {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return;

    const existingCached = this.latestPriceCache.get(normalized);
    const newPrice = Number(trade.p);
    
    if (existingCached) {
      const quote = existingCached.value;
      const changed = quote.price !== newPrice;

      if (changed) {
        const spreadPips = MarketProvider.getSpread(normalized);
        const digits = MarketProvider.getDigits(normalized);
        const pipSize = digits === 2 || digits === 3 ? 0.01 : 0.0001;
        const spreadValue = spreadPips * pipSize;

        quote.price = newPrice;
        quote.bid = Number(newPrice.toFixed(6));
        quote.ask = Number((newPrice + spreadValue).toFixed(6));
        quote.spread = spreadPips;
        if (newPrice > quote.high) quote.high = newPrice;
        if (newPrice < quote.low) quote.low = newPrice;
        quote.timestamp = Date.now();
        existingCached.isStale = false;

        this.dirtySymbols.add(normalized);
        this.metrics.lastSuccessfulUpdate = Date.now();
        
        const { PriceEngine } = await import('./priceEngine');
        PriceEngine.scheduleProcessing();
      }
    } else {
      if (!this.quotePromises.has(normalized)) {
        const fetchPromise = (async () => {
          try {
            const baseQuote = await MarketProvider.fetchQuote(normalized);
            this.latestPriceCache.set(normalized, { value: baseQuote, timestamp: Date.now(), isStale: false });
            this.dirtySymbols.add(normalized);
            const { PriceEngine } = await import('./priceEngine');
            PriceEngine.scheduleProcessing();
          } catch (err: any) {
            console.warn(`[MarketService] Failed to fetch base quote for ${normalized}: ${err.message}`);
          } finally {
            this.quotePromises.delete(normalized);
          }
        })();
        this.quotePromises.set(normalized, fetchPromise);
      }
    }
  }

  private static async connectBinanceWebSocket() {
    try {
      const keyRecord = await ApiKeyModel.findOne({ provider: 'BINANCE' });
      if (!keyRecord || keyRecord.status !== 'ACTIVE') {
        console.warn('[MarketService] BINANCE provider is INACTIVE or missing, skipping connection');
        return;
      }
    } catch (e) {
      console.error('[MarketService] Error fetching Binance Key from DB:', e);
    }

    // List of crypto symbols we want to support
    const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'LTCUSDT', 'BCHUSDT', 'XRPUSDT', 'DOGEUSDT'];
    const streams = cryptoSymbols.map(s => s.toLowerCase() + '@ticker').join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    const ws = new WebSocket(wsUrl);
    this.binanceWs = ws;

    ws.on('open', () => {
      console.log('[MarketService] Binance WebSocket connected (FREE CRYPTO)');
    });

    ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.data && message.data.c) {
          const s = message.data.s; // e.g., 'BTCUSDT'
          // Convert back to our symbol format (BTCUSDT -> BTCUSD)
          let symbol = s.replace('USDT', 'USD');
          
          await this.handleBinanceTick(symbol, message.data);
        }
      } catch (err) {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log('[MarketService] Binance WebSocket closed. Reconnecting in 5s...');
      if (this.binanceWs === ws) this.binanceWs = null;
      setTimeout(() => this.connectBinanceWebSocket(), 5000);
    });
    
    ws.on('error', (err) => {
      console.error('[MarketService] Binance WebSocket error:', err);
    });
  }

  private static async handleBinanceTick(symbol: string, tick: any) {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return;

    const existingCached = this.latestPriceCache.get(normalized);
    const newPrice = Number(tick.c);
    
    if (existingCached) {
      const quote = existingCached.value;
      const changed = quote.price !== newPrice;

      if (changed) {
        quote.price = newPrice;
        quote.bid = Number(tick.b) || newPrice;
        quote.ask = Number(tick.a) || newPrice;
        quote.spread = Number((quote.ask - quote.bid).toFixed(6)) * 10000; // rough estimation for crypto or keep it 0 if it's dynamic
        quote.high = Number(tick.h) || quote.high;
        quote.low = Number(tick.l) || quote.low;
        quote.open = Number(tick.o) || quote.open;
        quote.change = newPrice - quote.open;
        quote.changePercent = quote.open !== 0 ? (quote.change / quote.open) * 100 : 0;
        quote.volume = Number(tick.v) || quote.volume;
        quote.timestamp = Date.now();
        existingCached.isStale = false;

        this.dirtySymbols.add(normalized);
        this.metrics.lastSuccessfulUpdate = Date.now();
        
        const { PriceEngine } = await import('./priceEngine');
        PriceEngine.scheduleProcessing();
      }
    } else {
      // Create a base quote from Binance data if none exists
      const quote = {
        symbol: normalized,
        price: newPrice,
        bid: Number(tick.b) || newPrice,
        ask: Number(tick.a) || newPrice,
        spread: 0,
        high: Number(tick.h) || newPrice,
        low: Number(tick.l) || newPrice,
        open: Number(tick.o) || newPrice,
        previousClose: Number(tick.o) || newPrice,
        change: newPrice - (Number(tick.o) || newPrice),
        changePercent: tick.P ? Number(tick.P) : 0,
        category: 'CRYPTO',
        marketStatus: 'OPEN',
        volume: Number(tick.v) || 0,
        timestamp: Date.now()
      };
      
      this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
      this.dirtySymbols.add(normalized);
      const { PriceEngine } = await import('./priceEngine');
      PriceEngine.scheduleProcessing();
    }
  }

  // Adjusted to only fetch a limited set of symbols to respect API rate limits
  private static async refreshQuotes(symbolsToFetch: string[]) {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      await Promise.all(
        symbolsToFetch.map(async (symbol) => {
          const normalized = this.normalizeSymbol(symbol);
          if (!normalized) return;

          if (this.quotePromises.has(normalized)) {
            return this.quotePromises.get(normalized);
          }

          const fetchPromise = (async () => {
            try {
              this.metrics.providerRequests++;
              const quote = await MarketProvider.fetchQuote(normalized);
              
              let changed = false;
              const existingCached = this.latestPriceCache.get(normalized);
              
              if (existingCached) {
                const previous = existingCached.value;
                if (
                  previous.price !== quote.price ||
                  previous.bid !== quote.bid ||
                  previous.ask !== quote.ask ||
                  previous.high !== quote.high ||
                  previous.low !== quote.low ||
                  previous.open !== quote.open
                ) {
                  this.dirtySymbols.add(normalized);
                  changed = true;
                }
              } else {
                this.dirtySymbols.add(normalized);
                changed = true;
              }
              
              this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
              this.metrics.lastSuccessfulUpdate = Date.now();
              
              if (changed) {
                const { PriceEngine } = await import('./priceEngine');
                PriceEngine.scheduleProcessing();
              }
            } catch (error: any) {
               this.metrics.providerErrors++;
               console.warn(`[MarketService] REST fetch failed for ${normalized}: ${error.message}`);
            } finally {
              this.quotePromises.delete(normalized);
            }
          })();

          this.quotePromises.set(normalized, fetchPromise);
          return fetchPromise;
        })
      );
    } finally {
      this.isRefreshing = false;
    }
  }

  private static isYahooActive = true;

  private static async pollYahooQuotes(symbolsToFetch: string[]) {
    if (!this.isYahooActive) return;
    try {
      await Promise.all(
        symbolsToFetch.map(async (symbol) => {
          const normalized = this.normalizeSymbol(symbol);
          if (!normalized) return;

          try {
            this.metrics.providerRequests++;
            const quote = await MarketProvider.fetchYahooQuote(normalized);
            
            let changed = false;
            const existingCached = this.latestPriceCache.get(normalized);
            
            if (existingCached) {
              const previous = existingCached.value;
              if (
                previous.price !== quote.price ||
                previous.bid !== quote.bid ||
                previous.ask !== quote.ask ||
                previous.high !== quote.high ||
                previous.low !== quote.low ||
                previous.open !== quote.open
              ) {
                this.dirtySymbols.add(normalized);
                changed = true;
              }
            } else {
              this.dirtySymbols.add(normalized);
              changed = true;
            }

            if (changed) {
              const spreadPips = MarketProvider.getSpread(normalized);
              const digits = MarketProvider.getDigits(normalized);
              const pipSize = digits === 2 || digits === 3 ? 0.01 : 0.0001;
              const spreadValue = spreadPips * pipSize;

              quote.bid = Number(quote.price.toFixed(6));
              quote.ask = Number((quote.price + spreadValue).toFixed(6));
              quote.spread = spreadPips;
            }
            
            this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
            this.metrics.lastSuccessfulUpdate = Date.now();
            
            if (changed) {
              const { PriceEngine } = await import('./priceEngine');
              PriceEngine.scheduleProcessing();
            }
          } catch (error: any) {
             this.metrics.providerErrors++;
             console.warn(`[MarketService] Yahoo fetch failed for ${normalized}: ${error.message}`);
          }
        })
      );
    } catch (err) {
      console.error('[MarketService] pollYahooQuotes error:', err);
    }
  }

  private static normalizeSymbol(symbol: string): string {
    return SymbolMapper.normalizeSymbol(symbol);
  }

  static async getWatchSymbols() {
    const { SymbolModel } = await import('../models/Symbol');
    const symbols = await SymbolModel.find({ visibleToUsers: { $ne: false } }).lean();
    const supported = SymbolMapper.getAllSymbols();
    return symbols
      .map(s => s.symbol)
      .filter(sym => supported.includes(SymbolMapper.normalizeSymbol(sym)));
  }

  static async getWatchQuotes() {
    const symbols = await this.getWatchSymbols();
    return Object.values(await this.getQuotes(symbols));
  }

  static getActiveSymbols() {
    return this.activeSymbols;
  }

  static consumeDirtyQuotes() {
    const quotes: any[] = [];
    const batch = this.dirtySymbols;
    this.dirtySymbols = new Set<string>();
    
    for (const symbol of batch) {
      const q = this.getCachedQuote(symbol);
      if (q) quotes.push(q);
    }
    return quotes;
  }

  static async getQuote(symbol: string) {
    // Attempt to fetch if not cached, respecting limits
    const cached = this.getCachedQuote(symbol);
    if (cached) return cached;
    
    // If we missed cache, try REST once
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return null;
    
    try {
      // First try Yahoo for immediate fallback
      const quote = await MarketProvider.fetchYahooQuote(normalized);
      this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
      return quote;
    } catch (e) {
      // Fallback to TwelveData REST if Yahoo fails
      try {
        const quote = await MarketProvider.fetchQuote(normalized);
        this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
        return quote;
      } catch (err2) {
        return null;
      }
    }
  }

  static getCachedQuote(symbol: string) {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return null;

    const cached = this.latestPriceCache.get(normalized);
    if (cached) {
      this.metrics.cacheHits++;
      return { ...cached.value, isStale: cached.isStale };
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  static getCachedQuotes(symbols: string[]) {
    const results: Record<string, any> = {};
    for (const symbol of symbols) {
      const quote = this.getCachedQuote(symbol);
      if (quote) {
        results[quote.symbol] = quote;
      }
    }
    return results;
  }

  static getPrice(symbol: string): number | null {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return null;
    return this.latestPriceCache.get(normalized)?.value?.price || null;
  }

  static async getQuotes(symbols: string[]) {
    const results: Record<string, any> = {};
    const uniqueSymbols = [...new Set(symbols.map((symbol) => this.normalizeSymbol(symbol)).filter(Boolean))];

    await Promise.all(
      uniqueSymbols.map(async (symbol) => {
        const quote = await this.getQuote(symbol);
        if (quote) {
          results[quote.symbol] = quote;
        }
      })
    );

    return results;
  }

  static async getHistoricalCandles(symbol: string, interval: string = 'D1') {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) {
      return [];
    }

    const cacheKey = `candles:${normalized}:${interval}`;
    const now = Date.now();
    const cached = this.candleCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (this.candlePromises.has(cacheKey)) {
      return this.candlePromises.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const candles = await MarketProvider.fetchHistoricalCandles(normalized, interval);
        this.candleCache.set(cacheKey, { value: candles, expiresAt: Date.now() + this.CANDLE_TTL_MS });
        return candles;
      } catch (error: any) {
        console.error(`[MarketService] Historical candles fetch failed for ${normalized} (${interval}): ${error.message}`);
        if (cached?.value && cached.value.length > 0) {
          console.warn(`[MarketService] Serving stale candle cache for ${normalized} (${interval})`);
          return cached.value;
        }
        return [];
      } finally {
        this.candlePromises.delete(cacheKey);
      }
    })();

    this.candlePromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  static async getSymbolsByCategory(category: string) {
    const allSymbols = MarketProvider.getAllSymbols();
    const symbols = allSymbols.filter((sym) => MarketProvider.getCategory(sym) === category);
    return Object.values(await this.getQuotes(symbols));
  }

  static async searchSymbols(query: string) {
    const queryUpper = query.toUpperCase();
    const allSymbols = MarketProvider.getAllSymbols();
    const symbols = allSymbols.filter((sym) => sym.includes(queryUpper));
    return Object.values(await this.getQuotes(symbols));
  }

  static async getMovers(params: { exchange?: string; name?: string; locale?: string }) {
    return MarketProvider.fetchMovers(params);
  }
}
