import { MarketProvider } from '../providers/marketProvider';
import { SymbolMapper } from '../providers/symbolMapper';
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
  // Limit to free plan test symbols to avoid bans
  private static readonly WS_SYMBOLS = ['EUR/USD', 'BTC/USD', 'ETH/USD'];

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

    // Initial load
    this.activeSymbols = await this.getWatchSymbols();
    this.metrics.activeSymbols = this.activeSymbols.length;
    
    // Initial fetch for the test WS symbols ONLY to populate the cache (respecting 8 req/min limit)
    await this.refreshQuotes(this.WS_SYMBOLS.map(s => s.replace('/', '')));

    // Start fast polling for non-WS symbols using Yahoo Finance
    setInterval(async () => {
      try {
        if (this.activeSymbols.length === 0) return;
        
        const nonWsSymbols = this.activeSymbols.filter(
          sym => !this.WS_SYMBOLS.includes(sym) && !this.WS_SYMBOLS.includes(sym.replace('/', ''))
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

    const symbolRefreshMs = Number(process.env.SYMBOL_REFRESH_MS) || 60000; // Slower refresh
    setInterval(async () => {
      try {
        this.activeSymbols = await this.getWatchSymbols();
        this.metrics.activeSymbols = this.activeSymbols.length;
      } catch (err) {
        console.error('[MarketService] Symbol refresh error:', err);
      }
    }, symbolRefreshMs);
  }
  
  private static connectWebSocket() {
    const apiKey = process.env.TWELVEDATA_API_KEY || '19dea2e7729b4d81ad2271d8048ddc8e';
    if (!apiKey) {
      console.warn('[MarketService] TWELVEDATA_API_KEY missing, skipping WebSocket connection');
      return;
    }

    const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('[MarketService] TwelveData WebSocket connected');
      const subscribeMsg = {
        action: 'subscribe',
        params: {
          symbols: this.WS_SYMBOLS.join(',')
        }
      };
      this.ws?.send(JSON.stringify(subscribeMsg));
    });

    this.ws.on('message', async (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.event === 'price') {
          await this.handleTick(message);
        } else if (message.event === 'subscribe-status') {
          console.log('[MarketService] WS Subscribe Status:', message);
        }
      } catch (err) {
        console.error('[MarketService] WS message error:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('[MarketService] TwelveData WebSocket closed. Reconnecting in 5s...');
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', (err) => {
      console.error('[MarketService] TwelveData WebSocket error:', err);
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

  private static async pollYahooQuotes(symbolsToFetch: string[]) {
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
