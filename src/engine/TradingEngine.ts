import { PositionManager } from './PositionManager';
import { AccountCalculator } from './AccountCalculator';
import { RiskCalculator } from './RiskCalculator';
import { OrderValidator } from './OrderValidator';
import { PriceService } from './PriceService';

export class TradingEngine {
  /**
   * Evaluates the full wallet state including all open positions.
   * Modifies the positions in-place with new pnl/margin and returns the wallet metrics.
   */
  static evaluateWallet(
    walletBalance: number,
    positions: any[],
    allPrices: Record<string, any> = {}
  ): {
    equity: number;
    usedMargin: number;
    freeMargin: number;
    marginLevel: number;
    riskState: 'STOP_OUT' | 'MARGIN_CALL' | 'SAFE';
    totalPnl: number;
  } {
    let usedMargin = 0;
    let totalPnl = 0;

    for (const pos of positions) {
      const { pnl, marginUsed } = PositionManager.evaluateLivePosition(pos, allPrices);
      pos.pnl = pnl;
      pos.marginUsed = marginUsed;
      
      usedMargin += marginUsed;
      totalPnl += pnl;
    }

    const safeBalance = Number(walletBalance) || 0;
    const equity = AccountCalculator.calculateEquity(safeBalance, totalPnl);
    const freeMargin = AccountCalculator.calculateFreeMargin(equity, usedMargin);
    const marginLevel = AccountCalculator.calculateMarginLevel(equity, usedMargin);
    const riskState = RiskCalculator.evaluateRisk(marginLevel);

    return {
      equity,
      usedMargin,
      freeMargin,
      marginLevel,
      riskState,
      totalPnl
    };
  }

  /**
   * Pre-trade validation wrapper.
   */
  static validateOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    volume: number,
    freeMargin: number,
    marginRequired: number,
    slPrice?: number,
    tpPrice?: number,
    entryPrice?: number,
    marketEnabled: boolean = true
  ): void {
    OrderValidator.validateNewOrder(
      symbol, side, volume, marginRequired, freeMargin, slPrice, tpPrice, entryPrice, marketEnabled
    );
  }
}
