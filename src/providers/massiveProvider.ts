import axios from 'axios';
import { ProviderSettingsModel } from '../models/ProviderSettings';
import { ApiKeyModel } from '../models/ApiKey';

export class MassiveProvider {
  private static readonly CACHE_TTL_MS = 60000;
  private static cache: Record<string, any> = {};
  private static requestPromises: Record<string, Promise<any>> = {};

  private static async getActiveKey() {
    const keyRecord = await ApiKeyModel.findOne({ provider: 'MASSIVE', status: 'ACTIVE' });
    if (keyRecord && keyRecord.keyValue) return keyRecord.keyValue;
    return process.env.MASSIVE_API_KEY;
  }

  public static async getQuote(symbol: string) {
    const normalized = symbol.toUpperCase();
    let massiveSymbol = normalized;
    if (normalized === 'XAUUSD') massiveSymbol = 'C:XAUUSD';
    else if (normalized === 'XAGUSD') massiveSymbol = 'C:XAGUSD';
    else massiveSymbol = `C:${normalized}`;

    if (this.cache[normalized] && (Date.now() - this.cache[normalized].fetchedAt < this.CACHE_TTL_MS)) {
      return this.cache[normalized].data;
    }

    if (this.requestPromises[normalized]) {
      return this.requestPromises[normalized];
    }

    const apiKey = await this.getActiveKey();
    if (!apiKey) {
      throw new Error('Massive API key is missing');
    }

    const fetchTask = async () => {
      try {
        console.log(`[Massive] Fetching ${massiveSymbol} from massive.com...`);
        const url = `https://api.polygon.io/v2/aggs/ticker/${massiveSymbol}/prev?adjusted=true`;
        const response = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          timeout: 10000
        });

        const data = response.data;
        if (data.status !== 'OK' || !data.results || data.results.length === 0) {
          throw new Error(`Invalid Massive response for ${massiveSymbol}: ${JSON.stringify(data)}`);
        }

        const result = data.results[0];
        const price = result.c; // Close price of previous aggregate

        const quote = {
          symbol: normalized,
          provider: 'massive',
          price: price,
          bid: price,
          ask: price, // Spread handled in marketProvider
          spread: 0,
          high: result.h,
          low: result.l,
          open: result.o,
          previousClose: result.c,
          change: 0,
          changePercent: 0,
          marketStatus: 'OPEN',
          volume: result.v || 0,
          timestamp: Date.now(),
          fetchedAt: Date.now()
        };

        this.cache[normalized] = {
          fetchedAt: Date.now(),
          data: quote
        };

        return quote;
      } catch (error: any) {
        console.error(`[Massive] Fetch error for ${massiveSymbol}: ${error.message}`);
        throw error;
      } finally {
        delete this.requestPromises[normalized];
      }
    };

    this.requestPromises[normalized] = fetchTask();
    return this.requestPromises[normalized];
  }
}
