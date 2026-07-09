import { SymbolSpecification } from './SymbolSpecification';

export class OrderValidator {
  /**
   * Validates if a new order can be placed.
   * Throws an error with a specific message if validation fails.
   */
  static validateNewOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    volume: number,
    marginRequired: number,
    freeMargin: number,
    slPrice?: number,
    tpPrice?: number,
    entryPrice?: number,
    marketEnabled: boolean = true
  ): void {
    if (!marketEnabled) {
      throw new Error('Market is Closed');
    }

    const spec = SymbolSpecification.getSync(symbol);

    if (!spec || !spec.isActive) {
      throw new Error('Disabled Symbol');
    }

    if (volume < spec.minLot! || volume > spec.maxLot!) {
      throw new Error('Invalid Lot');
    }

    // Step validation (e.g. 0.01)
    const lotStep = spec.lotStep || 0.01;
    const precision = Math.max(0, -Math.floor(Math.log10(lotStep)));
    const volumeMod = parseFloat((volume % lotStep).toFixed(precision));
    
    // We allow small floating point inaccuracies (e.g., 0.0000000001)
    if (volumeMod !== 0 && Math.abs(volumeMod - lotStep) > 0.0001) {
      throw new Error('Invalid Lot');
    }

    if (marginRequired > freeMargin) {
      throw new Error('Insufficient Margin');
    }

    if (entryPrice) {
      if (side === 'BUY') {
        if (slPrice && slPrice >= entryPrice) throw new Error('Invalid SL');
        if (tpPrice && tpPrice <= entryPrice) throw new Error('Invalid TP');
      } else {
        if (slPrice && slPrice <= entryPrice) throw new Error('Invalid SL');
        if (tpPrice && tpPrice >= entryPrice) throw new Error('Invalid TP');
      }
    }
  }
}
