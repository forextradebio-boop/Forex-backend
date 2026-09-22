import { MarketService } from '../services/market.service';

export class PriceService {
  /**
   * Gets the current live bid, ask, and spread for a symbol.
   * If the market service only provides a single price, it derives bid/ask using the configured spread.
   */
  static getRawPrice(symbol: string): number | null {
    return MarketService.getPrice(symbol);
  }

  static getLivePrices(symbol: string, spreadPips: number = 1, digits: number = 5): { bid: number; ask: number; spread: number } {
    const rawPrice = MarketService.getPrice(symbol);
    
    // Fallback if price is somehow 0
    if (!rawPrice) {
      return { bid: 0, ask: 0, spread: 0 };
    }

    // Typical calculation: Price from MarketService is often considered Mid or Bid.
    // Let's assume MarketService returns the Bid, or we adjust symmetrically.
    // We'll treat the rawPrice as Mid price for fairness, or follow existing convention.
    // Assuming rawPrice is Bid price based on typical broker feeds.
    const pipValue = Math.pow(10, -digits + 1); // 5 digits -> pip is 0.0001 (which is 10^-4). Actually for 5 digits pip is 10^-4.
    // Let's use a simpler pip calculation based on digits
    const pipSize = digits === 2 || digits === 3 ? 0.01 : 0.0001;

    const spreadValue = spreadPips * pipSize;
    const bid = rawPrice;
    const ask = rawPrice + spreadValue;

    return {
      bid: parseFloat(bid.toFixed(6)),
      ask: parseFloat(ask.toFixed(6)),
      spread: spreadPips
    };
  }

  /**
   * Retrieves the specific execution price for a new order.
   * BUY -> ASK
   * SELL -> BID
   */
  static getExecutionPrice(symbol: string, side: 'BUY' | 'SELL', spreadPips: number, digits: number): number {
    const prices = this.getLivePrices(symbol, spreadPips, digits);
    return side === 'BUY' ? prices.ask : prices.bid;
  }
}
