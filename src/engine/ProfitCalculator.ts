import { ISymbol } from '../models/Symbol';
import { SymbolSpecification } from './SymbolSpecification';

export class ProfitCalculator {
  /**
   * Calculates floating or realized profit strictly matching MT5 standards.
   * 
   * BUY:  (Bid - Entry) * ContractSize * LotSize
   * SELL: (Entry - Ask) * ContractSize * LotSize
   * 
   * @param side 'BUY' | 'SELL'
   * @param entryPrice The open price of the position
   * @param currentBid The live Bid price
   * @param currentAsk The live Ask price
   * @param volume Lot size
   * @param symbol Symbol string (e.g., 'EURUSD')
   * @param usdRate Conversion rate to USD if the quote currency is not USD
   */
  static calculate(
    side: 'BUY' | 'SELL',
    entryPrice: number,
    currentBid: number,
    currentAsk: number,
    volume: number,
    symbol: string,
    usdRate: number = 1
  ): number {
    const spec = SymbolSpecification.getSync(symbol);
    const contractSize = spec.contractSize || 100000;

    let rawProfit = 0;
    
    if (side === 'BUY') {
      rawProfit = (currentBid - entryPrice) * contractSize * volume;
    } else {
      rawProfit = (entryPrice - currentAsk) * contractSize * volume;
    }

    // Apply USD conversion if the quote currency requires it
    return rawProfit * usdRate;
  }
}
