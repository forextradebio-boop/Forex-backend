import axios, { AxiosInstance } from 'axios';

const MARKET_AUX_BASE_URL = 'https://api.marketaux.com/v1';
const CACHE_TTL_MS = 1000 * 60 * 2; // 2 minutes
const RETRY_ATTEMPTS = 1;
const FOREX_SYMBOLS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USDCHF',
  'USDCAD',
  'AUDUSD',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'EURGBP',
  'XAUUSD',
  'XAGUSD',
  'BTCUSD',
  'ETHUSD',
];

const DEFAULT_FILTER_PARAMS = {
  filter_entities: true,
  must_have_entities: true,
  language: 'en',
  group_similar: true,
};

export class NewsService {
  private static readonly cache = new Map<string, { expiresAt: number; value: any }>();
  private static readonly http: AxiosInstance = axios.create({
    baseURL: MARKET_AUX_BASE_URL,
    timeout: 10000,
  });

  private static getApiToken() {
    const apiToken = process.env.MARKETAUX_API_KEY;
    if (!apiToken) {
      throw new Error('MARKETAUX_API_KEY is not configured');
    }
    return apiToken;
  }

  private static buildCacheKey(path: string, params: Record<string, any>) {
    const normalizedParams = { ...params };
    delete normalizedParams.api_token;
    return `${path}|${JSON.stringify(normalizedParams)}`;
  }

  private static async fetchFromMarketAux(path: string, params: Record<string, any>) {
    const apiToken = this.getApiToken();
    const cacheKey = this.buildCacheKey(path, params);
    const now = Date.now();

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const request = async () => {
      const response = await this.http.get(path, {
        params: {
          api_token: apiToken,
          ...params,
        },
      });
      return response.data;
    };

    let lastError: any;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
      try {
        const result = await request();
        this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
        return result;
      } catch (error: any) {
        lastError = error;
        if (attempt === RETRY_ATTEMPTS) {
          throw error;
        }
      }
    }

    throw lastError;
  }

  private static normalizeSentiment(value: unknown): string {
    if (!value && value !== 0) {
      return 'Neutral';
    }

    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (normalized.includes('positive') || normalized.includes('bullish')) return 'Positive';
      if (normalized.includes('negative') || normalized.includes('bearish')) return 'Negative';
      return 'Neutral';
    }

    if (typeof value === 'number') {
      if (value > 0.1) return 'Positive';
      if (value < -0.1) return 'Negative';
      return 'Neutral';
    }

    return 'Neutral';
  }

  private static extractSymbols(item: any): string[] {
    if (!Array.isArray(item.entities)) return [];
    return item.entities
      .map((entity: any) => entity.name || entity.symbol || '')
      .filter((value: string) => typeof value === 'string' && value.length > 0)
      .map((value: string) => value.toUpperCase())
      .filter((value: string, index: number, array: string[]) => array.indexOf(value) === index);
  }

  private static normalizeArticles(data: any): any[] {
    const items = Array.isArray(data)
      ? data
      : data?.data && Array.isArray(data.data)
      ? data.data
      : data?.articles && Array.isArray(data.articles)
      ? data.articles
      : data && typeof data === 'object'
      ? [data]
      : [];

    return items.map((item: any, index: number) => {
      const title = item.title || item.headline || item.summary || 'Market update';
      const summary = item.description || item.summary || item.body || '';
      const url = item.url || item.source_url || item.link || '';
      const imageUrl = item.image_url || item.image || item.thumbnail || '';
      const source = item.source || item.clean_url || item.source_name || item.provider_name || 'MarketAux';
      const publishedAt = item.published_at || item.publishedAt || item.created_at || new Date().toISOString();
      const sentiment = this.normalizeSentiment(item.sentiment || item.sentiment_label || item.sentiment_score);
      const relatedSymbols = this.extractSymbols(item);
      const id = item.uuid || item.id || url || `${title}-${index}`;

      return {
        id,
        uuid: item.uuid || id,
        title,
        summary,
        url,
        imageUrl,
        source,
        publishedAt,
        sentiment,
        relatedSymbols,
        content: item.body || item.content || summary,
      };
    });
  }

  static async getLatestNews() {
    const response = await this.fetchFromMarketAux('/news/all', {
      per_page: 20,
      ...DEFAULT_FILTER_PARAMS,
      sort: 'published_at:desc',
    });
    return this.normalizeArticles(response);
  }

  static async getForexNews() {
    const response = await this.fetchFromMarketAux('/news/all', {
      per_page: 20,
      symbols: FOREX_SYMBOLS.join(','),
      ...DEFAULT_FILTER_PARAMS,
      sort: 'published_at:desc',
    });
    return this.normalizeArticles(response);
  }

  static async getSymbolNews(symbol: string) {
    const normalizedSymbol = String(symbol || '').toUpperCase();
    const response = await this.fetchFromMarketAux('/news/all', {
      per_page: 20,
      symbols: normalizedSymbol,
      ...DEFAULT_FILTER_PARAMS,
      sort: 'published_at:desc',
    });
    return this.normalizeArticles(response);
  }

  static async searchNews(query: string) {
    const response = await this.fetchFromMarketAux('/news/all', {
      per_page: 20,
      q: String(query || ''),
      ...DEFAULT_FILTER_PARAMS,
      sort: 'published_at:desc',
    });
    return this.normalizeArticles(response);
  }

  static async getArticle(uuid: string) {
    const response = await this.fetchFromMarketAux(`/news/uuid/${encodeURIComponent(uuid)}`, {});
    const articles = this.normalizeArticles(response);
    return articles[0] || null;
  }

  static async getSimilarArticles(uuid: string) {
    const response = await this.fetchFromMarketAux(`/news/similar/${encodeURIComponent(uuid)}`, {
      per_page: 10,
      ...DEFAULT_FILTER_PARAMS,
    });
    return this.normalizeArticles(response);
  }

  static async getSources() {
    const response = await this.fetchFromMarketAux('/news/sources', {});
    const items = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
      ? response.data
      : [];

    return items.map((source: any) => ({
      id: source.id || source.name || source.url || String(source),
      name: source.name || source.title || source.id || String(source),
      url: source.url || source.website || '',
    }));
  }
}
