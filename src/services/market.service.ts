import { MarketProvider } from '../providers/marketProvider';
import { SymbolMapper } from '../providers/symbolMapper';

export class MarketService {
  private static readonly WATCHLIST = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
    'EURJPY', 'EURGBP', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD',
  ];
  private static readonly PRICE_TTL_MS = 250;
  private static readonly CANDLE_TTL_MS = 60000;
  private static readonly priceCache = new Map<string, { value: any; expiresAt: number }>();
  private static readonly candleCache = new Map<string, { value: any; expiresAt: number }>();
  private static readonly quotePromises = new Map<string, Promise<any>>();
  private static readonly candlePromises = new Map<string, Promise<any>>();

  private static normalizeSymbol(symbol: string): string {
    return SymbolMapper.normalizeSymbol(symbol);
  }

  static getWatchSymbols() {
    return [...this.WATCHLIST];
  }

  static async getWatchQuotes() {
    return Object.values(await this.getQuotes(this.WATCHLIST));
  }

  static async getQuote(symbol: string) {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) {
      return null;
    }

    const cacheKey = `quote:${normalized}`;
    const now = Date.now();
    const cached = this.priceCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    if (this.quotePromises.has(cacheKey)) {
      return this.quotePromises.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const quote = await MarketProvider.fetchQuote(normalized);
        this.priceCache.set(cacheKey, { value: quote, expiresAt: Date.now() + this.PRICE_TTL_MS });
        return quote;
      } catch (error: any) {
        console.error(`[MarketService] Quote fetch failed for ${normalized}: ${error.message}`);
        if (cached?.value) {
          console.warn(`[MarketService] Serving stale quote cache for ${normalized}`);
          return cached.value;
        }
        return null;
      } finally {
        this.quotePromises.delete(cacheKey);
      }
    })();

    this.quotePromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  static getPrice(symbol: string): number | null {
    const normalized = this.normalizeSymbol(symbol);
    if (!normalized) return null;
    return this.priceCache.get(`quote:${normalized}`)?.value?.price || null;
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
