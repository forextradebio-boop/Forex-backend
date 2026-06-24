import axios from 'axios';
import { ApitxService } from './apitxService';

// Simulated base prices for the market generator
const marketData: Record<string, { price: number; spread: number; category: string }> = {
  'EURUSD': { price: 1.0850, spread: 0.0002, category: 'FOREX' },
  'GBPUSD': { price: 1.2700, spread: 0.0002, category: 'FOREX' },
  'USDJPY': { price: 150.50, spread: 0.01, category: 'FOREX' },
  'BTCUSD': { price: 64000.50, spread: 1.5, category: 'CRYPTO' },
  'ETHUSD': { price: 3500.25, spread: 0.5, category: 'CRYPTO' },
  'SOLUSD': { price: 145.20, spread: 0.1, category: 'CRYPTO' },
  'XAUUSD': { price: 2350.40, spread: 0.3, category: 'METALS' },
  'XAGUSD': { price: 28.50, spread: 0.02, category: 'METALS' },
  'AAPL': { price: 175.50, spread: 0.1, category: 'STOCKS' },
  'TSLA': { price: 190.20, spread: 0.15, category: 'STOCKS' }
};

export class MarketDataService {
  /**
   * Generates a random tick price for a given symbol
   */
  private static generateTick(symbol: string) {
    const data = marketData[symbol];
    if (!data) return null;

    // Random walk
    const change = data.price * (Math.random() * 0.002 - 0.001);
    data.price = data.price + change;

    return {
      symbol,
      bid: Number((data.price - data.spread / 2).toFixed(5)),
      ask: Number((data.price + data.spread / 2).toFixed(5)),
      spread: data.spread,
      price: Number(data.price.toFixed(5)),
      change: Number(change.toFixed(5)),
      changePercent: Number(((change / data.price) * 100).toFixed(3)),
      category: data.category
    };
  }

  static async getTickers() {
    return Object.keys(marketData).map(sym => this.generateTick(sym)).filter(Boolean);
  }

  static async getTicker(symbol: string) {
    return this.generateTick(symbol);
  }

  static async getByCategory(category: string) {
    const tickers = await this.getTickers();
    return tickers.filter(t => t?.category === category);
  }

  static async getTopGainers() {
    const tickers = await this.getTickers();
    return tickers.sort((a, b) => (b?.changePercent || 0) - (a?.changePercent || 0)).slice(0, 5);
  }

  static async getTopLosers() {
    const tickers = await this.getTickers();
    return tickers.sort((a, b) => (a?.changePercent || 0) - (b?.changePercent || 0)).slice(0, 5);
  }

  static async getQuotes(symbols: string[]) {
    const results: Record<string, any> = {};

    if (process.env.APITX_API_KEY) {
      const livePrices = await ApitxService.fetchLivePrices(symbols);
      if (livePrices) return livePrices;
    }

    // Simulated fallback
    for (const sym of symbols) {
      const basePrice = marketData[sym]?.price || 100;
      // Add random walk volatility
      const change = basePrice * (Math.random() * 0.002 - 0.001);
      const newPrice = basePrice + change;
      if (marketData[sym]) marketData[sym].price = newPrice;

      results[sym] = {
        price: newPrice,
        high: newPrice * 1.02,
        low: newPrice * 0.98,
        open: newPrice * 0.99,
        volume: Math.floor(Math.random() * 100000)
      };
    }

    return results;
  }

  static async getChart(symbol: string) {
    const basePrice = marketData[symbol]?.price || 100;
    const history = [];
    let currentPrice = basePrice * 0.9;
    for (let i = 0; i < 50; i++) {
      const open = currentPrice;
      const close = open * (1 + (Math.random() * 0.02 - 0.01));
      const high = Math.max(open, close) * 1.01;
      const low = Math.min(open, close) * 0.99;
      history.push({
        time: Math.floor((Date.now() - (50 - i) * 60000) / 1000),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100
      });
      currentPrice = close;
    }
    return history;
  }
}
