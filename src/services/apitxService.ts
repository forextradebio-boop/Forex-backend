import axios from 'axios';

// Define the core APITX operations
export class ApitxService {
  private static getHeaders() {
    return {
      'Authorization': `Bearer ${process.env.APITX_API_KEY}`,
      'Content-Type': 'application/json'
    };
  }

  static async fetchLivePrices(symbols: string[]) {
    if (!process.env.APITX_API_KEY) return null;
    try {
      const res = await axios.get(`https://api.apitx.com/v1/market/quotes?symbols=${symbols.join(',')}`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      console.error('APITX fetchLivePrices failed', err);
      return null;
    }
  }

  static async placeOrder(payload: any) {
    if (!process.env.APITX_API_KEY) {
      throw new Error('APITX API key is not configured');
    }
    try {
      const res = await axios.post('https://api.apitx.com/v1/trading/orders', payload, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error('APITX placeOrder failed');
    }
  }

  static async modifyOrder(orderId: string, payload: any) {
    if (!process.env.APITX_API_KEY) {
      throw new Error('APITX API key is not configured');
    }
    try {
      const res = await axios.put(`https://api.apitx.com/v1/trading/orders/${orderId}`, payload, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error('APITX modifyOrder failed');
    }
  }

  static async closePosition(positionId: string) {
    if (!process.env.APITX_API_KEY) {
      throw new Error('APITX API key is not configured');
    }
    try {
      const res = await axios.post(`https://api.apitx.com/v1/trading/positions/${positionId}/close`, {}, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error('APITX closePosition failed');
    }
  }

  static async fetchOpenPositions(accountId: string) {
    if (!process.env.APITX_API_KEY) {
      return [];
    }
    try {
      const res = await axios.get(`https://api.apitx.com/v1/trading/accounts/${accountId}/positions`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      return [];
    }
  }

  static async fetchAccountSummary(accountId: string) {
    if (!process.env.APITX_API_KEY) {
      return null;
    }
    try {
      const res = await axios.get(`https://api.apitx.com/v1/trading/accounts/${accountId}`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }
}
