import { PositionModel } from '../models/Position';
import { WalletModel } from '../models/Wallet';
import { NotificationModel } from '../models/Notification';
import { SocketServer } from './socketServer';

export class RiskEngine {
  static async evaluateRisk(userId: string, currentPrices: Record<string, any>) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return;

    // Check margin call
    if (wallet.marginLevel > 0 && wallet.marginLevel < 50) {
      // Margin Call
      await NotificationModel.create({
        userId,
        title: 'Margin Call',
        message: 'Your margin level is dangerously low. Please deposit funds.',
        type: 'WARNING'
      });
    }

    // Check auto liquidation (margin level < 20%)
    if (wallet.marginLevel > 0 && wallet.marginLevel < 20) {
      // Auto liquidate all open positions
      const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
      for (const pos of openPositions) {
        pos.status = 'CLOSED';
        const currentPriceObj = currentPrices[pos.symbol];
        const currentPrice = currentPriceObj ? currentPriceObj.price : pos.currentPrice || pos.openPrice;
        pos.closePrice = currentPrice;
        
        let pnl = 0;
        if (pos.type === 'BUY') pnl = (currentPrice - pos.openPrice) * pos.volume;
        else pnl = (pos.openPrice - currentPrice) * pos.volume;
        
        pos.pnl = pnl;
        await pos.save();

        wallet.balance += pnl;
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
