import { PositionModel } from '../models/Position';
import { WalletModel } from '../models/Wallet';
import { NotificationModel } from '../models/Notification';
import { SocketServer } from './socketServer';
import { ProfitCalculator } from '../engine/ProfitCalculator';

export class RiskEngine {
  static async evaluateRisk(userId: string, currentPrices: Record<string, any>) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return;

    const marginLevel = wallet.marginLevel ?? 0;

    // Check margin call
    if (marginLevel > 0 && marginLevel < 50) {
      // Margin Call
      await NotificationModel.create({
        userId,
        title: 'Margin Call',
        message: 'Your margin level is dangerously low. Please deposit funds.',
        type: 'WARNING'
      });
    }

    // Check auto liquidation (margin level < 20%)
    if (marginLevel > 0 && marginLevel < 20) {
      // Pre-fetch all symbols for accurate contract sizes
      const { SymbolModel } = await import('../models/Symbol');
      const allSymbols = await SymbolModel.find({});
      const symbolMap = allSymbols.reduce((acc, s) => { acc[s.symbol] = s; return acc; }, {} as Record<string, any>);
      const { TradeUtils } = await import('./tradeUtils');

      // Auto liquidate all open positions
      const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
      for (const pos of openPositions) {
        const symSpec = symbolMap[pos.symbol.toUpperCase()];
        const contractSize = symSpec ? symSpec.contractSize : 100000;

        pos.status = 'CLOSED';
        const currentPriceObj = currentPrices[pos.symbol];
        const currentBid = currentPriceObj ? currentPriceObj.bid : pos.openPrice;
        const currentAsk = currentPriceObj ? currentPriceObj.ask : pos.openPrice;
        
        let closePrice = 0;
        if (pos.type === 'BUY') {
          closePrice = currentBid;
        } else {
          closePrice = currentAsk;
        }
        
        pos.closePrice = closePrice;
        
        const pnl = ProfitCalculator.calculate(
          pos.type,
          pos.openPrice,
          closePrice,
          closePrice,
          pos.volume,
          pos.symbol
        );
        
        // ONLY update if it's still OPEN in the database to prevent double-close exploits!
        const updatedPos = await PositionModel.findOneAndUpdate(
          { _id: pos._id, status: 'OPEN' },
          { $set: { status: 'CLOSED', closePrice, pnl } },
          { new: true }
        );

        if (updatedPos) {
          wallet.balance += pnl;
        }
      }
      wallet.usedMargin = 0;
      wallet.freeMargin = wallet.balance;
      wallet.equity = wallet.balance;
      wallet.marginLevel = 0;
      await wallet.save();

      await NotificationModel.create({
        userId,
        title: 'Account Liquidated',
        message: 'Your positions have been automatically closed due to insufficient margin.',
        type: 'CRITICAL'
      });

      // Broadcast update
      SocketServer.broadcastWalletUpdate(userId, wallet);
      SocketServer.broadcastPnlUpdate(userId, []);
    }
  }
}
