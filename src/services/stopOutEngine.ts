import { WalletModel } from '../models/Wallet';
import { PositionModel } from '../models/Position';
import { MarketService } from './market.service';
import { SocketServer } from './socketServer';
import { ProfitCalculator } from '../engine/ProfitCalculator';

export class StopOutEngine {
  // Threshold for margin call / stop out (50%)
  private static STOP_OUT_LEVEL = 50;

  static async evaluateStopOut(userId: string, wallet: any, positions: any[], prices: Record<string, any>) {
    // If the margin level drops below the stop out level, close the worst position
    if (wallet.marginLevel > 0 && wallet.marginLevel < this.STOP_OUT_LEVEL) {
      console.log(`[STOP OUT WARNING] User ${userId} margin level (${wallet.marginLevel.toFixed(2)}%) is below ${this.STOP_OUT_LEVEL}%. Executing Stop Out.`);
      
      const openPositions = positions.filter(p => p.status === 'OPEN');
      if (openPositions.length === 0) return null;

      // Find the position with the lowest PNL (worst losing position)
      openPositions.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
      const worstPosition = openPositions[0];

      try {
        const quote = prices[worstPosition.symbol] || await MarketService.getCachedQuote(worstPosition.symbol);
        if (!quote) return null;

        const closePrice = worstPosition.type === 'BUY' ? quote.bid : quote.ask;
        
        // Re-calculate final exact PNL
        const finalPnl = ProfitCalculator.calculate(
          worstPosition.type,
          worstPosition.openPrice,
          closePrice,
          closePrice,
          worstPosition.volume,
          worstPosition.symbol
        );

        // Close the position
        const updatedPos = await PositionModel.findOneAndUpdate(
          { _id: worstPosition._id, status: 'OPEN' },
          { $set: { status: 'CLOSED', closePrice, pnl: finalPnl } },
          { new: true }
        );

        if (updatedPos) {
          // Adjust wallet balance
          await WalletModel.findOneAndUpdate(
            { userId },
            { $inc: { balance: finalPnl } }
          );

          console.log(`[STOP OUT EXECUTED] Closed position ${updatedPos._id} for user ${userId} with PNL: ${finalPnl}`);
          
          // Emit a specific stop out event if needed
          const io = SocketServer.getIO();
          if (io) {
            io.to(userId.toString()).emit('notification', {
              type: 'ERROR',
              title: 'Stop Out Executed',
              message: `Position ${worstPosition.symbol} was automatically closed due to insufficient margin.`
            });
          }
          return { closedPosition: updatedPos };
        }
      } catch (err) {
        console.error(`[STOP OUT ERROR] Failed to close position ${worstPosition._id}:`, err);
      }
    }
    return null;
  }
}
