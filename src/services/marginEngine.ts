import { WalletModel } from '../models/Wallet';
import { SymbolModel } from '../models/Symbol';
import { TradeUtils } from './tradeUtils';

export class MarginEngine {
  static async calculateMargin(userId: string, positions: any[], prices: Record<string, any>) {
    let usedMargin = 0;
    let totalPnl = 0;

    for (const pos of positions) {
      if (pos.status !== 'OPEN') continue;

      const currentPriceObj = prices[pos.symbol];
      const currentPrice = currentPriceObj ? currentPriceObj.price : pos.currentPrice || pos.openPrice;
      
      // Calculate PNL based on direction and symbol contract size
      const pnl = TradeUtils.calculatePnl(pos.type, pos.openPrice, currentPrice, pos.volume, pos.symbol, prices);
      
      // Update position continuously
      pos.currentPrice = currentPrice;
      pos.pnl = pnl;
      totalPnl += pnl;

      // Approximate used margin: (price * volume * contractSize) / leverage
      const leverage = 100;
      const contractSize = TradeUtils.getContractSize(pos.symbol);
      
      // Calculate Margin in USD
      let marginUsd = (currentPrice * pos.volume * contractSize) / leverage;
      if (pos.symbol.startsWith('USD')) marginUsd = marginUsd / currentPrice;
      
      usedMargin += marginUsd;
      
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

  // Compute required margin for a hypothetical trade
  static async computeRequiredMargin(symbol: string, price: number, volume: number) {
    // fetch symbol leverage if available
    let leverage = 100; // default
    try {
      const sym = await SymbolModel.findOne({ symbol: symbol.toUpperCase() });
      if (sym && sym.leverageLimit && Number.isFinite(sym.leverageLimit) && sym.leverageLimit > 0) {
        leverage = sym.leverageLimit;
      }
    } catch (err) {
      // ignore and use default
    }
    const contractSize = TradeUtils.getContractSize(symbol);
    const required = (price * volume * contractSize) / leverage;
    
    // adjust for USD base pairs
    if (symbol.toUpperCase().startsWith('USD')) {
      return Math.max(0, Number((required / price).toFixed(6)));
    }
    
    return Math.max(0, Number((required).toFixed(6)));
  }

  static async validateMarginForTrade(userId: string, symbol: string, price: number, volume: number) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return { ok: false, reason: 'WALLET_NOT_FOUND' };
    if (wallet.status !== 'ACTIVE') return { ok: false, reason: 'WALLET_INACTIVE' };

    const required = await this.computeRequiredMargin(symbol, price, volume);
    const free = Number(wallet.freeMargin ?? 0);
    const balance = Number(wallet.balance ?? 0);

    if (balance <= 0) return { ok: false, reason: 'INSUFFICIENT_BALANCE' };
    if (required > free) return { ok: false, reason: 'INSUFFICIENT_FREE_MARGIN' };
    if (required > balance) return { ok: false, reason: 'REQUIRED_EXCEEDS_BALANCE' };

    return { ok: true, required, free, balance };
  }
}
