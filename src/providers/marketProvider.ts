import axios from 'axios';
import { RapidApiClient } from './rapidApiClient';
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
    if ([open, high, low, close].some((value) => !Number.isFinite(value) || value <= 0)) return false;
    if (high < low || high < open || high < close || low > open || low > close) return false;

    return true;
  }

  private static getDigitsForSymbol(symbol: string): number | null {
    // Keeping this function signature for compatibility if needed elsewhere,
    // but we will NO LONGER round prices before sending them to TradingView.
    return null;
  }

  private static mapTimeframe(timeframe: string): { interval: string; range: string; seconds: number } {
    switch (timeframe.toLowerCase()) {
      case 'm1':
      case '1m': return { interval: '1m', range: '7d', seconds: 60 };
      case 'm5':
      case '5m': return { interval: '5m', range: '1mo', seconds: 300 };
      case 'm15':
      case '15m': return { interval: '15m', range: '1mo', seconds: 900 };
      case 'm30':
      case '30m': return { interval: '30m', range: '1mo', seconds: 1800 };
      case 'h1':
      case '1h': return { interval: '60m', range: '3mo', seconds: 3600 };
      case 'h4':
      case '4h': return { interval: '60m', range: '3mo', seconds: 14400 }; // Yahoo fallback for 4h
      case 'd1':
      case '1d': return { interval: '1d', range: '1y', seconds: 86400 };
      case '1wk': return { interval: '1wk', range: '5y', seconds: 604800 };
      case '1mo': return { interval: '1mo', range: '10y', seconds: 2592000 };
      default: return { interval: '1d', range: '1y', seconds: 86400 };
    }
  }

  public static async fetchQuote(symbol: string): Promise<QuotePayload> {
    const normalized = this.normalizeSymbol(symbol);
    const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);

    const data = await this.client.get<any>(`/v8/finance/chart/${rapidApiSymbol}`, {
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
    const volume = Number(meta?.regularMarketVolume ?? quote?.volume?.slice(-1)?.[0] ?? 0);

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

    return parsedObject;
  }

  public static async fetchHistoricalCandles(symbol: string, timeframe: string = 'D1'): Promise<CandlePoint[]> {
    const startTime = Date.now();
    const normalized = this.normalizeSymbol(symbol);
    const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);
    const { interval, range, seconds } = this.mapTimeframe(timeframe);

    const apiPath = `/v8/finance/chart/${rapidApiSymbol}`;
    let candles: CandlePoint[] = [];
    let lastError: any = null;
    let providerResponseCount = 0;
    let rejectedCount = 0;

    const aggregateAndNormalize = (chartResult: any, quote: any) => {
      const digits = this.getDigitsForSymbol(normalized);
      const factor = digits !== null ? Math.pow(10, digits) : 1;
      const uniqueCandlesMap = new Map<number, CandlePoint>();

      providerResponseCount = chartResult.timestamp.length;

      chartResult.timestamp.forEach((time: number, index: number) => {
        let o = Number(quote.open?.[index]);
        let h = Number(quote.high?.[index]);
        let l = Number(quote.low?.[index]);
        let c = Number(quote.close?.[index]);
        let v = Number(quote.volume?.[index] ?? 0);

        if (!Number.isFinite(time) || time <= 0) {
          rejectedCount++;
          return;
        }
        if (!Number.isFinite(o) || !Number.isFinite(h) || !Number.isFinite(l) || !Number.isFinite(c)) {
          rejectedCount++;
          return;
        }
        if (o <= 0 || h <= 0 || l <= 0 || c <= 0) {
          rejectedCount++;
          return;
        }

        const trueHigh = Math.max(o, h, l, c);
        const trueLow = Math.min(o, h, l, c);
        h = trueHigh;
        l = trueLow;

        // Aggregate by timeframe to form true OHLC from tick data
        const timeBox = Math.floor(time / seconds) * seconds;
        const existing = uniqueCandlesMap.get(timeBox);

        if (existing) {
          existing.high = Math.max(existing.high, h);
          existing.low = Math.min(existing.low, l);
          existing.close = c;
          existing.volume = (existing.volume || 0) + v;
        } else {
          uniqueCandlesMap.set(timeBox, {
            time: timeBox,
            open: o,
            high: h,
            low: l,
            close: c,
            volume: v,
          });
        }
      });

      const aggregated = Array.from(uniqueCandlesMap.values()).sort((a, b) => a.time - b.time);
      
      // Fix flat candles (where open=high=low=close) from Yahoo Finance by carrying over previous close
      for (let i = 1; i < aggregated.length; i++) {
        const prev = aggregated[i - 1];
        const curr = aggregated[i];
        if (curr.open === curr.high && curr.open === curr.low && curr.open === curr.close) {
          curr.open = prev.close;
          curr.high = Math.max(curr.open, curr.close);
          curr.low = Math.min(curr.open, curr.close);
        }
      }

      return aggregated;
    };

    // Use TwelveData for Forex pairs (especially for 1m interval) because Yahoo Finance only provides flat tick snapshots
    const isForex = SymbolMapper.getCategory(normalized) === 'FOREX';
    if (isForex) {
      try {
        const twelveDataKey = process.env.TWELVEDATA_API_KEY;
        if (twelveDataKey) {
          // Format symbol for TwelveData (e.g., EURUSD -> EUR/USD)
          const tdSymbol = normalized.length === 6 ? `${normalized.substring(0, 3)}/${normalized.substring(3)}` : normalized;
          const tdInterval = interval === '1m' ? '1min' : interval === '5m' ? '5min' : interval === '15m' ? '15min' : interval === '30m' ? '30min' : interval === '60m' ? '1h' : '1day';
          
          const tdUrl = `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=5000&timezone=UTC&apikey=${twelveDataKey}`;
          
          const tdResponse = await axios.get(tdUrl, { timeout: 8000 });
          if (tdResponse.data && tdResponse.data.values) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            candles = tdResponse.data.values.map((v: any) => ({
              time: Math.floor(new Date(v.datetime + 'Z').getTime() / 1000),
              open: Number(v.open),
              high: Number(v.high),
              low: Number(v.low),
              close: Number(v.close),
              volume: 0
            }))
            .filter((c: CandlePoint) => c.time <= nowSeconds)
            .sort((a: CandlePoint, b: CandlePoint) => a.time - b.time);
            
            if (candles.length > 0) {
              console.log(`[MarketProvider] TwelveData successfully fetched ${candles.length} candles for ${tdSymbol} (${tdInterval})`);
              
              // Align TwelveData historical prices with Yahoo live prices to prevent chart jumps
              try {
                const liveQuote = await this.fetchQuote(normalized);
                if (liveQuote && liveQuote.price > 0) {
                  const latestClose = candles[candles.length - 1].close;
                  const offset = liveQuote.price - latestClose;
                  
                  // Only shift if the difference is relatively small (e.g. < 0.5%)
                  if (Math.abs(offset) / latestClose < 0.005) {
                    candles = candles.map(c => ({
                      ...c,
                      open: Number((c.open + offset).toFixed(5)),
                      high: Number((c.high + offset).toFixed(5)),
                      low: Number((c.low + offset).toFixed(5)),
                      close: Number((c.close + offset).toFixed(5))
                    }));
                    console.log(`[MarketProvider] Applied price alignment offset of ${offset} to ${tdSymbol}`);
                  }
                }
              } catch (err: any) {
                console.warn(`[MarketProvider] Failed to align prices for ${tdSymbol}:`, err.message);
              }

              return candles;
            }
          }
        }
      } catch (error: any) {
        console.warn(`[MarketProvider] TwelveData failed for ${normalized}: ${error.message}. Falling back to Yahoo Finance...`);
      }
    }

    try {
      const data = await this.client.get<any>(apiPath, {
        params: { interval, range },
      });

      const chartResult = data?.chart?.result?.[0];
      const quote = chartResult?.indicators?.quote?.[0];

      if (!Array.isArray(chartResult?.timestamp) || !quote) {
        throw new Error('Invalid RapidAPI candle response');
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      candles = aggregateAndNormalize(chartResult, quote).filter(c => c.time <= nowSeconds);

      if (candles.length === 0) {
        throw new Error('Received empty or invalid candles');
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`[MarketProvider] Primary provider failed for ${normalized} (${rapidApiSymbol}): ${error.message}. Attempting fallback...`);
    }

    if (candles.length === 0) {
      try {
        const fallbackUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${rapidApiSymbol}`;
        const response = await axios.get(fallbackUrl, {
          params: { interval, range },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          timeout: 8000,
        });

        const data = response.data;
        const chartResult = data?.chart?.result?.[0];
        const quote = chartResult?.indicators?.quote?.[0];

        if (Array.isArray(chartResult?.timestamp) && quote) {
          const nowSeconds = Math.floor(Date.now() / 1000);
          candles = aggregateAndNormalize(chartResult, quote).filter(c => c.time <= nowSeconds);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`[MarketProvider] Fallback provider also failed for ${normalized}: ${error.message}`);
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`[MarketProvider] Requested Symbol: ${symbol} | Mapped Symbol: ${rapidApiSymbol} | Interval: ${interval} | Provider URL: ${candles.length > 0 && !lastError ? apiPath : 'fallback'} | Normalized Count: ${candles.length} | Rejected Count: ${rejectedCount}`);

    if (candles.length === 0) {
       console.error(`[MarketProvider] Returning empty array for ${normalized}. Last error:`, lastError?.message || 'Unknown');
       return [];
    }

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
}
