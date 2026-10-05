import axios from 'axios';
import { MarketProvider } from './marketProvider';
import { ProviderSettingsModel } from '../models/ProviderSettings';

export class AlphaVantageWtiProvider {
  private static wtiRequestPromise: Promise<any> | null = null;
  private static readonly WTI_CACHE_TTL_MS = Number(process.env.WTI_CACHE_TTL_MS) || 300000;
  private static cachedData: any = null;

  private static async getSettings() {
    let settings = await ProviderSettingsModel.findOne({ symbol: 'USOIL', provider: 'alpha_vantage' });
    if (!settings) {
      settings = await ProviderSettingsModel.create({
        symbol: 'USOIL',
        provider: 'alpha_vantage',
        enabled: true
      });
    }
    return settings;
  }

  public static async getWTI() {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('[WTI][AlphaVantage] Provider disabled');
      return null;
    }

    // Return cache if valid
    if (this.cachedData && (Date.now() - this.cachedData.fetchedAt < this.WTI_CACHE_TTL_MS)) {
      console.log('[WTI][AlphaVantage] Cache hit');
      return { ...this.cachedData, isStale: false };
    }

    // Return stale cache if already fetching to prevent duplicate requests (deduplication)
    if (this.wtiRequestPromise) {
      if (this.cachedData) {
        return { ...this.cachedData, isStale: true }; // return stale immediately
      }
      return this.wtiRequestPromise;
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn('[MarketProvider] Alpha Vantage WTI API key is missing');
      
      settings.lastError = 'API key is missing';
      await settings.save();

      if (this.cachedData) return { ...this.cachedData, isStale: true };
      throw new Error('Alpha Vantage WTI API key is missing');
    }

    const fetchTask = async () => {
      try {
        console.log('[WTI][AlphaVantage] Fetch started');
        const url = `https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${apiKey}`;
        const response = await axios.get(url, { timeout: 10000 });
        const data = response.data;

        if (data['Error Message'] || data['Note'] || data['Information']) {
          const errMsg = data['Error Message'] || data['Note'] || data['Information'];
          if (errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('call frequency')) {
            console.warn('[WTI][AlphaVantage] Rate limit reached');
          }
          throw new Error(`AlphaVantage API Error: ${errMsg}`);
        }

        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
          console.warn('[WTI][AlphaVantage] Invalid response');
          throw new Error('Invalid or empty WTI data from Alpha Vantage');
        }

        let latestValidValue: number | null = null;
        let latestValidDate: string | null = null;

        for (const item of data.data) {
          if (item.value && item.value !== '.' && Number.isFinite(Number(item.value))) {
            latestValidValue = Number(item.value);
            latestValidDate = item.date;
            break;
          }
        }

        if (latestValidValue === null) {
          throw new Error('No valid numeric WTI values found');
        }

        console.log(`[WTI][AlphaVantage] Fetch successful price=${latestValidValue} date=${latestValidDate}`);

        const result = {
          symbol: 'USOIL',
          provider: 'alpha_vantage',
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
        console.error(`[WTI][AlphaVantage] Fetch error: ${error.message}`);
        
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
  
  public static async getWtiCandles() {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      return [];
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn('[MarketProvider] Alpha Vantage WTI API key is missing');
      return [];
    }

    try {
      const url = `https://www.alphavantage.co/query?function=WTI&interval=daily&apikey=${apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (data['Error Message'] || data['Note'] || data['Information']) {
        throw new Error(`AlphaVantage API Error: ${data['Error Message'] || data['Note'] || data['Information']}`);
      }

      if (!data.data || !Array.isArray(data.data)) {
        return [];
      }

      const candles = [];
      const nowSeconds = Math.floor(Date.now() / 1000);

      for (const item of data.data) {
        if (item.value && item.value !== '.' && Number.isFinite(Number(item.value))) {
          const val = Number(item.value);
          const time = Math.floor(new Date(item.date).getTime() / 1000);
          if (time <= nowSeconds) {
            candles.push({
              time: time,
              open: val,
              high: val,
              low: val,
              close: val,
              volume: 0
            });
          }
        }
      }

      return candles.sort((a, b) => a.time - b.time);
    } catch (error: any) {
      console.error(`[WTI][AlphaVantage] Candles fetch error: ${error.message}`);
      return [];
    }
  }
}
