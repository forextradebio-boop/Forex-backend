import { SymbolSpecification } from './SymbolSpecification';

export class MarginCalculator {
  /**
   * Calculates required margin for an open position.
   * Formula exactly matches MT5 standards: (Price * Contract Size * Volume) / Leverage
   * Note: For cross pairs, this is then converted to the account base currency via usdRate.
   * 

   * @param symbol Symbol string (e.g., 'EURUSD')
   * @param volume Lot size
   * @param price Current market price (Mid price or specific Bid/Ask depending on execution)
   * @param leverage Account or Symbol leverage
   * @param usdRate Conversion rate to USD if margin is calculated in a foreign quote currency
   */
  static calculate(
    symbol: string,
    volume: number,
    price: number,
    leverage: number,
    usdRate: number = 1
  ): number {
    const spec = SymbolSpecification.getSync(symbol);
    const contractSize = spec.contractSize || 100000;

    const rawMargin = (price * contractSize * volume) / leverage;
    
    // Applying USD conversion rate if necessary.
    // For many pairs (like EURUSD, GBPUSD), calculating Margin = Price * ContractSize * Volume / Leverage
    // gives the margin directly in USD.
    return rawMargin * usdRate;
  }
}
