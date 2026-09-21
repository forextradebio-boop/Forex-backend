import { WalletModel } from '../models/Wallet';
import { PositionModel } from '../models/Position';
import { MarginEngine } from './marginEngine';
import { TradeUtils } from './tradeUtils';
import { ProfitCalculator } from '../engine/ProfitCalculator';
import { SymbolSpecification } from '../engine/SymbolSpecification';

export class StopLossEngine {
  static async evaluatePositions(positions: any[], prices: Record<string, any>) {
    const closedPositions = [];


    for (const pos of positions) {
      if (pos.status !== 'OPEN') continue;



      const currentPriceObj = prices[pos.symbol];
      if (!currentPriceObj) continue;
      
      const currentBid = currentPriceObj.bid;
      const currentAsk = currentPriceObj.ask;
      let shouldClose = false;
      let closePrice = 0;

      if (pos.type === 'BUY') {
        // Closing a BUY means SELLING at Bid
        if (pos.sl && currentBid <= pos.sl) { shouldClose = true; closePrice = currentBid; }
        if (pos.tp && currentBid >= pos.tp) { shouldClose = true; closePrice = currentBid; }
      } else if (pos.type === 'SELL') {
        // Closing a SELL means BUYING at Ask
        if (pos.sl && currentAsk >= pos.sl) { shouldClose = true; closePrice = currentAsk; }
        if (pos.tp && currentAsk <= pos.tp) { shouldClose = true; closePrice = currentAsk; }
      }

      if (shouldClose) {
        const pnl = ProfitCalculator.calculate(
          pos.type,
          pos.openPrice,
          closePrice,
          closePrice,
          pos.volume,
          pos.symbol
        );
        
        // ONLY update if it's still OPEN in the database to prevent double-close exploits!
        const { PositionModel } = await import('../models/Position');
        const updatedPos = await PositionModel.findOneAndUpdate(
          { _id: pos._id, status: 'OPEN' },
          { $set: { status: 'CLOSED', closePrice, pnl } },
          { new: true }
        );

        if (updatedPos) {
          // Credit PNL to wallet balance via atomic increment
          await WalletModel.findOneAndUpdate(
            { userId: pos.userId },
            { $inc: { balance: pnl } }
          );
          closedPositions.push(updatedPos);
        }
      }
    }
    return closedPositions;
  }
}
