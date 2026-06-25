import { WalletModel } from '../models/Wallet';

export class MarginEngine {
  static async calculateMargin(userId: string, positions: any[], prices: Record<string, any>) {
    let usedMargin = 0;
    let totalPnl = 0;

    for (const pos of positions) {
      if (pos.status !== 'OPEN') continue;

      const currentPriceObj = prices[pos.symbol];
      const currentPrice = currentPriceObj ? currentPriceObj.price : pos.currentPrice || pos.openPrice;
      
      // Calculate PNL based on direction
      let pnl = 0;
      if (pos.type === 'BUY') {
        pnl = (currentPrice - pos.openPrice) * pos.volume;
      } else if (pos.type === 'SELL') {
        pnl = (pos.openPrice - currentPrice) * pos.volume;
      }
      
      // Update position continuously
      pos.currentPrice = currentPrice;
      pos.pnl = pnl;
      totalPnl += pnl;

      // Approximate used margin: value / leverage (assume 100x leverage for now)
      const leverage = 100;
      usedMargin += (currentPrice * pos.volume) / leverage;
      
      await pos.save();
    }

    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      const equity = wallet.balance + totalPnl;
      wallet.equity = equity;
      wallet.margin = usedMargin;
      wallet.freeMargin = equity - usedMargin;
      wallet.marginLevel = usedMargin > 0 ? (equity / usedMargin) * 100 : 0;
      await wallet.save();
      return wallet;
    }
    return null;
  }
}
