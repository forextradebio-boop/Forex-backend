import { MarketService } from './market.service';
import { SocketServer } from './socketServer';
import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { MarginEngine } from './marginEngine';
import { StopLossEngine } from './stopLossEngine';
import { StopOutEngine } from './stopOutEngine';
import { OrderExecutionEngine } from './orderExecutionEngine';

import { MarketSettingsModel } from '../models/MarketSettings';

export class PriceEngine {
  private static isRunning = false;
  private static currentPrices: Record<string, any> = {};
  private static marketSettingsCache: any = { status: 'OPEN' };

  public static metrics = {
    priceEngineRuns: 0,
    marketChangesProcessed: 0,
    affectedUsersProcessed: 0,
    positionQueries: 0,
    orderQueries: 0,
  };

  private static isProcessingTick = false;
  private static pendingTick = false;
  private static processingTimeout: NodeJS.Timeout | null = null;
  private static readonly BATCH_DELAY_MS = Number(process.env.PRICE_ENGINE_BATCH_DELAY_MS) || 50;
  
  // In-memory cache for open positions and orders to prevent querying MongoDB every 50ms
  private static activePositionsCache: any[] = [];
  private static pendingOrdersCache: any[] = [];
  private static cacheLastUpdated: number = 0;
  private static readonly CACHE_TTL_MS = 1000; // Update cache every 1 second

  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('PriceEngine started (Event-driven with in-memory caching)');

    // Cache market settings every 5 seconds
    setInterval(async () => {
      try {
        const settings = await MarketSettingsModel.findOne();
        if (settings) {
          this.marketSettingsCache = settings;
        }
      } catch (err) {
        console.error('Error fetching market settings', err);
      }
    }, 5000);
    
    // Background task to refresh positions and orders cache
    setInterval(async () => {
      await this.refreshCache();
    }, this.CACHE_TTL_MS);
  }

  private static async refreshCache() {
    try {
      this.metrics.positionQueries++;
      this.activePositionsCache = await PositionModel.find({ status: 'OPEN' }).lean();
      
      this.metrics.orderQueries++;
      this.pendingOrdersCache = await OrderModel.find({ status: 'PENDING' }).lean();
      
      this.cacheLastUpdated = Date.now();
    } catch (err) {
      console.error('[PriceEngine] Error refreshing positions/orders cache:', err);
    }
  }

  static scheduleProcessing() {
    if (this.isProcessingTick) {
      this.pendingTick = true;
      return;
    }

    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }

    this.processingTimeout = setTimeout(async () => {
      this.processingTimeout = null;
      await this.runTickLoop();
    }, this.BATCH_DELAY_MS);
  }

  private static async runTickLoop() {
    this.isProcessingTick = true;
    this.pendingTick = false;
    
    try {
      if (this.marketSettingsCache?.status !== 'CLOSED') {
        await this.updateTick();
      }
    } catch (err) {
      console.error('PriceEngine tick error', err);
    } finally {
      this.isProcessingTick = false;
      if (this.pendingTick) {
        // Use a 0ms timeout to clear the stack and yield to event loop before starting next tick
        setTimeout(() => this.scheduleProcessing(), 0);
      }
    }
  }

  private static async updateTick() {
    const changedQuotes = MarketService.consumeDirtyQuotes();

    if (changedQuotes.length === 0) {
      return;
    }
    
    this.metrics.priceEngineRuns++;
    this.metrics.marketChangesProcessed += changedQuotes.length;

    // Update currentPrices with the exact provider quotes
    for (const quote of changedQuotes) {
      this.currentPrices[quote.symbol] = quote;
    }

    SocketServer.broadcastMarketUpdate(changedQuotes);
    SocketServer.broadcastPrices(changedQuotes);

    const changedSymbolNames = new Set(changedQuotes.map((q: any) => q.symbol));

    // Force an initial cache load if empty
    if (this.cacheLastUpdated === 0) {
      await this.refreshCache();
    }

    // Identify affected users directly from cache based on the changed symbols
    const affectedUserIds = new Set<string>();
    
    // Filter active positions related to changed symbols, but we also need ALL open positions for those affected users for margin calculations
    for (const pos of this.activePositionsCache) {
      if (changedSymbolNames.has(pos.symbol)) {
        affectedUserIds.add(pos.userId.toString());
      }
    }

    const currentAffectedUsers = Array.from(affectedUserIds);
    
    // Get ALL positions for the affected users from the cache
    const openPositions = this.activePositionsCache.filter((pos) => affectedUserIds.has(pos.userId.toString()));
    
    // Get pending orders that match the changed symbols
    const pendingOrders = this.pendingOrdersCache.filter((order) => changedSymbolNames.has(order.symbol));

    // Group by user for efficient wallet updates
    const positionsByUser = this.groupByUser(openPositions);
    
    this.metrics.affectedUsersProcessed += currentAffectedUsers.length;

    const concurrencyLimit = Number(process.env.PRICE_ENGINE_USER_CONCURRENCY) || 50;

    for (let i = 0; i < currentAffectedUsers.length; i += concurrencyLimit) {
      const chunk = currentAffectedUsers.slice(i, i + concurrencyLimit);
      
      await Promise.all(chunk.map(async (userId) => {
        try {
          let activePositions = positionsByUser[userId] || [];

          // Stop Loss & Take Profit Engine
          const closedBySl = await StopLossEngine.evaluatePositions(activePositions, this.currentPrices);
          if (closedBySl && closedBySl.length > 0) {
            const closedIds = closedBySl.map((p: any) => p._id.toString());
            activePositions = activePositions.filter((p: any) => !closedIds.includes(p._id.toString()));
            // We should ideally trigger a cache refresh here, but it will be picked up on the next second
            // For immediate effect in the loop, we've filtered the activePositions
          }

          // Margin Engine & PNL recalculation
          let wallet = await MarginEngine.calculateMargin(userId, activePositions, this.currentPrices);

          // Stop Out Engine
          if (wallet) {
            const stopOutResult = await StopOutEngine.evaluateStopOut(userId, wallet, activePositions, this.currentPrices);
            if (stopOutResult && stopOutResult.closedPosition) {
              activePositions = activePositions.filter((p: any) => p._id.toString() !== (stopOutResult.closedPosition as any)._id.toString());
              
              // Recalculate margin/equity using the post-stop-out position list
              wallet = await MarginEngine.calculateMargin(userId, activePositions, this.currentPrices);
            }
          }

          // Broadcast user specific updates
          SocketServer.broadcastPnlUpdate(userId, activePositions);
          if (wallet) {
            SocketServer.broadcastWalletUpdate(userId, wallet);
          }
        } catch (error) {
          console.error(`[PriceEngine] Error processing user ${userId}:`, error);
        }
      }));
    }

    // Order Execution Engine
    if (pendingOrders.length > 0) {
      await OrderExecutionEngine.evaluateOrders(pendingOrders, this.currentPrices);
    }
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
