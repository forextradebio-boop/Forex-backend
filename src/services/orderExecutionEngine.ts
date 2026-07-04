import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';

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
