import { RapidApiClient } from './rapidApiClient';
import { SymbolMapper } from './symbolMapper';

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
  private static readonly client = RapidApiClient.getInstance();

  private static normalizeSymbol(symbol: string): string {
    return SymbolMapper.normalizeSymbol(symbol);
  }

  private static isValidCandle(candle: any): candle is CandlePoint {
    const time = Number(candle?.time);
    const open = Number(candle?.open);
    const high = Number(candle?.high);
    const low = Number(candle?.low);
    const close = Number(candle?.close);

    if (!Number.isFinite(time) || time <= 0) return false;
    if ([open, high, low, close].some((value) => !Number.isFinite(value) || value === null || value === undefined)) return false;
    if (high < low || high < open || high < close || low > open || low > close) return false;

    return true;
  }

  private static mapTimeframe(timeframe: string): { interval: string; range: string } {
    switch (timeframe.toLowerCase()) {
      case 'm1':
      case '1m': return { interval: '1m', range: '7d' };
      case 'm5':
      case '5m': return { interval: '5m', range: '1mo' };
      case 'm15':
      case '15m': return { interval: '15m', range: '1mo' };
      case 'm30':
      case '30m': return { interval: '30m', range: '1mo' };
      case 'h1':
      case '1h': return { interval: '60m', range: '3mo' };
      case 'h4':
      case '4h': return { interval: '60m', range: '3mo' }; // Yahoo fallback for 4h
      case 'd1':
      case '1d': return { interval: '1d', range: '1y' };
      case '1wk': return { interval: '1wk', range: '5y' };
      case '1mo': return { interval: '1mo', range: '10y' };
      default: return { interval: '1d', range: '1y' };
    }
  }

  public static async fetchQuote(symbol: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);

    const data = await this.client.get<any>(`/v8/finance/chart/${encodeURIComponent(rapidApiSymbol)}`, {
      params: { interval: '1m', range: '1d' },
    });

    const chartResult = data?.chart?.result?.[0];
    const meta = chartResult?.meta;
    const quote = chartResult?.indicators?.quote?.[0];
    const price = Number(meta?.regularMarketPrice ?? quote?.close?.slice(-1)?.[0]);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error('Invalid RapidAPI quote response');
    }

    const previousClose = Number(meta?.chartPreviousClose ?? price);
    const bid = Number(meta?.regularMarketBid ?? price);
    const ask = Number(meta?.regularMarketAsk ?? price);
    const spread = Math.max(ask - bid, 0);
    const high = Number(meta?.regularMarketDayHigh ?? quote?.high?.slice(-1)?.[0] ?? price);
    const low = Number(meta?.regularMarketDayLow ?? quote?.low?.slice(-1)?.[0] ?? price);
    const open = Number(meta?.regularMarketOpen ?? quote?.open?.slice(-1)?.[0] ?? price);
    const volume = Number(quote?.volume?.slice(-1)?.[0] ?? 0);

    const parsedObject = {
      symbol: normalized,
      price,
      bid,
      ask,
      spread,
      high,
      low,
      open,
      previousClose,
      change: price - previousClose,
      changePercent: previousClose ? ((price - previousClose) / previousClose) * 100 : 0,
      category: SymbolMapper.getCategory(normalized),
      marketStatus: meta?.exchangeTimezoneName ? 'OPEN' : 'UNKNOWN',
      volume: Number.isFinite(volume) ? volume : 0,
      timestamp: Date.now(),
    };

    if (normalized === 'XAUUSD' || normalized === 'XAGUSD') {
      console.log(`\n====================================================`);
      console.log(`--- RAW JSON FROM YAHOO FINANCE (${rapidApiSymbol}) ---`);
      console.log(JSON.stringify(meta, null, 2));
      console.log(`\n--- PARSED OBJECT (${normalized}) ---`);
      console.log(JSON.stringify(parsedObject, null, 2));
      console.log(`====================================================\n`);
    }

    return parsedObject;
  }

  public static async fetchHistoricalCandles(symbol: string, timeframe: string = 'D1'): Promise<CandlePoint[]> {
    const normalized = this.normalizeSymbol(symbol);
    const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);
    const { interval, range } = this.mapTimeframe(timeframe);

    const data = await this.client.get<any>(`/v8/finance/chart/${encodeURIComponent(rapidApiSymbol)}`, {
      params: { interval, range },
    });

    const chartResult = data?.chart?.result?.[0];
    const quote = chartResult?.indicators?.quote?.[0];

    if (!Array.isArray(chartResult?.timestamp) || !quote) {
      throw new Error('Invalid RapidAPI candle response');
    }

    const candles = chartResult.timestamp
      .map((time: number, index: number) => ({
        time,
        open: Number(quote.open?.[index]),
        high: Number(quote.high?.[index]),
        low: Number(quote.low?.[index]),
        close: Number(quote.close?.[index]),
        volume: Number(quote.volume?.[index] ?? 0),
      }))
      .filter((candle: CandlePoint | any): candle is CandlePoint => this.isValidCandle(candle))
      .sort((a: CandlePoint, b: CandlePoint) => a.time - b.time);

    if (candles.length === 0) {
      throw new Error('Received empty or invalid candles');
    }

    return candles;
  }

  public static getCategory(symbol: string): string {
    return SymbolMapper.getCategory(symbol);
  }

  public static getAllSymbols(): string[] {
    return SymbolMapper.getAllSymbols();
  }
}
