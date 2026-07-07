import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { WalletModel } from '../models/Wallet';
import { UserModel } from '../models/User';
import { SymbolModel } from '../models/Symbol';
import { MarketService } from './market.service';
import { MarginEngine } from './marginEngine';
import { NotificationModel } from '../models/Notification';
import { AuditLogModel } from '../models/AuditLog';

export class OrderExecutionEngine {
  static async evaluateOrders(orders: any[], prices: Record<string, any>) {
    const executedOrders = [];

    for (const order of orders) {
      if (order.status !== 'PENDING') continue;

      const currentPriceObj = prices[order.symbol];
      if (!currentPriceObj) continue;
      
      const currentPrice = currentPriceObj.price;
      let shouldExecute = false;

      if (order.type === 'BUY_LIMIT' && currentPrice <= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === 'SELL_LIMIT' && currentPrice >= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === 'BUY_STOP' && currentPrice >= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === 'SELL_STOP' && currentPrice <= order.targetPrice) {
        shouldExecute = true;
      }

      if (shouldExecute) {
        // Pre-execution validations similar to live trades
        const user = await UserModel.findById(order.userId);
        if (!user || user.status !== 'ACTIVE') {
          order.status = 'CANCELLED';
          await order.save();
          await AuditLogModel.create({ action: 'ORDER_CANCELLED', details: { orderId: order._id, reason: 'USER_INACTIVE' } });
          continue;
        }

        const wallet = await WalletModel.findOne({ userId: order.userId });
        if (!wallet || wallet.status !== 'ACTIVE') {
          order.status = 'CANCELLED';
          await order.save();
          await AuditLogModel.create({ action: 'ORDER_CANCELLED', details: { orderId: order._id, reason: 'WALLET_INVALID' } });
          continue;
        }

        const sym = await SymbolModel.findOne({ symbol: order.symbol.toUpperCase() });
        if (!sym || !sym.isActive) {
          order.status = 'CANCELLED';
          await order.save();
          await AuditLogModel.create({ action: 'ORDER_CANCELLED', details: { orderId: order._id, reason: 'SYMBOL_INACTIVE' } });
          continue;
        }

        const quote = await MarketService.getQuote(order.symbol);
        if (!quote || quote.marketStatus !== 'OPEN') {
          // keep pending if market closed or data unavailable
          continue;
        }

        const marginCheck = await MarginEngine.validateMarginForTrade(order.userId.toString(), sym.symbol, currentPrice, order.volume);
        if (!marginCheck.ok) {
          order.status = 'CANCELLED';
          await order.save();
          await NotificationModel.create({ userId: order.userId, title: 'Order Cancelled', message: 'Order cancelled due to insufficient margin or wallet.', type: 'ERROR' });
          await AuditLogModel.create({ action: 'ORDER_CANCELLED', details: { orderId: order._id, reason: marginCheck.reason } });
          continue;
        }

        // Execute order
        order.status = 'EXECUTED';
        await order.save();

        const newPos = await PositionModel.create({
          userId: order.userId,
          symbol: order.symbol,
          type: order.type.startsWith('BUY') ? 'BUY' : 'SELL',
          volume: order.volume,
          openPrice: currentPrice,
          currentPrice: currentPrice,
          sl: order.sl,
          tp: order.tp,
          pnl: 0,
          status: 'OPEN'
        });

        executedOrders.push(newPos);
      }
    }
    return executedOrders;
  }
}
