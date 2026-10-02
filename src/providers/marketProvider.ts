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

    const tryFetch = async (fn: () => Promise<QuotePayload>) => {
      try {
        return await fn();
      } catch (e: any) {
        console.warn(`[MarketProvider] Fetch failed: ${e.message}, falling back to next...`);
        return null;
      }
    };

    let quote: QuotePayload | null = null;

    if (!quote && providerMap['INFOWAY']) quote = await tryFetch(() => this.fetchInfowayQuote(normalized, providerMap['INFOWAY']));
    if (!quote && (providerMap['CRYPTOAPIS'] || providerMap['CRYPTO']) && SymbolMapper.getCategory(normalized) === 'CRYPTO') quote = await tryFetch(() => this.fetchCryptoApisQuote(normalized, providerMap['CRYPTOAPIS'] || providerMap['CRYPTO']));
    if (!quote && providerMap['FINNHUB']) quote = await tryFetch(() => this.fetchFinnhubQuote(normalized, providerMap['FINNHUB']));
    if (!quote && providerMap['TWELVEDATA']) quote = await tryFetch(() => this.fetchTwelveDataQuote(normalized, providerMap['TWELVEDATA']));
    if (!quote && providerMap['BINANCE'] && SymbolMapper.getCategory(normalized) === 'CRYPTO') quote = await tryFetch(() => this.fetchBinanceQuote(normalized, providerMap['BINANCE']));

    const metalKey = providerMap['US OIL'] || providerMap['USOIL'] || providerMap['METALPRICE'];
    if (!quote && metalKey) quote = await tryFetch(() => this.fetchMetalPriceQuote(normalized, metalKey));

    if (!quote && providerMap['VANTAG']) quote = await tryFetch(() => this.fetchVantageQuote(normalized, providerMap['VANTAG']));
    if (!quote && providerMap['VANTAGE']) quote = await tryFetch(() => this.fetchVantageQuote(normalized, providerMap['VANTAGE']));
    if (!quote && providerMap['ALPHAVANTAGE']) quote = await tryFetch(() => this.fetchVantageQuote(normalized, providerMap['ALPHAVANTAGE']));

    if (!quote && providerMap['YAHOO']) quote = await tryFetch(() => this.fetchYahooQuote(normalized));

    if (quote) return quote;
    
    // If we've reached here, either NO active keys were found, OR all of them failed!
    // Try YAHOO as a last-resort universal fallback even if it's not strictly 'ACTIVE' in DB,
    // to prevent complete system crash
    try {
       console.warn(`[MarketProvider] All active providers failed for ${normalized}. Trying YAHOO as absolute fallback.`);
       return await this.fetchYahooQuote(normalized);
    } catch (e: any) {
       throw new Error('All providers failed and YAHOO fallback failed.');
    }
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
      if (providerMap['VANTAG']) return await this.fetchVantageCandles(normalized, timeframe, providerMap['VANTAG']);
      if (providerMap['VANTAGE']) return await this.fetchVantageCandles(normalized, timeframe, providerMap['VANTAGE']);
      if (providerMap['ALPHAVANTAGE']) return await this.fetchVantageCandles(normalized, timeframe, providerMap['ALPHAVANTAGE']);
      // Binance could be added here for crypto
    } catch (e: any) {
      console.warn(`[MarketProvider] Candles fetch failed: ${e.message}`);
    }

    try {
      return await this.fetchYahooCandles(normalized, timeframe);
    } catch (e: any) {
      console.warn(`[MarketProvider] Yahoo fallback candles fetch failed: ${e.message}`);
    }
    
    return [];
  }

  private static mapTimeframeToYahoo(timeframe: string): '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo' {
    switch (timeframe.toLowerCase()) {
      case 'm1': case '1m': return '1m';
      case 'm5': case '5m': return '5m';
      case 'm15': case '15m': return '15m';
      case 'm30': case '30m': return '30m';
      case 'h1': case '1h': return '1h'; // or '60m'
      case 'd1': case '1d': return '1d';
      case '1wk': case 'w1': return '1wk';
      case '1mo': case 'mo1': return '1mo';
      default: return '1d';
    }
  }

  public static async fetchYahooCandles(symbol: string, timeframe: string): Promise<CandlePoint[]> {
    const normalized = this.normalizeSymbol(symbol);
    const yfSymbol = this.getYahooSymbol(normalized);
    
    if (!this.yahooFinanceInstance) {
      const yahooFinanceLib = (await import('yahoo-finance2')).default;
      this.yahooFinanceInstance = new (yahooFinanceLib as any)({ suppressNotices: ['yahooSurvey'] });
    }
    
    const interval = this.mapTimeframeToYahoo(timeframe);
    
    const now = new Date();
    const past = new Date();
    if (interval === '1m') {
      past.setDate(now.getDate() - 5);
    } else if (interval.endsWith('m') || interval === '1h') {
      past.setDate(now.getDate() - 30);
    } else {
      past.setFullYear(now.getFullYear() - 1);
    }

    try {
      const results = await this.yahooFinanceInstance.chart(yfSymbol, {
        period1: past,
        interval: interval
      });
      
      if (!results || !results.quotes) return [];

      return results.quotes
        .filter((v: any) => v.close !== null && v.close !== undefined)
        .map((v: any) => ({
          time: Math.floor(new Date(v.date).getTime() / 1000),
          open: v.open ?? v.close,
          high: v.high ?? v.close,
          low: v.low ?? v.close,
          close: v.close,
          volume: v.volume || 0
        }));
    } catch (e: any) {
      throw new Error(`Yahoo Finance chart error for ${symbol}: ${e.message}`);
    }
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
      case 'm5': case '5m': return 2;
      case 'm15': case '15m': return 3;
      case 'm30': case '30m': return 4;
      case 'h1': case '1h': return 5;
      case 'h4': case '4h': return 5; // fallback to 1h if 4h is not supported natively or needs another id
      case 'd1': case '1d': return 6;
      case 'w1': case '1wk': case '1w': return 7;
      case 'mo1': case '1mo': return 8;
      default: return 6; // default to daily
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

  public static async fetchVantageQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const category = SymbolMapper.getCategory(normalized);
    let url = '';
    let isExchange = false;

    if (category === 'FOREX') {
      const from = normalized.substring(0, 3);
      const to = normalized.substring(3);
      url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${apiKey}`;
      isExchange = true;
    } else if (category === 'CRYPTO') {
      const from = normalized.replace('USD', '');
      url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=USD&apikey=${apiKey}`;
      isExchange = true;
    } else if (category === 'METALS') {
      // AlphaVantage GLOBAL_QUOTE for XAUUSD returns a random mutual fund priced at 4200+
      // throwing off the charts. We must block metals and let it fall back to Finnhub/Yahoo.
      throw new Error(`AlphaVantage does not support spot metals like ${normalized}`);
    } else {
      url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${normalized}&apikey=${apiKey}`;
    }

    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    if (data['Error Message'] || data['Note'] || data['Information']) {
      throw new Error(`AlphaVantage API Error: ${data['Error Message'] || data['Note'] || data['Information']}`);
    }

    if (isExchange) {
      const rate = data['Realtime Currency Exchange Rate'];
      if (!rate) throw new Error(`Invalid AlphaVantage response for ${normalized}`);
      
      const price = Number(rate['5. Exchange Rate']);
      return {
        symbol: normalized,
        price: price,
        bid: Number(rate['8. Bid Price']) || price,
        ask: Number(rate['9. Ask Price']) || price,
        spread: 0,
        high: price,
        low: price,
        open: price,
        previousClose: price,
        change: 0,
        changePercent: 0,
        category: category,
        marketStatus: 'OPEN',
        volume: 0,
        timestamp: Date.now()
      };
    } else {
      const quote = data['Global Quote'];
      if (!quote || !quote['05. price']) throw new Error(`Invalid AlphaVantage response for ${normalized}`);
      
      const price = Number(quote['05. price']);
      return {
        symbol: normalized,
        price: price,
        bid: price,
        ask: price,
        spread: 0,
        high: Number(quote['03. high']),
        low: Number(quote['04. low']),
        open: Number(quote['02. open']),
        previousClose: Number(quote['08. previous close']),
        change: Number(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent']) || 0,
        category: category,
        marketStatus: 'OPEN',
        volume: Number(quote['06. volume']) || 0,
        timestamp: Date.now()
      };
    }
  }

  public static async fetchVantageCandles(symbol: string, timeframe: string, apiKey: string): Promise<CandlePoint[]> {
    // Due to AlphaVantage's strict 25 requests/day free limit and complex Intraday endpoints for different categories,
    // we fallback to Yahoo for candles to save AlphaVantage limits purely for real-time quoting if possible.
    // However, if we MUST implement it, it goes here.
    return this.fetchYahooCandles(symbol, timeframe);
  }

  public static async fetchMetalPriceQuote(symbol: string, apiKey: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    let base = 'USD';
    let currency = normalized;
    
    if (normalized.endsWith('USD')) {
       currency = normalized.replace('USD', '');
    } else if (normalized === 'USOIL') {
       currency = 'WTI';
    } else if (normalized === 'UKOIL') {
       currency = 'BRENT';
    }

    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=${base}&currencies=${currency},USOIL`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    if (!data.success) {
      throw new Error(`MetalPriceAPI Error: ${data.error?.message || data.error?.info || data.error?.type || 'Unknown error'}`);
    }

    let rate = data.rates[currency];
    if (!rate && currency === 'WTI') rate = data.rates['USOIL'];
    if (!rate && currency === 'BRENT') rate = data.rates['BRENT'];
    if (!rate) throw new Error(`Invalid MetalPriceAPI response for ${normalized}`);

    // MetalPriceAPI returns rate as 1 Base = X Currency (e.g. 1 USD = 0.0005 XAU)
    // To get price of 1 Currency in USD, we do 1 / rate
    const price = 1 / Number(rate);

    return {
      symbol: normalized,
      price: price,
      bid: price,
      ask: price,
      spread: 0,
      high: price,
      low: price,
      open: price,
      previousClose: price,
      change: 0,
      changePercent: 0,
      category: SymbolMapper.getCategory(normalized),
      marketStatus: 'OPEN',
      volume: 0,
      timestamp: data.timestamp ? data.timestamp * 1000 : Date.now()
    };
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
