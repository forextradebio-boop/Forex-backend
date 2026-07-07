import { WalletModel } from '../models/Wallet';
import { PositionModel } from '../models/Position';
import { MarginEngine } from './marginEngine';
import { TradeUtils } from './tradeUtils';

export class StopLossEngine {
  static async evaluatePositions(positions: any[], prices: Record<string, any>) {
    const closedPositions = [];

    for (const pos of positions) {
      if (pos.status !== 'OPEN') continue;

      const currentPriceObj = prices[pos.symbol];
      if (!currentPriceObj) continue;
      
      const currentPrice = currentPriceObj.price;
      let shouldClose = false;

      if (pos.type === 'BUY') {
        if (pos.sl && currentPrice <= pos.sl) shouldClose = true;
        if (pos.tp && currentPrice >= pos.tp) shouldClose = true;
      } else if (pos.type === 'SELL') {
        if (pos.sl && currentPrice >= pos.sl) shouldClose = true;
        if (pos.tp && currentPrice <= pos.tp) shouldClose = true;
      }

      if (shouldClose) {
        pos.status = 'CLOSED';
        pos.closePrice = currentPrice;
        
        const pnl = TradeUtils.calculatePnl(pos.type, pos.openPrice, currentPrice, pos.volume, pos.symbol, prices);
        pos.pnl = pnl;
        
        await pos.save();

        // Credit PNL to wallet balance and then recalculate margins and equity
        const wallet = await WalletModel.findOne({ userId: pos.userId });
        if (wallet) {
          wallet.balance += pnl;
          await wallet.save();
          // Recalculate margins and equity using current open positions
          const openPositions = await PositionModel.find({ userId: pos.userId, status: 'OPEN' });
          await MarginEngine.calculateMargin(pos.userId.toString(), openPositions, prices);
        }

        closedPositions.push(pos);
      }
    }
    return closedPositions;
  }
}
