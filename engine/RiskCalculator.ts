export class RiskCalculator {
  /**
   * Evaluates the margin level to determine if a stop out or margin call is triggered.
   * Standard values are often 100% for Margin Call, 50% for Stop Out.
   * 
   * @param marginLevel The current Margin Level %
   * @param stopOutLevel The threshold for Stop Out (default 50%)
   * @param marginCallLevel The threshold for Margin Call (default 100%)
   * @returns 'STOP_OUT' | 'MARGIN_CALL' | 'SAFE'
   */
  static evaluateRisk(
    marginLevel: number,
    stopOutLevel: number = 50,
    marginCallLevel: number = 100
  ): 'STOP_OUT' | 'MARGIN_CALL' | 'SAFE' {
    if (marginLevel <= stopOutLevel) {
      return 'STOP_OUT';
    }
    if (marginLevel <= marginCallLevel) {
      return 'MARGIN_CALL';
    }
    return 'SAFE';
  }
}
