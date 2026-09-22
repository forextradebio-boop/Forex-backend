import axios from 'axios';
import { SymbolMapper } from './symbolMapper';
import { SymbolSpecification } from '../engine/SymbolSpecification';
import { ApiKeyModel } from '../models/ApiKey';

interface CandlePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface QuotePayload {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  change: number;
  changePercent: number;
  category: string;
  marketStatus: string;
  volume?: number;
  timestamp: number;
}

export class MarketProvider {
  private static normalizeSymbol(symbol: string): string {
    return SymbolMapper.normalizeSymbol(symbol);
  }

  // Convert normal symbol to TwelveData format, e.g. EURUSD -> EUR/USD, USOIL -> WTI
  public static getTwelveDataSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    
    // Explicit mapping for known symbols
    const map: Record<string, string> = {
      'USOIL': 'WTI',
      'UKOIL': 'BRENT',
      'XAUUSD': 'XAU/USD',
      'XAGUSD': 'XAG/USD',
      'BTCUSD': 'BTC/USD',
      'ETHUSD': 'ETH/USD',
      'LTCUSD': 'LTC/USD',
      'XRPUSD': 'XRP/USD',
      'DOGEUSD': 'DOGE/USD',
      'BCHUSD': 'BCH/USD'
    };
    
    if (map[normalized]) return map[normalized];
    
    // Auto-format Forex pairs
    if (normalized.length === 6 && SymbolMapper.getCategory(normalized) === 'FOREX') {
      return `${normalized.substring(0, 3)}/${normalized.substring(3)}`;
    }
    
