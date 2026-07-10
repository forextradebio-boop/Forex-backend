import { WalletModel } from '../models/Wallet';
import { SymbolModel } from '../models/Symbol';
import { TradeUtils } from './tradeUtils';
import { TradingEngine } from '../engine/TradingEngine';
import { MarginCalculator } from '../engine/MarginCalculator';
import { SymbolSpecification } from '../engine/SymbolSpecification';

export class MarginEngine {
  static async calculateMargin(userId: string, positions: any[], prices: Record<string, any>) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return null;


    const result = TradingEngine.evaluateWallet(wallet.balance, positions, prices);

    for (const pos of positions) {
      if (pos.status === 'OPEN') {
        await import('../models/Position').then(({ PositionModel }) => {
          PositionModel.updateOne(
            { _id: pos._id, status: 'OPEN' }, 
            { $set: { pnl: pos.pnl, marginUsed: pos.marginUsed, currentPrice: pos.currentPrice } }
          ).exec();
        });
      }
    }

    wallet.equity = result.equity;
    wallet.margin = result.usedMargin;
    wallet.usedMargin = result.usedMargin;
    wallet.freeMargin = result.freeMargin;
    wallet.marginLevel = result.marginLevel === Infinity ? 0 : result.marginLevel;
    wallet.pnl = result.totalPnl;

    await wallet.save();
    return wallet;
  }

  static async validateMarginForTrade(userId: string, symbol: string, price: number, volume: number) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return { ok: false, reason: 'WALLET_NOT_FOUND' };
    if (wallet.status !== 'ACTIVE') return { ok: false, reason: 'WALLET_INACTIVE' };



    const spec = SymbolSpecification.getSync(symbol);
    const leverage = spec.leverageLimit || 100;
    let usdRate = 1;
    const sym = spec.symbol.toUpperCase();
    if (!sym.endsWith('USD') && !sym.startsWith('USD')) {
      const quoteCurrency = sym.substring(3);
      if (quoteCurrency === 'JPY') {
        const { MarketService } = await import('./market.service');
        const crossQuote = await MarketService.getQuote('USDJPY');
        if (crossQuote && crossQuote.price > 0) usdRate = 1 / crossQuote.price;
      } else if (quoteCurrency === 'GBP') {
        const { MarketService } = await import('./market.service');
        const crossQuote = await MarketService.getQuote('GBPUSD');
        if (crossQuote && crossQuote.price > 0) usdRate = crossQuote.price;
      }
    } else if (sym.startsWith('USD') && sym !== 'USDUSD') {
      const currentMid = price;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }

    const required = MarginCalculator.calculate(symbol, volume, price, leverage, usdRate);
    const free = Number(wallet.freeMargin ?? 0);
    const balance = Number(wallet.balance ?? 0);

    if (required > free) {
      return { ok: false, reason: 'INSUFFICIENT_FREE_MARGIN' };
    }

    return { ok: true, required, free, balance };
  }
}
