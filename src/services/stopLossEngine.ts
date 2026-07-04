import { WalletModel } from '../models/Wallet';
import { PositionModel } from '../models/Position';

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
        
        let pnl = 0;
        if (pos.type === 'BUY') {
          pnl = (currentPrice - pos.openPrice) * pos.volume;
        } else if (pos.type === 'SELL') {
          pnl = (pos.openPrice - currentPrice) * pos.volume;
        }
        pos.pnl = pnl;
        
        await pos.save();

        const wallet = await WalletModel.findOne({ userId: pos.userId });
        if (wallet) {
          wallet.balance += pnl;
          await wallet.save();
        }

        closedPositions.push(pos);
      }
    }
    return closedPositions;
  }
}
