export class AccountCalculator {
  /**
   * Calculates live account Equity.
   * Equity = Balance + Floating Profit - Commission - Swap
   */
  static calculateEquity(
    balance: number,
    floatingProfit: number,
    commission: number = 0,
    swap: number = 0
  ): number {
    return balance + floatingProfit - commission - swap;
  }

  /**
   * Calculates Free Margin.
   * Free Margin = Equity - Used Margin
   */
  static calculateFreeMargin(
    equity: number,
    usedMargin: number
  ): number {
    return equity - usedMargin;
  }

  /**
   * Calculates Margin Level percentage.
   * Margin Level = (Equity / Used Margin) * 100
   * 
   * Returns Infinity if usedMargin is 0 (representing "Unlimited").
   */
  static calculateMarginLevel(
    equity: number,
    usedMargin: number
  ): number {
    if (usedMargin <= 0) {
      return Infinity;
    }
    return (equity / usedMargin) * 100;
  }
}
