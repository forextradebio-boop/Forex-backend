import { MarketService } from './market.service';
import { SocketServer } from './socketServer';
import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { MarginEngine } from './marginEngine';
import { StopLossEngine } from './stopLossEngine';
import { OrderExecutionEngine } from './orderExecutionEngine';
import { WalletModel } from '../models/Wallet';

export class PriceEngine {
  private static isRunning = false;
  private static currentPrices: Record<string, any> = {};
  private static symbols = MarketService.getWatchSymbols();

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('PriceEngine started');

    void this.updateTick();

    setInterval(async () => {
      try {
        await this.updateTick();
      } catch (err) {
        console.error('PriceEngine tick error', err);
      }
    }, 1000);
  }

  private static async updateTick() {
    const newPrices = await MarketService.getQuotes(this.symbols);
    const changedQuotes = Object.entries(newPrices)
      .filter(([symbol, quote]) => {
        const previous = this.currentPrices[symbol];
        if (!previous) return true;

        return (
          previous.price !== quote.price ||
          previous.bid !== quote.bid ||
          previous.ask !== quote.ask ||
          previous.high !== quote.high ||
          previous.low !== quote.low ||
          previous.open !== quote.open
        );
      })
      .map(([symbol, quote]) => ({ symbol, ...quote }));

    this.currentPrices = { ...this.currentPrices, ...newPrices };

    if (changedQuotes.length > 0) {
      SocketServer.broadcastMarketUpdate(changedQuotes);
      SocketServer.broadcastPrices(
        Object.keys(this.currentPrices).map((sym) => ({
          symbol: sym,
          ...this.currentPrices[sym],
        }))
      );
    }

    // 3. Update PNL, StopLoss, Orders for all users
    const openPositions = await PositionModel.find({ status: 'OPEN' });
    const pendingOrders = await OrderModel.find({ status: 'PENDING' });

    // Group by user for efficient wallet updates
    const positionsByUser = this.groupByUser(openPositions);
    
    for (const userId of Object.keys(positionsByUser)) {
      const userPositions = positionsByUser[userId];
      
      // Stop Loss & Take Profit Engine
      const closedPos = await StopLossEngine.evaluatePositions(userPositions, this.currentPrices);
      
      // Margin Engine & PNL recalculation
      const wallet = await MarginEngine.calculateMargin(userId, userPositions, this.currentPrices);
      
      // Broadcast user specific updates
      SocketServer.broadcastPnlUpdate(userId, userPositions);
      if (wallet) {
        SocketServer.broadcastWalletUpdate(userId, wallet);
      }
    }

    // Order Execution Engine
    await OrderExecutionEngine.evaluateOrders(pendingOrders, this.currentPrices);
  }

  private static groupByUser(items: any[]) {
    return items.reduce((acc, item) => {
      const uid = item.userId.toString();
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(item);
      return acc;
    }, {});
  }
}