    return normalized;
  }

  public static getFinnhubSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    const category = SymbolMapper.getCategory(normalized);
    if (category === 'FOREX') return `OANDA:${normalized.substring(0,3)}_${normalized.substring(3)}`;
    if (category === 'CRYPTO') return `BINANCE:${normalized.replace('USD', 'USDT')}`;
    return normalized;
  }

  public static getBinanceSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    if (SymbolMapper.getCategory(normalized) === 'CRYPTO') {
      return normalized.replace('USD', 'USDT');
    }
    return normalized;
  }

  private static mapTimeframeToTwelveData(timeframe: string): string {
    switch (timeframe.toLowerCase()) {
      case 'm1':
      case '1m': return '1min';
      case 'm5':
      case '5m': return '5min';
      case 'm15':
      case '15m': return '15min';
      case 'm30':
      case '30m': return '30min';
      case 'h1':
      case '1h': return '1h';
      case 'h2':
      case '2h': return '2h';
      case 'h4':
      case '4h': return '4h';
      case 'd1':
      case '1d': return '1day';
      case '1wk': return '1week';
      case '1mo': return '1month';
      default: return '1day';
    }
  }

  public static getYahooSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    
    // Crypto
    if (normalized.endsWith('USD') && (normalized.startsWith('BTC') || normalized.startsWith('ETH') || normalized.startsWith('LTC') || normalized.startsWith('BCH') || normalized.startsWith('XRP') || normalized.startsWith('DOGE'))) {
      return `${normalized.replace('USD', '')}-USD`;
    }
    
    // Indices & Commodities
    const map: Record<string, string> = {
      'US30': '^DJI',
      'NAS100': '^IXIC',
      'SPX500': '^GSPC',
      'UK100': '^FTSE',
      'GER40': '^GDAXI',
      'USOIL': 'CL=F',
      'UKOIL': 'BZ=F',
      'NGAS': 'NG=F',
      'XAUUSD': 'GC=F',
      'XAGUSD': 'SI=F',
    };
    
    if (map[normalized]) return map[normalized];
    
    // Forex
    if (normalized.length === 6 && SymbolMapper.getCategory(normalized) === 'FOREX') {
      return `${normalized}=X`;
    }
    
    return normalized;
  }

  private static yahooFinanceInstance: any = null;

  public static async fetchYahooQuote(symbol: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const yfSymbol = this.getYahooSymbol(normalized);
    
    if (!this.yahooFinanceInstance) {
      const yahooFinanceLib = (await import('yahoo-finance2')).default;
      this.yahooFinanceInstance = new (yahooFinanceLib as any)({ suppressNotices: ['yahooSurvey'] });
    }
    
    try {
      const payload = await this.yahooFinanceInstance.quote(yfSymbol);
      
      if (!payload) {
        throw new Error(`Invalid Yahoo response for ${symbol}`);
      }

      const price = Number(payload.regularMarketPrice);
      const previousClose = Number(payload.regularMarketPreviousClose || price);
      
      return {
        symbol: normalized,
        price: price,
        bid: Number(payload.bid || price),
        ask: Number(payload.ask || price),
        spread: 0,
        high: Number(payload.regularMarketDayHigh || price),
        low: Number(payload.regularMarketDayLow || price),
        open: Number(payload.regularMarketOpen || price),
        previousClose: previousClose,
        change: Number(payload.regularMarketChange || 0),
        changePercent: Number(payload.regularMarketChangePercent || 0),
        category: SymbolMapper.getCategory(normalized),
        marketStatus: payload.marketState === 'REGULAR' ? 'OPEN' : 'CLOSED',
        volume: Number(payload.regularMarketVolume || 0),
        timestamp: Date.now(),
      };
    } catch (e: any) {
      throw new Error(`Yahoo Finance error for ${symbol}: ${e.message}`);
    }
  }



  public static async fetchFinnhubQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const fhSymbol = this.getFinnhubSymbol(normalized);

    const url = `https://finnhub.io/api/v1/quote?symbol=${fhSymbol}&token=${apiKey}`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    if (data.c === 0 && data.h === 0 && data.l === 0) {
      throw new Error(`Invalid Finnhub quote response for ${fhSymbol}`);
    }

    const price = Number(data.c);
    
    return {
      symbol: normalized,
      price: price,
      bid: price,
      ask: price,
      spread: 0,
      high: Number(data.h),
      low: Number(data.l),
      open: Number(data.o),
      previousClose: Number(data.pc),
      change: Number(data.d),
      changePercent: Number(data.dp),
      category: SymbolMapper.getCategory(normalized),
      marketStatus: 'OPEN',
      volume: 0,
      timestamp: Number(data.t) * 1000 || Date.now(),
    };
  }

  public static async fetchBinanceQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const binanceSymbol = this.getBinanceSymbol(normalized);

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    const price = Number(data.lastPrice);
    
    return {
      symbol: normalized,
      price: price,
      bid: Number(data.bidPrice) || price,
      ask: Number(data.askPrice) || price,
      spread: 0,
      high: Number(data.highPrice),
      low: Number(data.lowPrice),
      open: Number(data.openPrice),
      previousClose: Number(data.prevClosePrice),
      change: Number(data.priceChange),
      changePercent: Number(data.priceChangePercent),
      category: SymbolMapper.getCategory(normalized),
      marketStatus: 'OPEN',
      volume: Number(data.volume),
      timestamp: Number(data.closeTime) || Date.now(),
    };
  }

  public static getCryptoApisSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    if (SymbolMapper.getCategory(normalized) === 'CRYPTO') {
      return normalized.replace('USD', '');
    }
    return normalized;
  }

  public static async fetchCryptoApisQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const apiSymbol = this.getCryptoApisSymbol(normalized);

    const url = `https://api.freecryptoapi.com/v1/getData?symbol=${apiSymbol}&token=${apiKey}`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    if (data.status === false || !data.symbols || data.symbols.length === 0) {
      throw new Error(`Invalid CryptoApis quote response for ${apiSymbol}`);
    }

    const item = data.symbols[0];
    const price = Number(item.last);
    
    // We derive open from daily_change_percentage
    const changePercent = Number(item.daily_change_percentage);
    const open = price / (1 + (changePercent / 100));
    
    return {
      symbol: normalized,
      price: price,
      bid: price,
      ask: price,
      spread: 0,
      high: Number(item.highest),
      low: Number(item.lowest),
      open: open,
      previousClose: open,
      change: price - open,
      changePercent: changePercent,
      category: SymbolMapper.getCategory(normalized),
      marketStatus: 'OPEN',
      volume: 0, // Not provided directly in the same field
      timestamp: new Date(item.date).getTime() || Date.now(),
    };
  }

  public static async fetchInfowayQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    
    const url = `https://data.infoway.io/common/v2/batch_kline`;
    const response = await axios.post(url, {
      codes: normalized,
      klineType: 1,
      klineNum: 1
    }, {
      headers: { 'apiKey': apiKey },
      timeout: 8000
    });
    
    const data = response.data;
    if (data.ret !== 200 || !data.data || data.data.length === 0 || !data.data[0].respList || data.data[0].respList.length === 0) {
      throw new Error(`Invalid Infoway quote response for ${normalized}`);
    }

    const item = data.data[0].respList[0];
    const price = Number(item.c);
    const open = Number(item.o);
    const high = Number(item.h);
    const low = Number(item.l);
    
    return {
      symbol: normalized,
      price: price,
      bid: price,
      ask: price,
      spread: 0,
      high: high,
      low: low,
      open: open,
      previousClose: open,
      change: Number(item.pca) || (price - open),
      changePercent: parseFloat(item.pc) || 0,
      category: SymbolMapper.getCategory(normalized),
      marketStatus: 'OPEN',
      volume: Number(item.v) || 0,
      timestamp: Number(item.t) * 1000 || Date.now(),
    };
  }

  public static async fetchQuote(symbol: string): Promise<QuotePayload> {
    const activeKeys = await ApiKeyModel.find({ status: 'ACTIVE' });
    const providerMap = activeKeys.reduce((acc: Record<string, string>, key) => {
      acc[key.provider] = key.keyValue;
      return acc;
    }, {});

    const normalized = this.normalizeSymbol(symbol);

    try {
      if (providerMap['INFOWAY']) return await this.fetchInfowayQuote(normalized, providerMap['INFOWAY']);
      if (providerMap['CRYPTOAPIS'] && SymbolMapper.getCategory(normalized) === 'CRYPTO') return await this.fetchCryptoApisQuote(normalized, providerMap['CRYPTOAPIS']);
      if (providerMap['FINNHUB']) return await this.fetchFinnhubQuote(normalized, providerMap['FINNHUB']);
      if (providerMap['TWELVEDATA']) return await this.fetchTwelveDataQuote(normalized, providerMap['TWELVEDATA']);
      if (providerMap['BINANCE'] && SymbolMapper.getCategory(normalized) === 'CRYPTO') return await this.fetchBinanceQuote(normalized, providerMap['BINANCE']);
      if (providerMap['YAHOO']) return await this.fetchYahooQuote(normalized);
    } catch (e: any) {
      console.warn(`[MarketProvider] Primary fetch failed: ${e.message}, falling back...`);
    }
    
    if (providerMap['YAHOO']) {
      try {
        return await this.fetchYahooQuote(normalized);
      } catch (e: any) {
        throw new Error(`[MarketProvider] All fetch attempts failed including YAHOO fallback.`);
      }
    }
    
    throw new Error('No active API keys found for fetching quotes.');
  }

  public static async fetchTwelveDataQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const tdSymbol = this.getTwelveDataSymbol(normalized);

    const url = `https://api.twelvedata.com/quote?symbol=${tdSymbol}&apikey=${apiKey}`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    if (data.code && data.status === 'error') {
      throw new Error(`TwelveData API error: ${data.message}`);
    }

    if (!data.open || !data.close) {
      throw new Error(`Invalid TwelveData quote response for ${tdSymbol}`);
    }

    const price = Number(data.close);
    const previousClose = Number(data.previous_close);
    
    return {
      symbol: normalized,
      price: price,
      bid: price,
      ask: price,
      spread: 0,
      high: Number(data.high),
      low: Number(data.low),
      open: Number(data.open),
      previousClose: previousClose,
      change: Number(data.change),
      changePercent: Number(data.percent_change),
      category: SymbolMapper.getCategory(normalized),
      marketStatus: data.is_market_open ? 'OPEN' : 'CLOSED',
      volume: Number(data.volume) || 0,
      timestamp: Number(data.timestamp) * 1000 || Date.now(),
    };
  }

  public static async fetchHistoricalCandles(symbol: string, timeframe: string = 'D1'): Promise<CandlePoint[]> {
    const activeKeys = await ApiKeyModel.find({ status: 'ACTIVE' });
    const providerMap = activeKeys.reduce((acc: Record<string, string>, key) => {
      acc[key.provider] = key.keyValue;
      return acc;
    }, {});

    const normalized = this.normalizeSymbol(symbol);

    try {
      if (providerMap['INFOWAY']) return await this.fetchInfowayCandles(normalized, timeframe, providerMap['INFOWAY']);
      if (providerMap['FINNHUB']) return await this.fetchFinnhubCandles(normalized, timeframe, providerMap['FINNHUB']);
      if (providerMap['TWELVEDATA']) return await this.fetchTwelveDataCandles(normalized, timeframe, providerMap['TWELVEDATA']);
      // Binance could be added here for crypto
    } catch (e: any) {
      console.warn(`[MarketProvider] Candles fetch failed: ${e.message}`);
    }
    
    return [];
  }

  private static mapTimeframeToFinnhub(timeframe: string): string {
    switch (timeframe.toLowerCase()) {
      case 'm1': case '1m': return '1';
      case 'm5': case '5m': return '5';
      case 'm15': case '15m': return '15';
      case 'm30': case '30m': return '30';
      case 'h1': case '1h': return '60';
      case 'd1': case '1d': return 'D';
      case '1wk': return 'W';
      case '1mo': return 'M';
      default: return 'D';
    }
  }

  private static mapTimeframeToInfoway(timeframe: string): number {
    switch (timeframe.toLowerCase()) {
      case 'm1': case '1m': return 1;
      case 'm5': case '5m': return 5;
      case 'm15': case '15m': return 15;
      case 'm30': case '30m': return 30;
      case 'h1': case '1h': return 60;
      case 'd1': case '1d': return 6; // Or specific daily code, fallback to 6
      default: return 60;
    }
  }

  public static async fetchInfowayCandles(symbol: string, timeframe: string, apiKey: string): Promise<CandlePoint[]> {
    const normalized = this.normalizeSymbol(symbol);
    const klineType = this.mapTimeframeToInfoway(timeframe);
    const klineNum = 500; // fetch 500 candles

    const url = `https://data.infoway.io/common/v2/batch_kline`;
    const response = await axios.post(url, {
      codes: normalized,
      klineType: klineType,
      klineNum: klineNum
    }, {
      headers: { 'apiKey': apiKey },
      timeout: 10000
    });
    
    const data = response.data;
    if (data.ret !== 200 || !data.data || data.data.length === 0 || !data.data[0].respList) {
      return [];
    }

    const respList = data.data[0].respList;
    const candles: CandlePoint[] = [];

    for (let i = 0; i < respList.length; i++) {
      const item = respList[i];
      candles.push({
        time: Number(item.t),
        open: Number(item.o),
        high: Number(item.h),
        low: Number(item.l),
        close: Number(item.c),
        volume: Number(item.v) || 0
      });
    }

    // Sort chronologically ascending
    return candles.sort((a, b) => a.time - b.time);
  }

  public static async fetchFinnhubCandles(symbol: string, timeframe: string, apiKey: string): Promise<CandlePoint[]> {
    const normalized = this.normalizeSymbol(symbol);
    const fhSymbol = this.getFinnhubSymbol(normalized);
    const fhResolution = this.mapTimeframeToFinnhub(timeframe);
    
    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 24 * 60 * 60); // 30 days back

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${fhSymbol}&resolution=${fhResolution}&from=${from}&to=${to}&token=${apiKey}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (data.s !== 'ok') {
      throw new Error(`Finnhub candle error: ${data.s}`);
    }

    const candles: CandlePoint[] = [];
    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        time: data.t[i],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i]
      });
    }
    return candles;
  }

  public static async fetchTwelveDataCandles(symbol: string, timeframe: string, apiKey: string): Promise<CandlePoint[]> {
    const normalized = this.normalizeSymbol(symbol);
    const tdSymbol = this.getTwelveDataSymbol(normalized);
    const tdInterval = this.mapTimeframeToTwelveData(timeframe);

    const url = `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=500&timezone=UTC&apikey=${apiKey}`;
    
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (data.code && data.status === 'error') {
      throw new Error(`TwelveData API error: ${data.message}`);
    }

    if (!data.values || !Array.isArray(data.values)) {
      return [];
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const candles = data.values.map((v: any) => ({
      time: Math.floor(new Date(v.datetime + 'Z').getTime() / 1000),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume) || 0
    }))
    .filter((c: CandlePoint) => c.time <= nowSeconds)
    .sort((a: CandlePoint, b: CandlePoint) => a.time - b.time);

    return candles;
  }

  public static async fetchMovers(params: { exchange?: string; name?: string; locale?: string }) {
    const exchange = params.exchange || 'US';
    const name = params.name || 'volume_gainers';
    const locale = params.locale || 'en';
    const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY;

    if (!rapidApiKey) {
      throw new Error('RapidAPI Key is not configured in .env');
    }

    const response = await axios.get('https://trading-view.p.rapidapi.com/market/get-movers', {
      params: { exchange, name, locale },
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-host': 'trading-view.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
      },
      timeout: 10000,
    });

    const payload = response.data;
    const symbols = Array.isArray(payload?.symbols) ? payload.symbols : [];

    return {
      totalCount: Number(payload?.totalCount ?? symbols.length),
      fields: Array.isArray(payload?.fields) ? payload.fields : [],
      symbols: symbols.map((item: any) => ({
        s: item?.s,
        f: Array.isArray(item?.f) ? item.f : [],
      })),
      time: payload?.time,
    };
  }

  public static getCategory(symbol: string): string {
    return SymbolMapper.getCategory(symbol);
  }

  public static getAllSymbols(): string[] {
    return SymbolMapper.getAllSymbols();
  }

  public static getSpread(symbol: string): number {
    const spec = SymbolSpecification.getSync(this.normalizeSymbol(symbol));
    return spec.spread !== undefined ? spec.spread : 1;
  }

  public static getDigits(symbol: string): number {
    const spec = SymbolSpecification.getSync(this.normalizeSymbol(symbol));
    return spec.digits !== undefined ? spec.digits : 5;
  }
}
