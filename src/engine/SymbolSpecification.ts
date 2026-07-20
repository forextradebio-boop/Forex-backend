import { SymbolModel, ISymbol } from '../models/Symbol';

export class SymbolSpecification {
  private static cache: Map<string, ISymbol> = new Map();

  /**
   * Initializes or refreshes the symbol specifications from the database
   */
  static async loadAll(): Promise<void> {
    try {
      const symbols = await SymbolModel.find({});
      this.cache.clear();
      for (const sym of symbols) {
        this.cache.set(sym.symbol.toUpperCase(), sym);
      }
    } catch (err) {
      console.error('[SymbolSpecification] Error loading symbols:', err);
    }
  }

  /**
   * Retrieves the specification for a symbol, providing strict MT5 defaults if missing.
   */
  static async get(symbol: string): Promise<ISymbol | Partial<ISymbol>> {
    const sym = symbol.toUpperCase();
    if (this.cache.has(sym)) {
      const dbSym = this.cache.get(sym)!;
      return this.applyLeverageOverrides(dbSym);
    }
    
    // Attempt lazy load if not in cache
    try {
      const dbSym = await SymbolModel.findOne({ symbol: sym });
      if (dbSym) {
        this.cache.set(sym, dbSym);
        return this.applyLeverageOverrides(dbSym);
      }
    } catch (err) {
      console.warn(`[SymbolSpecification] DB error loading ${sym}:`, err);
    }

    console.warn(`[SymbolSpecification] Symbol ${sym} not found in DB. Using fallback defaults.`);
    return this.getDefaults(sym);
  }

  /**
   * Synchronous getter if you are 100% sure the cache is hot.
   */
  static getSync(symbol: string): ISymbol | Partial<ISymbol> {
    const sym = symbol.toUpperCase();
    if (this.cache.has(sym)) {
      const dbSym = this.cache.get(sym)!;
      return this.applyLeverageOverrides(dbSym);
    }
    return this.getDefaults(sym);
  }

  private static applyLeverageOverrides(symInfo: ISymbol | Partial<ISymbol>): ISymbol | Partial<ISymbol> {
    const sym = symInfo.symbol?.toUpperCase();
    if (!sym) return symInfo;
    
    // If it's using the old 100 default, upgrade it for MT5 standards
    if (symInfo.leverageLimit === 100) {
      if (sym.startsWith('XAU') || sym.startsWith('XAG')) {
        symInfo.leverageLimit = 500;
      } else if (!sym.includes('BTC') && !sym.includes('ETH') && !sym.includes('US30') && !sym.includes('NAS100') && !sym.includes('SPX500')) {
        symInfo.leverageLimit = 500; // Standard Forex
      }
    }
    return symInfo;
  }

  private static getDefaults(symbol: string): Partial<ISymbol> {
    const sym = symbol.toUpperCase();
    let contractSize = 100000;
    let digits = 5;
    let leverageLimit = 500;
    
    if (sym.startsWith('XAU')) {
      contractSize = 100;
      digits = 3;
      leverageLimit = 500;
    } else if (sym.startsWith('XAG')) {
      contractSize = 5000;
      digits = 3;
      leverageLimit = 500;
    } else if (['BTCUSD', 'ETHUSD'].includes(sym)) {
      contractSize = 1;
      digits = 2;
      leverageLimit = 100;
    } else if (['US30', 'NAS100', 'SPX500'].includes(sym)) {
      contractSize = 10;
      digits = 2;
      leverageLimit = 100;
    } else if (sym.includes('JPY')) {
      contractSize = 100000;
      digits = 3;
      leverageLimit = 500;
    } else if (sym === 'USOIL') {
      contractSize = 100;
      digits = 2;
      leverageLimit = 200;
    }

    const tickSize = Math.pow(10, -digits);
    const tickValue = tickSize * contractSize;

    return {
      symbol: sym,
      contractSize,
      digits,
      tickSize,
      tickValue,
      minLot: 0.01,
      maxLot: 100,
      lotStep: 0.01,
      leverageLimit,
      spread: 1,
      status: 'OPEN',
      tradingEnabled: true
    };
  }
}
