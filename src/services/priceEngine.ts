import { MarketDataService } from './marketDataService';
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
  private static symbols = ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA', 'EURUSD']; // Add more as needed

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('PriceEngine started');
    
    setInterval(async () => {
      try {
        await this.updateTick();
      } catch (err) {
        console.error('PriceEngine tick error', err);
      }
    }, 1000);
  }

  private static async updateTick() {
    // 1. Fetch live prices
    const newPrices = await MarketDataService.getQuotes(this.symbols);
    this.currentPrices = { ...this.currentPrices, ...newPrices };

    // 2. Broadcast prices
    SocketServer.broadcastPrices(
      Object.keys(this.currentPrices).map(sym => ({
        symbol: sym,
        ...this.currentPrices[sym]
      }))
    );

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
