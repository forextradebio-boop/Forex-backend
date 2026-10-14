import axios from 'axios';
import { ApiKeyModel } from '../models/ApiKey';
import { ProviderSettingsModel } from '../models/ProviderSettings';
import { SymbolSpecification } from '../engine/SymbolSpecification';

interface MetalQuote {
  price: number;
  timestamp: number;
  provider: string;
  sourceDate?: string;
}

export class MetalPriceApiProvider {
  private static readonly CACHE_TTL_MS = 15000; // 15-second cache
  private static cachedData: {
    XAUUSD?: MetalQuote;
    XAGUSD?: MetalQuote;
    fetchedAt: number;
  } | null = null;

  private static fetchPromise: Promise<void> | null = null;

  public static clearCache(): void {
    this.cachedData = null;
    this.fetchPromise = null;
  }

  public static async getActiveKey(): Promise<string | null> {
    try {
      // 1. Look for active key in DB with supported provider names
      const keyRecord = await ApiKeyModel.findOne({
        provider: { $in: ['METALPRICEAPI', 'METALS_API', 'METALSAPI', 'METALPRICE', 'METALS-API'] },
        status: 'ACTIVE'
      });
      if (keyRecord && keyRecord.keyValue && keyRecord.keyValue.trim()) {
        return keyRecord.keyValue.trim();
      }
    } catch (err: any) {
      console.warn('[MetalPriceAPI] Failed to query ApiKeyModel:', err.message);
    }

    // 2. Fallback to environment variables
    const envKey = process.env.METALPRICEAPI_KEY || process.env.METALPRICE_API_KEY || process.env.METALS_API_KEY;
    if (envKey && envKey.trim()) {
      return envKey.trim();
    }

    return null;
  }

  public static async isProviderEnabled(symbol: string): Promise<boolean> {
    try {
      const setting = await ProviderSettingsModel.findOne({
        symbol: symbol.toUpperCase(),
        provider: 'metalpriceapi'
      });
      if (!setting) return true; // Enabled by default
      return setting.enabled;
    } catch {
      return true;
    }
  }

  public static async getQuote(symbol: string) {
    const normalized = symbol.toUpperCase();
    if (normalized !== 'XAUUSD' && normalized !== 'XAGUSD') {
      return null;
    }

    const isEnabled = await this.isProviderEnabled(normalized);
    if (!isEnabled) {
      return null;
    }

    const apiKey = await this.getActiveKey();
    if (!apiKey) {
      return null;
    }

    // Serve fresh cache if available
    if (this.cachedData && (Date.now() - this.cachedData.fetchedAt < this.CACHE_TTL_MS)) {
      const cached = normalized === 'XAUUSD' ? this.cachedData.XAUUSD : this.cachedData.XAGUSD;
      if (cached) {
        return this.buildQuotePayload(normalized, cached.price, cached.timestamp);
      }
    }

    // If a request is already in flight, reuse it
    if (this.fetchPromise) {
      try {
        await this.fetchPromise;
        if (this.cachedData) {
          const cached = normalized === 'XAUUSD' ? this.cachedData.XAUUSD : this.cachedData.XAGUSD;
          if (cached) {
            return this.buildQuotePayload(normalized, cached.price, cached.timestamp);
          }
        }
      } catch {
        // Will fallback below
      }
    }

    // Fetch fresh rates
    this.fetchPromise = this.fetchFromApi(apiKey);
    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }

    if (this.cachedData) {
      const cached = normalized === 'XAUUSD' ? this.cachedData.XAUUSD : this.cachedData.XAGUSD;
      if (cached) {
        return this.buildQuotePayload(normalized, cached.price, cached.timestamp);
      }
    }

    return null;
  }

  private static async fetchFromApi(apiKey: string): Promise<void> {
    try {
      console.log('[MetalPriceAPI] Fetching latest rates for XAU and XAG...');
      const url = `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAU,XAG`;
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;

      if (!data || data.success === false || !data.rates) {
        const errorMsg = data?.error?.info || data?.message || 'Invalid response from MetalPriceAPI';
        console.warn(`[MetalPriceAPI] Error response: ${errorMsg}`);
        await this.recordError(errorMsg);
        return;
      }

      // In MetalPriceAPI:
      // USDXAU = USD price per troy ounce of Gold (e.g. 4162.13)
      // USDXAG = USD price per troy ounce of Silver (e.g. 60.03)
      // Fallback: 1 / XAU and 1 / XAG
      const goldPrice = Number(data.rates.USDXAU) || (data.rates.XAU ? 1 / Number(data.rates.XAU) : null);
      const silverPrice = Number(data.rates.USDXAG) || (data.rates.XAG ? 1 / Number(data.rates.XAG) : null);
      const timestamp = data.timestamp ? Number(data.timestamp) * 1000 : Date.now();

      this.cachedData = {
        fetchedAt: Date.now(),
        ...(goldPrice ? { XAUUSD: { price: goldPrice, timestamp, provider: 'metalpriceapi' } } : {}),
        ...(silverPrice ? { XAGUSD: { price: silverPrice, timestamp, provider: 'metalpriceapi' } } : {}),
      };

      console.log(`[MetalPriceAPI] Rates updated successfully: XAUUSD=${goldPrice}, XAGUSD=${silverPrice}`);

      if (goldPrice) await this.recordSuccess('XAUUSD', goldPrice);
      if (silverPrice) await this.recordSuccess('XAGUSD', silverPrice);
    } catch (err: any) {
      console.error(`[MetalPriceAPI] Fetch error: ${err.message}`);
      await this.recordError(err.message);
      throw err;
    }
  }

  private static async recordSuccess(symbol: string, price: number): Promise<void> {
    try {
      await ProviderSettingsModel.findOneAndUpdate(
        { symbol, provider: 'metalpriceapi' },
        {
          $set: {
            lastSuccessfulFetch: new Date(),
            lastSuccessfulPrice: price,
            lastError: null,
          },
          $setOnInsert: { enabled: true }
        },
        { upsert: true }
      );
    } catch {
      // ignore
    }
  }

  private static async recordError(errorMessage: string): Promise<void> {
    try {
      await ProviderSettingsModel.updateMany(
        { symbol: { $in: ['XAUUSD', 'XAGUSD'] }, provider: 'metalpriceapi' },
        { $set: { lastError: errorMessage } }
      );
    } catch {
      // ignore
    }
  }

  private static buildQuotePayload(symbol: string, price: number, timestamp: number) {
    const normalized = symbol.toUpperCase();
    const spec = SymbolSpecification.getSync(normalized);
    const digits = spec.digits !== undefined ? spec.digits : (normalized === 'XAUUSD' ? 2 : 3);
    const spreadPips = spec.spread !== undefined && spec.spread > 0 
      ? spec.spread 
      : (normalized === 'XAUUSD' ? 15 : 20);
    const pipSize = digits === 2 || digits === 3 ? 0.01 : 0.0001;
    const spreadValue = spreadPips * pipSize;
    const bid = Number(price.toFixed(digits));
    const ask = Number((price + spreadValue).toFixed(digits));

    return {
      symbol: normalized,
      price: price,
      bid: bid,
      ask: ask,
      spread: spreadPips,
      high: price,
      low: price,
      open: price,
      previousClose: price,
      change: 0,
      changePercent: 0,
      category: 'METALS',
      marketStatus: 'OPEN',
      volume: 0,
      timestamp: timestamp || Date.now(),
      source: 'metalpriceapi'
    };
  }
}
