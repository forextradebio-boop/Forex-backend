import axios from 'axios';
import { SymbolMapper } from './symbolMapper';
import { SymbolSpecification } from '../engine/SymbolSpecification';

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
      'ETHUSD': 'ETH/USD'
    };
    
    if (map[normalized]) return map[normalized];
    
    // Auto-format Forex pairs
    if (normalized.length === 6 && SymbolMapper.getCategory(normalized) === 'FOREX') {
      return `${normalized.substring(0, 3)}/${normalized.substring(3)}`;
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

  public static async fetchYahooQuote(symbol: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const yfSymbol = this.getYahooSymbol(normalized);
    const host = process.env.RAPID_API_HOST || 'query1.finance.yahoo.com';
    const url = `https://${host}/v7/finance/quote?symbols=${yfSymbol}`;
    
    const response = await axios.get(url, { timeout: 8000 });
    const payload = response.data?.quoteResponse?.result?.[0];
    
    if (!payload) {
      throw new Error(`Invalid Yahoo response for ${symbol}`);
    }

    const price = Number(payload.regularMarketPrice);
    const previousClose = Number(payload.regularMarketPreviousClose);
    
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
  }

  public static async fetchQuote(symbol: string): Promise<QuotePayload> {
    const apiKey = process.env.TWELVEDATA_API_KEY || '19dea2e7729b4d81ad2271d8048ddc8e';
    if (!apiKey) throw new Error('TWELVEDATA_API_KEY is not defined');

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
    
    const parsedObject: QuotePayload = {
      symbol: normalized,
      price: price,
      bid: price, // Approximate if not provided
      ask: price, // Approximate if not provided
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

    return parsedObject;
  }

  public static async fetchHistoricalCandles(symbol: string, timeframe: string = 'D1'): Promise<CandlePoint[]> {
    const apiKey = process.env.TWELVEDATA_API_KEY || '19dea2e7729b4d81ad2271d8048ddc8e';
    if (!apiKey) throw new Error('TWELVEDATA_API_KEY is not defined');

    const normalized = this.normalizeSymbol(symbol);
    const tdSymbol = this.getTwelveDataSymbol(normalized);
    const tdInterval = this.mapTimeframeToTwelveData(timeframe);

    const url = `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=500&timezone=UTC&apikey=${apiKey}`;
    
    try {
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (data.code && data.status === 'error') {
        throw new Error(`TwelveData API error: ${data.message}`);
      }

      if (!data.values || !Array.isArray(data.values)) {
        console.warn(`[MarketProvider] No historical data returned for ${tdSymbol} (${tdInterval})`);
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
    } catch (error: any) {
      console.error(`[MarketProvider] fetchHistoricalCandles failed for ${tdSymbol}: ${error.message}`);
      return [];
    }
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
