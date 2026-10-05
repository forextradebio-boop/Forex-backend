import axios from 'axios';
import { ProviderSettingsModel } from '../models/ProviderSettings';
import { ApiKeyModel } from '../models/ApiKey';

export class ApiNinjasProvider {
  private static readonly CACHE_TTL_MS = Number(process.env.APININJAS_CACHE_TTL_MS) || 60000; // Cache for 1 min
  
  private static cachedData: Record<string, any> = {};
  private static requestPromises: Record<string, Promise<any>> = {};

  private static async getSettings(symbol: string) {
    let settings = await ProviderSettingsModel.findOne({ symbol, provider: 'apininjas' });
    if (!settings) {
      settings = await ProviderSettingsModel.create({
        symbol,
        provider: 'apininjas',
        enabled: true
      });
    }
    return settings;
  }

  private static async getActiveKey() {
    return process.env.API_NINJAS_KEY;
  }

  public static async getQuote(symbol: string) {
    const settings = await this.getSettings(symbol);
    if (!settings.enabled) {
      console.log(`[${symbol}][ApiNinjas] Provider disabled`);
      return null;
    }

    // Return cache if valid
    const cache = this.cachedData[symbol];
    if (cache && (Date.now() - cache.fetchedAt < this.CACHE_TTL_MS)) {
      return { ...cache, isStale: false };
    }

    // Return stale cache if already fetching
    if (this.requestPromises[symbol]) {
      if (cache) return { ...cache, isStale: true };
      return this.requestPromises[symbol];
    }

    const apiKey = await this.getActiveKey();
    if (!apiKey) {
      console.warn(`[MarketProvider] ApiNinjas key is missing for ${symbol}`);
      settings.lastError = 'API key is missing';
      await settings.save();
      if (cache) return { ...cache, isStale: true };
      throw new Error('ApiNinjas key is missing');
    }

    const fetchTask = async () => {
      try {
        console.log(`[${symbol}][ApiNinjas] Fetch started`);
        
        let url = '';
        if (symbol === 'USOIL') {
          url = `https://api.api-ninjas.com/v1/commodityprice?name=Crude Oil`;
        } else if (symbol === 'XAGUSD') {
          url = `https://api.api-ninjas.com/v1/commodityprice?name=Silver`;
        } else if (symbol === 'XAUUSD') {
          url = `https://api.api-ninjas.com/v1/goldprice`;
        } else {
          throw new Error(`Unsupported symbol for ApiNinjas: ${symbol}`);
        }

        const response = await axios.get(url, { 
          timeout: 10000,
          headers: { 'X-Api-Key': apiKey }
        });
        
        const data = response.data;
        if (!data || data.price === undefined) {
          console.warn(`[${symbol}][ApiNinjas] Invalid response`, data);
          throw new Error(`Invalid response from ApiNinjas for ${symbol}`);
        }

        const price = Number(data.price);
        const latestValidDate = data.updated ? new Date(data.updated * 1000).toISOString() : new Date().toISOString();

        console.log(`[${symbol}][ApiNinjas] Fetch successful price=${price}`);

        const result = {
          symbol: symbol,
          provider: 'apininjas',
          price: price,
          timestamp: Date.now(),
          fetchedAt: Date.now(),
          sourceDate: latestValidDate
        };

        this.cachedData[symbol] = result;

        settings.lastSuccessfulFetch = new Date();
        settings.lastSuccessfulPrice = price;
        settings.lastError = null;
        await settings.save();

        return { ...result, isStale: false };
      } catch (error: any) {
        console.error(`[${symbol}][ApiNinjas] Fetch error: ${error.message}`);
        settings.lastError = error.message;
        await settings.save();

        if (this.cachedData[symbol]) {
          return { ...this.cachedData[symbol], isStale: true };
        }
        throw error;
      } finally {
        delete this.requestPromises[symbol];
      }
    };

    this.requestPromises[symbol] = fetchTask();
    return this.requestPromises[symbol];
  }
}
