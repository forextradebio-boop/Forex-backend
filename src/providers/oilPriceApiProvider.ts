import axios from 'axios';
import { ProviderSettingsModel } from '../models/ProviderSettings';
import { ApiKeyModel } from '../models/ApiKey';

export class OilPriceApiProvider {
  private static wtiRequestPromise: Promise<any> | null = null;
  private static readonly WTI_CACHE_TTL_MS = Number(process.env.WTI_CACHE_TTL_MS) || 60000; // Cache for 1 min
  private static cachedData: any = null;

  private static async getSettings() {
    let settings = await ProviderSettingsModel.findOne({ symbol: 'USOIL', provider: 'oilpriceapi' });
    if (!settings) {
      settings = await ProviderSettingsModel.create({
        symbol: 'USOIL',
        provider: 'oilpriceapi',
        enabled: true
      });
    }
    return settings;
  }

  private static async getActiveKey() {
    // Try to get from DB first
    const keyRecord = await ApiKeyModel.findOne({ provider: 'OILPRICEAPI', status: 'ACTIVE' });
    if (keyRecord && keyRecord.keyValue) {
      return keyRecord.keyValue;
    }
    // Fallback to ENV
    return process.env.OILPRICEAPI_KEY;
  }

  public static async getWTI() {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('[WTI][OilPriceAPI] Provider disabled');
      return null;
    }

    // Return cache if valid
    if (this.cachedData && (Date.now() - this.cachedData.fetchedAt < this.WTI_CACHE_TTL_MS)) {
      return { ...this.cachedData, isStale: false };
    }

    // Return stale cache if already fetching to prevent duplicate requests
    if (this.wtiRequestPromise) {
      if (this.cachedData) {
        return { ...this.cachedData, isStale: true }; 
      }
      return this.wtiRequestPromise;
    }

    const apiKey = await this.getActiveKey();
    if (!apiKey) {
      console.warn('[MarketProvider] OilPriceAPI key is missing');
      
      settings.lastError = 'API key is missing';
      await settings.save();

      if (this.cachedData) return { ...this.cachedData, isStale: true };
      throw new Error('OilPriceAPI key is missing');
    }

    const fetchTask = async () => {
      try {
        console.log('[WTI][OilPriceAPI] Fetch started');
        const url = `https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD`;
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: { 'Authorization': `Token ${apiKey}` }
        });
        const data = response.data;

        if (data.status !== 'success' || !data.data || !data.data.price) {
          console.warn('[WTI][OilPriceAPI] Invalid response', data);
          throw new Error('Invalid or empty WTI data from OilPriceAPI');
        }

        const latestValidValue = Number(data.data.price);
        const latestValidDate = data.data.updated_at || new Date().toISOString();

        console.log(`[WTI][OilPriceAPI] Fetch successful price=${latestValidValue}`);

        const result = {
          symbol: 'USOIL',
          provider: 'oilpriceapi',
          price: latestValidValue,
          currency: 'USD',
          unit: 'barrel',
          timestamp: Date.now(),
          fetchedAt: Date.now(),
          sourceDate: latestValidDate,
          market: 'WTI'
        };

        this.cachedData = result;

        settings.lastSuccessfulFetch = new Date();
        settings.lastSuccessfulPrice = latestValidValue;
        settings.lastError = null;
        await settings.save();

        return { ...result, isStale: false };
      } catch (error: any) {
        console.error(`[WTI][OilPriceAPI] Fetch error: ${error.message}`);
        
        settings.lastError = error.message;
        await settings.save();

        if (this.cachedData) {
          return { ...this.cachedData, isStale: true };
        }
        throw error;
      } finally {
        this.wtiRequestPromise = null;
      }
    };

    this.wtiRequestPromise = fetchTask();
    return this.wtiRequestPromise;
  }
}
