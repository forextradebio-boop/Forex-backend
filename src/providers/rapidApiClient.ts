import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

export type RapidApiErrorCode = '400' | '401' | '403' | '404' | '429' | '500' | 'TIMEOUT' | 'NETWORK';

export class RapidApiClient {
  private static instance: RapidApiClient;
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  private constructor() {
    const apiKey = process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPID_API_HOST || 'query1.finance.yahoo.com';
    this.baseUrl = `https://${apiHost}`;

    if (!apiKey) {
      throw new Error('RapidAPI Key is not configured in .env');
    }

    const factory = (axios as typeof axios & { create?: (config: AxiosRequestConfig) => AxiosInstance }).create;
    
    const isPublicYahoo = apiHost === 'query1.finance.yahoo.com';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (!isPublicYahoo) {
      headers['x-rapidapi-host'] = apiHost;
      headers['x-rapidapi-key'] = apiKey;
    }

    const createdClient = factory ? factory({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers,
    }) : undefined;

    this.client = createdClient ?? axios;
  }

  public static getInstance(): RapidApiClient {
    if (!RapidApiClient.instance) {
      RapidApiClient.instance = new RapidApiClient();
    }
    return RapidApiClient.instance;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    let lastError: Error | null = null;
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await this.client.get<T>(fullUrl, config);
        return response.data as T;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const code = this.toErrorCode(status, error?.code, error?.message);
        if (attempt === 2 || !['429', '500', 'TIMEOUT', 'NETWORK'].includes(code)) {
          console.warn(`[RapidApiClient] ${code} for ${url}`, error?.message || error);
          throw new Error(code);
        }
        const backoff = 250 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError ?? new Error('NETWORK');
  }

  private toErrorCode(status: number | undefined, code: string | undefined, message: string | undefined): RapidApiErrorCode {
    if (code === 'ECONNABORTED' || /timeout/i.test(message || '')) return 'TIMEOUT';
    if (!status) return 'NETWORK';
    if (status === 400) return '400';
    if (status === 401) return '401';
    if (status === 403) return '403';
    if (status === 404) return '404';
    if (status === 429) return '429';
    if (status >= 500) return '500';
    return 'NETWORK';
  }
}
