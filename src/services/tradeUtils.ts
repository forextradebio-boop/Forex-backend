export class TradeUtils {
  static getContractSize(symbol: string): number {
    const sym = symbol.toUpperCase();
    if (sym.startsWith('XAU')) return 100;
    if (sym.startsWith('XAG')) return 5000;
    if (['BTCUSD', 'ETHUSD'].includes(sym)) return 1;
    if (['US30', 'NAS100', 'SPX500'].includes(sym)) return 10;
    // Standard Forex (EURUSD, USDJPY, etc.)
    return 100000;
  }

  static calculatePnl(type: 'BUY' | 'SELL', openPrice: number, currentPrice: number, volume: number, symbol: string, allPrices: Record<string, any> = {}): number {
    const contractSize = this.getContractSize(symbol);
    const sym = symbol.toUpperCase();
    
    // Raw PNL in Quote Currency
    let rawPnl = 0;
    if (type === 'BUY') {
      rawPnl = (currentPrice - openPrice) * volume * contractSize;
    } else {
      rawPnl = (openPrice - currentPrice) * volume * contractSize;
    }

    // Convert to USD if the quote currency is not USD
    if (sym.endsWith('USD')) {
      return rawPnl;
    } else if (sym.startsWith('USD')) {
      // USDJPY, USDCAD, USDCHF -> Quote is JPY, CAD, CHF. We divide by the current rate to get USD.
      return rawPnl / currentPrice;
    } else {
      // Cross pairs like EURGBP, EURJPY, GBPJPY
      // Quote is the last 3 chars. We need the rate of QuoteUSD or USDQuote.
      const quoteCurrency = sym.substring(3);
      
      // E.g., JPY -> we need USDJPY
      if (quoteCurrency === 'JPY') {
        const crossPair = `USDJPY`;
        const crossPrice = allPrices[crossPair]?.price || currentPrice; // Approximation if missing
        if (crossPair === 'USDJPY' && allPrices[crossPair]) {
            return rawPnl / allPrices[crossPair].price;
        }
      }
      
      // E.g., GBP -> we need GBPUSD
      if (quoteCurrency === 'GBP') {
        const crossPair = `GBPUSD`;
        if (allPrices[crossPair]) {
            return rawPnl * allPrices[crossPair].price;
        }
      }

      // Default fallback (approximation)
      return rawPnl;
    }
  }
}
