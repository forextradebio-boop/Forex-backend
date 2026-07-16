export type MarketCategory = 'FOREX' | 'CRYPTO' | 'METALS' | 'INDICES' | 'UNKNOWN';

interface SymbolDefinition {
  providerSymbol: string;
  category: MarketCategory;
  displaySymbol: string;
}

const SUPPORTED_SYMBOLS: Record<string, SymbolDefinition> = {
  EURUSD: { providerSymbol: 'EURUSD=X', category: 'FOREX', displaySymbol: 'EUR/USD' },
  GBPUSD: { providerSymbol: 'GBPUSD=X', category: 'FOREX', displaySymbol: 'GBP/USD' },
  USDJPY: { providerSymbol: 'USDJPY=X', category: 'FOREX', displaySymbol: 'USD/JPY' },
  AUDUSD: { providerSymbol: 'AUDUSD=X', category: 'FOREX', displaySymbol: 'AUD/USD' },
  USDCAD: { providerSymbol: 'USDCAD=X', category: 'FOREX', displaySymbol: 'USD/CAD' },
  USDCHF: { providerSymbol: 'USDCHF=X', category: 'FOREX', displaySymbol: 'USD/CHF' },
  NZDUSD: { providerSymbol: 'NZDUSD=X', category: 'FOREX', displaySymbol: 'NZD/USD' },
  EURJPY: { providerSymbol: 'EURJPY=X', category: 'FOREX', displaySymbol: 'EUR/JPY' },
  EURGBP: { providerSymbol: 'EURGBP=X', category: 'FOREX', displaySymbol: 'EUR/GBP' },
  GBPJPY: { providerSymbol: 'GBPJPY=X', category: 'FOREX', displaySymbol: 'GBP/JPY' },
  XAUUSD: { providerSymbol: 'GC=F', category: 'METALS', displaySymbol: 'XAU/USD' },
  XAGUSD: { providerSymbol: 'SI=F', category: 'METALS', displaySymbol: 'XAG/USD' },
  BTCUSD: { providerSymbol: 'BTC-USD', category: 'CRYPTO', displaySymbol: 'BTC/USD' },
  ETHUSD: { providerSymbol: 'ETH-USD', category: 'CRYPTO', displaySymbol: 'ETH/USD' },
  SPX500: { providerSymbol: '^GSPC', category: 'INDICES', displaySymbol: 'SPX 500' },
  NAS100: { providerSymbol: '^NDX', category: 'INDICES', displaySymbol: 'NAS 100' },
  GER40: { providerSymbol: '^GDAXI', category: 'INDICES', displaySymbol: 'GER 40' },
  USOIL: { providerSymbol: 'CL=F', category: 'METALS', displaySymbol: 'USOIL' },
};

export class SymbolMapper {
  static normalizeSymbol(symbol: string): string {
    return (symbol || '')
      .replace(/[/\-\s]+/g, '')
      .toUpperCase();
  }

  static getProviderSymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    const definition = SUPPORTED_SYMBOLS[normalized];

    if (!definition) {
      throw new Error(`Unsupported market symbol: ${symbol}`);
    }

    return definition.providerSymbol;
  }

  static getDisplaySymbol(symbol: string): string {
    const normalized = this.normalizeSymbol(symbol);
    return SUPPORTED_SYMBOLS[normalized]?.displaySymbol || normalized;
  }

  static getCategory(symbol: string): MarketCategory {
    const normalized = this.normalizeSymbol(symbol);
    return SUPPORTED_SYMBOLS[normalized]?.category || 'UNKNOWN';
  }

  static getAllSymbols(): string[] {
    return Object.keys(SUPPORTED_SYMBOLS);
  }
}
