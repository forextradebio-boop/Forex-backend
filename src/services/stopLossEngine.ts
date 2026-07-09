import { WalletModel } from '../models/Wallet';
import { PositionModel } from '../models/Position';
import { MarginEngine } from './marginEngine';
import { TradeUtils } from './tradeUtils';
import { ProfitCalculator } from '../engine/ProfitCalculator';

export class StopLossEngine {
  static async evaluatePositions(positions: any[], prices: Record<string, any>) {
    const closedPositions = [];

    // Pre-fetch all symbols for accurate contract sizes
    const { SymbolModel } = await import('../models/Symbol');
    const allSymbols = await SymbolModel.find({});
    const symbolMap = allSymbols.reduce((acc, s) => { acc[s.symbol] = s; return acc; }, {} as Record<string, any>);

    for (const pos of positions) {
      if (pos.status !== 'OPEN') continue;

      const symSpec = symbolMap[pos.symbol.toUpperCase()];
      const contractSize = symSpec ? symSpec.contractSize : 100000;

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
          // Credit PNL to wallet balance and then recalculate margins and equity
          const wallet = await WalletModel.findOne({ userId: pos.userId });
          if (wallet) {
            wallet.balance += pnl;
            await wallet.save();
            // Recalculate margins and equity using current open positions
            const openPositions = await PositionModel.find({ userId: pos.userId, status: 'OPEN' });
            await MarginEngine.calculateMargin(pos.userId.toString(), openPositions, prices);
          }
          closedPositions.push(updatedPos);
        }
      }
    }
    return closedPositions;
  }
}
