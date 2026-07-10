import { ProfitCalculator } from './ProfitCalculator';
import { MarginCalculator } from './MarginCalculator';
import { PriceService } from './PriceService';
import { SymbolSpecification } from './SymbolSpecification';

export class PositionManager {
  /**
   * Calculates live parameters for a position (PnL, Margin Used)
   */
  static evaluateLivePosition(
    position: any, 
    allPrices: Record<string, any> = {}
  ): { pnl: number; marginUsed: number; currentPrice: number } {
    const spec = SymbolSpecification.getSync(position.symbol);
    const prices = PriceService.getLivePrices(position.symbol, spec.spread || 1, spec.digits || 5);
    
    // Determine USD conversion rate for cross pairs
    const sym = position.symbol.toUpperCase();
    let usdRate = 1;

    if (!sym.endsWith('USD') && !sym.startsWith('USD')) {
      const quote = sym.substring(3);
      if (quote === 'JPY') {
        const cross = 'USDJPY';
        let crossPrice = allPrices[cross] ? allPrices[cross].price : null;
        if (!crossPrice) crossPrice = PriceService.getRawPrice(cross);
        if (crossPrice > 0) usdRate = 1 / crossPrice;
      } else if (quote === 'GBP') {
        const cross = 'GBPUSD';
        let crossPrice = allPrices[cross] ? allPrices[cross].price : null;
        if (!crossPrice) crossPrice = PriceService.getRawPrice(cross);
        if (crossPrice > 0) usdRate = crossPrice;
      }
    } else if (sym.startsWith('USD') && sym !== 'USDUSD') {
      const currentMid = (prices.bid + prices.ask) / 2;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }

    const entryPrice = Number(position.openPrice) || 0;
    const volume = Number(position.volume) || 0;
    const side = position.type || 'BUY';

    const pnl = ProfitCalculator.calculate(
      side,
      entryPrice,
      prices.bid,
      prices.ask,
      volume,
      position.symbol,
      usdRate
    );

    // Margin is calculated at entry or current? MT5 uses open price for margin calculation on Forex
    // but we use current price here as requested by user's specific formula: Margin = Price * Contract * Vol / Lev
    const priceForMargin = side === 'BUY' ? prices.bid : prices.ask;
    
    const marginUsed = MarginCalculator.calculate(
      position.symbol,
      volume,
      priceForMargin,
      spec.leverageLimit || 100,
      usdRate
    );

    const currentPrice = side === 'BUY' ? prices.bid : prices.ask;

    return { pnl, marginUsed, currentPrice };
  }

  /**
   * Calculates proportional realized PnL and remaining volume for a partial close.
   */
  static calculatePartialClose(
    position: any,
    closeVolume: number,
    livePnl: number
  ): { realizedPnl: number; remainingVolume: number } {
    if (closeVolume >= position.volume) {
      return { realizedPnl: livePnl, remainingVolume: 0 };
    }

    const proportion = closeVolume / position.volume;
    const realizedPnl = livePnl * proportion;
    const remainingVolume = position.volume - closeVolume;

    return { realizedPnl, remainingVolume };
  }
}
