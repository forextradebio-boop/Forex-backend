"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/models/Wallet.ts
var Wallet_exports = {};
__export(Wallet_exports, {
  WalletModel: () => WalletModel
});
var import_mongoose3, WalletSchema, roundToTwo, WalletModel;
var init_Wallet = __esm({
  "src/models/Wallet.ts"() {
    "use strict";
    import_mongoose3 = __toESM(require("mongoose"), 1);
    WalletSchema = new import_mongoose3.Schema(
      {
        userId: { type: import_mongoose3.Schema.Types.ObjectId, required: true, ref: "User" },
        balance: { type: Number, default: 0 },
        equity: { type: Number, default: 0 },
        margin: { type: Number, default: 0 },
        freeMargin: { type: Number, default: 0 },
        pnl: { type: Number, default: 0 },
        status: { type: String, enum: ["ACTIVE", "FROZEN"], default: "ACTIVE" },
        usedMargin: { type: Number, default: 0 },
        marginLevel: { type: Number, default: 0 }
      },
      { timestamps: true }
    );
    roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
    WalletSchema.pre("save", async function() {
      this.balance = Math.max(0, roundToTwo(this.balance));
      this.equity = Math.max(0, roundToTwo(this.equity));
      this.margin = Math.max(0, roundToTwo(this.margin));
      this.pnl = roundToTwo(this.pnl);
      this.freeMargin = Math.max(0, roundToTwo(this.equity - this.margin));
    });
    WalletSchema.pre("findOneAndUpdate", async function() {
      const update = this.getUpdate();
      if (update && update.$set) {
        if (update.$set.balance !== void 0) update.$set.balance = Math.max(0, roundToTwo(update.$set.balance));
        if (update.$set.equity !== void 0) update.$set.equity = Math.max(0, roundToTwo(update.$set.equity));
        if (update.$set.margin !== void 0) update.$set.margin = Math.max(0, roundToTwo(update.$set.margin));
        if (update.$set.pnl !== void 0) update.$set.pnl = roundToTwo(update.$set.pnl);
        if (update.$set.equity !== void 0 || update.$set.margin !== void 0) {
        }
        if (update.$set.freeMargin !== void 0) {
          update.$set.freeMargin = Math.max(0, roundToTwo(update.$set.freeMargin));
        }
      }
    });
    WalletModel = import_mongoose3.default.model("Wallet", WalletSchema);
  }
});

// src/providers/rapidApiClient.ts
var import_axios, import_dotenv2, RapidApiClient;
var init_rapidApiClient = __esm({
  "src/providers/rapidApiClient.ts"() {
    "use strict";
    import_axios = __toESM(require("axios"), 1);
    import_dotenv2 = __toESM(require("dotenv"), 1);
    import_dotenv2.default.config({ path: "./.env" });
    RapidApiClient = class _RapidApiClient {
      static instance;
      client;
      baseUrl;
      constructor() {
        const apiKey = process.env.RAPID_API_KEY || process.env.RAPIDAPI_KEY;
        const apiHost = process.env.RAPID_API_HOST || "query1.finance.yahoo.com";
        this.baseUrl = `https://${apiHost}`;
        if (!apiKey) {
          throw new Error("RapidAPI Key is not configured in .env");
        }
        const factory = import_axios.default.create;
        const createdClient = factory ? factory({
          baseURL: this.baseUrl,
          timeout: 1e4,
          headers: {
            "x-rapidapi-host": apiHost,
            "x-rapidapi-key": apiKey,
            "Content-Type": "application/json"
          }
        }) : void 0;
        this.client = createdClient ?? import_axios.default;
      }
      static getInstance() {
        if (!_RapidApiClient.instance) {
          _RapidApiClient.instance = new _RapidApiClient();
        }
        return _RapidApiClient.instance;
      }
      async get(url, config2) {
        let lastError = null;
        const fullUrl = url.startsWith("http") ? url : `${this.baseUrl}${url}`;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const response = await this.client.get(fullUrl, config2);
            return response.data;
          } catch (error) {
            lastError = error;
            const status = error?.response?.status;
            const code = this.toErrorCode(status, error?.code, error?.message);
            if (attempt === 2 || !["429", "500", "TIMEOUT", "NETWORK"].includes(code)) {
              console.warn(`[RapidApiClient] ${code} for ${url}`, error?.message || error);
              throw new Error(code);
            }
            const backoff = 250 * (attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, backoff));
          }
        }
        throw lastError ?? new Error("NETWORK");
      }
      toErrorCode(status, code, message) {
        if (code === "ECONNABORTED" || /timeout/i.test(message || "")) return "TIMEOUT";
        if (!status) return "NETWORK";
        if (status === 400) return "400";
        if (status === 401) return "401";
        if (status === 403) return "403";
        if (status === 404) return "404";
        if (status === 429) return "429";
        if (status >= 500) return "500";
        return "NETWORK";
      }
    };
  }
});

// src/providers/symbolMapper.ts
var SUPPORTED_SYMBOLS, SymbolMapper;
var init_symbolMapper = __esm({
  "src/providers/symbolMapper.ts"() {
    "use strict";
    SUPPORTED_SYMBOLS = {
      EURUSD: { providerSymbol: "EURUSD=X", category: "FOREX", displaySymbol: "EUR/USD" },
      GBPUSD: { providerSymbol: "GBPUSD=X", category: "FOREX", displaySymbol: "GBP/USD" },
      USDJPY: { providerSymbol: "USDJPY=X", category: "FOREX", displaySymbol: "USD/JPY" },
      AUDUSD: { providerSymbol: "AUDUSD=X", category: "FOREX", displaySymbol: "AUD/USD" },
      USDCAD: { providerSymbol: "USDCAD=X", category: "FOREX", displaySymbol: "USD/CAD" },
      USDCHF: { providerSymbol: "USDCHF=X", category: "FOREX", displaySymbol: "USD/CHF" },
      NZDUSD: { providerSymbol: "NZDUSD=X", category: "FOREX", displaySymbol: "NZD/USD" },
      EURJPY: { providerSymbol: "EURJPY=X", category: "FOREX", displaySymbol: "EUR/JPY" },
      EURGBP: { providerSymbol: "EURGBP=X", category: "FOREX", displaySymbol: "EUR/GBP" },
      GBPJPY: { providerSymbol: "GBPJPY=X", category: "FOREX", displaySymbol: "GBP/JPY" },
      XAUUSD: { providerSymbol: "GC=F", category: "METALS", displaySymbol: "XAU/USD" },
      XAGUSD: { providerSymbol: "SI=F", category: "METALS", displaySymbol: "XAG/USD" },
      BTCUSD: { providerSymbol: "BTC-USD", category: "CRYPTO", displaySymbol: "BTC/USD" },
      ETHUSD: { providerSymbol: "ETH-USD", category: "CRYPTO", displaySymbol: "ETH/USD" },
      SPX500: { providerSymbol: "^GSPC", category: "INDICES", displaySymbol: "SPX 500" },
      NAS100: { providerSymbol: "^NDX", category: "INDICES", displaySymbol: "NAS 100" },
      GER40: { providerSymbol: "^GDAXI", category: "INDICES", displaySymbol: "GER 40" }
    };
    SymbolMapper = class {
      static normalizeSymbol(symbol) {
        return (symbol || "").replace(/[/\-\s]+/g, "").toUpperCase();
      }
      static getProviderSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const definition = SUPPORTED_SYMBOLS[normalized];
        if (!definition) {
          throw new Error(`Unsupported market symbol: ${symbol}`);
        }
        return definition.providerSymbol;
      }
      static getDisplaySymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        return SUPPORTED_SYMBOLS[normalized]?.displaySymbol || normalized;
      }
      static getCategory(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        return SUPPORTED_SYMBOLS[normalized]?.category || "UNKNOWN";
      }
      static getAllSymbols() {
        return Object.keys(SUPPORTED_SYMBOLS);
      }
    };
  }
});

// src/providers/marketProvider.ts
var MarketProvider;
var init_marketProvider = __esm({
  "src/providers/marketProvider.ts"() {
    "use strict";
    init_rapidApiClient();
    init_symbolMapper();
    MarketProvider = class {
      static client = RapidApiClient.getInstance();
      static normalizeSymbol(symbol) {
        return SymbolMapper.normalizeSymbol(symbol);
      }
      static isValidCandle(candle) {
        const time = Number(candle?.time);
        const open = Number(candle?.open);
        const high = Number(candle?.high);
        const low = Number(candle?.low);
        const close = Number(candle?.close);
        if (!Number.isFinite(time) || time <= 0) return false;
        if ([open, high, low, close].some((value) => !Number.isFinite(value) || value === null || value === void 0)) return false;
        if (high < low || high < open || high < close || low > open || low > close) return false;
        return true;
      }
      static mapTimeframe(timeframe) {
        switch (timeframe) {
          case "M1":
            return { interval: "1m", range: "7d" };
          case "M5":
            return { interval: "5m", range: "1mo" };
          case "M15":
            return { interval: "15m", range: "1mo" };
          case "M30":
            return { interval: "30m", range: "1mo" };
          case "H1":
            return { interval: "60m", range: "3mo" };
          case "H4":
            return { interval: "240m", range: "6mo" };
          case "D1":
          default:
            return { interval: "1d", range: "1y" };
        }
      }
      static async fetchQuote(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);
        const data = await this.client.get(`/v8/finance/chart/${encodeURIComponent(rapidApiSymbol)}`, {
          params: { interval: "1m", range: "1d" }
        });
        const chartResult = data?.chart?.result?.[0];
        const meta = chartResult?.meta;
        const quote = chartResult?.indicators?.quote?.[0];
        const price = Number(meta?.regularMarketPrice ?? quote?.close?.slice(-1)?.[0]);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("Invalid RapidAPI quote response");
        }
        const previousClose = Number(meta?.chartPreviousClose ?? price);
        const bid = Number(meta?.regularMarketBid ?? price);
        const ask = Number(meta?.regularMarketAsk ?? price);
        const spread = Math.max(ask - bid, 0);
        const high = Number(meta?.regularMarketDayHigh ?? quote?.high?.slice(-1)?.[0] ?? price);
        const low = Number(meta?.regularMarketDayLow ?? quote?.low?.slice(-1)?.[0] ?? price);
        const open = Number(meta?.regularMarketOpen ?? quote?.open?.slice(-1)?.[0] ?? price);
        const volume = Number(quote?.volume?.slice(-1)?.[0] ?? 0);
        const parsedObject = {
          symbol: normalized,
          price,
          bid,
          ask,
          spread,
          high,
          low,
          open,
          previousClose,
          change: price - previousClose,
          changePercent: previousClose ? (price - previousClose) / previousClose * 100 : 0,
          category: SymbolMapper.getCategory(normalized),
          marketStatus: meta?.exchangeTimezoneName ? "OPEN" : "UNKNOWN",
          volume: Number.isFinite(volume) ? volume : 0,
          timestamp: Date.now()
        };
        if (normalized === "XAUUSD" || normalized === "XAGUSD") {
          console.log(`
====================================================`);
          console.log(`--- RAW JSON FROM YAHOO FINANCE (${rapidApiSymbol}) ---`);
          console.log(JSON.stringify(meta, null, 2));
          console.log(`
--- PARSED OBJECT (${normalized}) ---`);
          console.log(JSON.stringify(parsedObject, null, 2));
          console.log(`====================================================
`);
        }
        return parsedObject;
      }
      static async fetchHistoricalCandles(symbol, timeframe = "D1") {
        const normalized = this.normalizeSymbol(symbol);
        const rapidApiSymbol = SymbolMapper.getProviderSymbol(normalized);
        const { interval, range } = this.mapTimeframe(timeframe);
        const data = await this.client.get(`/v8/finance/chart/${encodeURIComponent(rapidApiSymbol)}`, {
          params: { interval, range }
        });
        const chartResult = data?.chart?.result?.[0];
        const quote = chartResult?.indicators?.quote?.[0];
        if (!Array.isArray(chartResult?.timestamp) || !quote) {
          throw new Error("Invalid RapidAPI candle response");
        }
        const candles = chartResult.timestamp.map((time, index) => ({
          time,
          open: Number(quote.open?.[index]),
          high: Number(quote.high?.[index]),
          low: Number(quote.low?.[index]),
          close: Number(quote.close?.[index]),
          volume: Number(quote.volume?.[index] ?? 0)
        })).filter((candle) => this.isValidCandle(candle)).sort((a, b) => a.time - b.time);
        if (candles.length === 0) {
          throw new Error("Received empty or invalid candles");
        }
        return candles;
      }
      static getCategory(symbol) {
        return SymbolMapper.getCategory(symbol);
      }
      static getAllSymbols() {
        return SymbolMapper.getAllSymbols();
      }
    };
  }
});

// src/services/market.service.ts
var market_service_exports = {};
__export(market_service_exports, {
  MarketService: () => MarketService
});
var MarketService;
var init_market_service = __esm({
  "src/services/market.service.ts"() {
    "use strict";
    init_marketProvider();
    init_symbolMapper();
    MarketService = class {
      static WATCHLIST = [
        "EURUSD",
        "GBPUSD",
        "USDJPY",
        "AUDUSD",
        "USDCAD",
        "USDCHF",
        "NZDUSD",
        "EURJPY",
        "EURGBP",
        "GBPJPY",
        "XAUUSD",
        "XAGUSD",
        "BTCUSD",
        "ETHUSD"
      ];
      static PRICE_TTL_MS = 250;
      static CANDLE_TTL_MS = 6e4;
      static priceCache = /* @__PURE__ */ new Map();
      static candleCache = /* @__PURE__ */ new Map();
      static quotePromises = /* @__PURE__ */ new Map();
      static candlePromises = /* @__PURE__ */ new Map();
      static normalizeSymbol(symbol) {
        return SymbolMapper.normalizeSymbol(symbol);
      }
      static getWatchSymbols() {
        return [...this.WATCHLIST];
      }
      static async getWatchQuotes() {
        return Object.values(await this.getQuotes(this.WATCHLIST));
      }
      static async getQuote(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) {
          return null;
        }
        const cacheKey = `quote:${normalized}`;
        const now = Date.now();
        const cached = this.priceCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          return cached.value;
        }
        if (this.quotePromises.has(cacheKey)) {
          return this.quotePromises.get(cacheKey);
        }
        const fetchPromise = (async () => {
          try {
            const quote = await MarketProvider.fetchQuote(normalized);
            this.priceCache.set(cacheKey, { value: quote, expiresAt: Date.now() + this.PRICE_TTL_MS });
            return quote;
          } catch (error) {
            console.error(`[MarketService] Quote fetch failed for ${normalized}: ${error.message}`);
            if (cached?.value) {
              console.warn(`[MarketService] Serving stale quote cache for ${normalized}`);
              return cached.value;
            }
            return null;
          } finally {
            this.quotePromises.delete(cacheKey);
          }
        })();
        this.quotePromises.set(cacheKey, fetchPromise);
        return fetchPromise;
      }
      static getPrice(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return null;
        return this.priceCache.get(`quote:${normalized}`)?.value?.price || null;
      }
      static async getQuotes(symbols) {
        const results = {};
        const uniqueSymbols = [...new Set(symbols.map((symbol) => this.normalizeSymbol(symbol)).filter(Boolean))];
        await Promise.all(
          uniqueSymbols.map(async (symbol) => {
            const quote = await this.getQuote(symbol);
            if (quote) {
              results[quote.symbol] = quote;
            }
          })
        );
        return results;
      }
      static async getHistoricalCandles(symbol, interval = "D1") {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) {
          return [];
        }
        const cacheKey = `candles:${normalized}:${interval}`;
        const now = Date.now();
        const cached = this.candleCache.get(cacheKey);
        if (cached && cached.expiresAt > now) {
          return cached.value;
        }
        if (this.candlePromises.has(cacheKey)) {
          return this.candlePromises.get(cacheKey);
        }
        const fetchPromise = (async () => {
          try {
            const candles = await MarketProvider.fetchHistoricalCandles(normalized, interval);
            this.candleCache.set(cacheKey, { value: candles, expiresAt: Date.now() + this.CANDLE_TTL_MS });
            return candles;
          } catch (error) {
            console.error(`[MarketService] Historical candles fetch failed for ${normalized} (${interval}): ${error.message}`);
            if (cached?.value && cached.value.length > 0) {
              console.warn(`[MarketService] Serving stale candle cache for ${normalized} (${interval})`);
              return cached.value;
            }
            return [];
          } finally {
            this.candlePromises.delete(cacheKey);
          }
        })();
        this.candlePromises.set(cacheKey, fetchPromise);
        return fetchPromise;
      }
      static async getSymbolsByCategory(category) {
        const allSymbols = MarketProvider.getAllSymbols();
        const symbols = allSymbols.filter((sym) => MarketProvider.getCategory(sym) === category);
        return Object.values(await this.getQuotes(symbols));
      }
      static async searchSymbols(query) {
        const queryUpper = query.toUpperCase();
        const allSymbols = MarketProvider.getAllSymbols();
        const symbols = allSymbols.filter((sym) => sym.includes(queryUpper));
        return Object.values(await this.getQuotes(symbols));
      }
    };
  }
});

// src/models/Position.ts
var Position_exports = {};
__export(Position_exports, {
  PositionModel: () => PositionModel
});
var import_mongoose6, PositionSchema, PositionModel;
var init_Position = __esm({
  "src/models/Position.ts"() {
    "use strict";
    import_mongoose6 = __toESM(require("mongoose"), 1);
    PositionSchema = new import_mongoose6.Schema(
      {
        userId: { type: import_mongoose6.Schema.Types.ObjectId, ref: "User", required: true },
        symbol: { type: String, required: true },
        type: { type: String, enum: ["BUY", "SELL"], required: true },
        volume: { type: Number, required: true },
        openPrice: { type: Number, required: true },
        currentPrice: { type: Number, required: true },
        sl: { type: Number },
        tp: { type: Number },
        pnl: { type: Number, default: 0 },
        commission: { type: Number, default: 0 },
        swap: { type: Number, default: 0 },
        marginUsed: { type: Number, default: 0 },
        status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
        closePrice: { type: Number }
      },
      { timestamps: true }
    );
    PositionModel = import_mongoose6.default.model("Position", PositionSchema);
  }
});

// src/models/Symbol.ts
var Symbol_exports = {};
__export(Symbol_exports, {
  SymbolModel: () => SymbolModel
});
var import_mongoose8, SymbolSchema, SymbolModel;
var init_Symbol = __esm({
  "src/models/Symbol.ts"() {
    "use strict";
    import_mongoose8 = __toESM(require("mongoose"), 1);
    SymbolSchema = new import_mongoose8.Schema(
      {
        symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
        name: { type: String, required: true },
        category: { type: String, required: true, default: "FOREX" },
        price: { type: Number, required: true, default: 0 },
        leverageLimit: { type: Number, required: true, default: 100 },
        spread: { type: Number, required: true, default: 1 },
        contractSize: { type: Number, required: true, default: 1e5 },
        digits: { type: Number, required: true, default: 5 },
        minLot: { type: Number, required: true, default: 0.01 },
        maxLot: { type: Number, required: true, default: 100 },
        lotStep: { type: Number, required: true, default: 0.01 },
        isActive: { type: Boolean, default: true }
      },
      { timestamps: true }
    );
    SymbolModel = import_mongoose8.default.model("Symbol", SymbolSchema);
  }
});

// src/services/tradeUtils.ts
var tradeUtils_exports = {};
__export(tradeUtils_exports, {
  TradeUtils: () => TradeUtils
});
var TradeUtils;
var init_tradeUtils = __esm({
  "src/services/tradeUtils.ts"() {
    "use strict";
    TradeUtils = class {
      static getContractSize(symbol) {
        const sym = symbol.toUpperCase();
        if (sym.startsWith("XAU")) return 100;
        if (sym.startsWith("XAG")) return 5e3;
        if (["BTCUSD", "ETHUSD"].includes(sym)) return 1;
        if (["US30", "NAS100", "SPX500"].includes(sym)) return 10;
        return 1e5;
      }
      static calculatePnl(type, openPrice, currentBid, currentAsk, volume, symbol, allPrices = {}, contractSizeOverride) {
        const contractSize = contractSizeOverride || this.getContractSize(symbol);
        const sym = symbol.toUpperCase();
        let rawPnl = 0;
        if (type === "BUY") {
          rawPnl = (currentBid - openPrice) * volume * contractSize;
        } else {
          rawPnl = (openPrice - currentAsk) * volume * contractSize;
        }
        if (sym.endsWith("USD")) {
          return rawPnl;
        } else if (sym.startsWith("USD")) {
          const currentPrice = (currentBid + currentAsk) / 2;
          return rawPnl / currentPrice;
        } else {
          const quoteCurrency = sym.substring(3);
          const currentPrice = (currentBid + currentAsk) / 2;
          if (quoteCurrency === "JPY") {
            const crossPair = `USDJPY`;
            const crossPrice = allPrices[crossPair]?.price || currentPrice;
            if (crossPair === "USDJPY" && allPrices[crossPair]) {
              return rawPnl / allPrices[crossPair].price;
            }
          }
          if (quoteCurrency === "GBP") {
            const crossPair = `GBPUSD`;
            if (allPrices[crossPair]) {
              return rawPnl * allPrices[crossPair].price;
            }
          }
          return rawPnl;
        }
      }
    };
  }
});

// server.ts
var import_dotenv3 = __toESM(require("dotenv"), 1);
var import_express19 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// src/config/database.ts
var import_mongoose = __toESM(require("mongoose"), 1);

// src/config/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var nodeEnv = process.env.NODE_ENV || "development";
var defaultJwtSecret = nodeEnv === "production" ? "" : "dev-jwt-secret-change-me";
var defaultRefreshSecret = nodeEnv === "production" ? "" : "dev-refresh-secret-change-me";
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET ? "YES" : "NO");
console.log("JWT_REFRESH_SECRET loaded:", !!process.env.JWT_REFRESH_SECRET ? "YES" : "NO");
console.log("PORT value:", process.env.PORT);
if (nodeEnv === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}
if (nodeEnv === "production" && !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is missing from .env");
}
var config = {
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/forex-factory",
  jwtSecret: process.env.JWT_SECRET || defaultJwtSecret,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || defaultRefreshSecret,
  port: process.env.PORT || "8000",
  nodeEnv
};

// src/config/database.ts
var mongoServer = null;
var connectDatabase = async () => {
  try {
    if (config.nodeEnv !== "production" && config.mongoUri.includes("127.0.0.1:27017")) {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await import_mongoose.default.connect(uri, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 45e3
      });
      console.log("MongoDB Connected Successfully (in-memory)");
    } else {
      await import_mongoose.default.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 45e3
      });
      console.log("MongoDB Connected Successfully");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
  import_mongoose.default.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
  const gracefulExit = async () => {
    await import_mongoose.default.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log("MongoDB connection closed due to app termination");
    process.exit(0);
  };
  process.on("SIGINT", gracefulExit);
  process.on("SIGTERM", gracefulExit);
};

// src/routes/authRoutes.ts
var import_express = require("express");

// src/controllers/authController.ts
var import_bcryptjs = __toESM(require("bcryptjs"), 1);

// src/models/User.ts
var import_mongoose2 = __toESM(require("mongoose"), 1);
var UserSchema = new import_mongoose2.Schema(
  {
    username: { type: String, required: true, unique: true, minlength: 4 },
    fullName: { type: String },
    email: { type: String, unique: true, sparse: true },
    phone: { type: String },
    country: { type: String },
    avatar: { type: String },
    // Keep legacy `password` for older code, but prefer `passwordHash`
    password: { type: String },
    passwordHash: { type: String },
    role: { type: String, default: "user" },
    status: { type: String, enum: ["ACTIVE", "BANNED", "SUSPENDED", "DISABLED", "TRADING_BLOCKED"], default: "ACTIVE" },
    kycStatus: {
      type: String,
      enum: ["UNSUBMITTED", "PENDING", "APPROVED", "REJECTED"],
      default: "PENDING"
    }
  },
  { timestamps: true }
);
UserSchema.set("toJSON", {
  transform: function(doc, ret, options) {
    delete ret.password;
    delete ret.passwordHash;
    return ret;
  }
});
var UserModel = import_mongoose2.default.model("User", UserSchema);

// src/controllers/authController.ts
init_Wallet();

// src/models/Kyc.ts
var import_mongoose4 = __toESM(require("mongoose"), 1);
var KycSchema = new import_mongoose4.Schema(
  {
    userId: { type: import_mongoose4.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["UNSUBMITTED", "PENDING", "APPROVED", "REJECTED"], default: "UNSUBMITTED" },
    aadharNumber: { type: String },
    aadharDocument: { type: String },
    // Base64 string
    panNumber: { type: String },
    panDocument: { type: String },
    // Base64 string
    accountHolderName: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    upiId: { type: String },
    documents: [{ type: String }],
    adminNotes: { type: String }
  },
  { timestamps: true }
);
var KycModel = import_mongoose4.default.model("Kyc", KycSchema);

// src/models/Settings.ts
var import_mongoose5 = __toESM(require("mongoose"), 1);
var SettingsSchema = new import_mongoose5.Schema(
  {
    userId: { type: import_mongoose5.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: "en" }
  },
  { timestamps: true }
);
var SettingsModel = import_mongoose5.default.model("Settings", SettingsSchema);

// src/utils/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var signAccessToken = (payload, expiresIn = "1d") => {
  return import_jsonwebtoken.default.sign(payload, config.jwtSecret, { expiresIn });
};
var signRefreshToken = (payload, expiresIn = "7d") => {
  return import_jsonwebtoken.default.sign(payload, config.jwtRefreshSecret, { expiresIn });
};
var verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? config.jwtRefreshSecret : config.jwtSecret;
  return import_jsonwebtoken.default.verify(token, secret);
};

// src/controllers/authController.ts
var register = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log(`[REGISTER] Request body:`, req.body);
    if (!username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof username !== "string" || username.length < 4) {
      return res.status(400).json({ error: "Username must be at least 4 characters" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const existing = await UserModel.findOne({ username: username.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "Username already taken" });
    }
    const hashed = await import_bcryptjs.default.hash(password, 12);
    const user = await UserModel.create({
      username: username.toLowerCase(),
      passwordHash: hashed,
      role: "user",
      kycStatus: "PENDING"
    });
    await WalletModel.create({
      userId: user._id,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      pnl: 0
    });
    await SettingsModel.create({
      userId: user._id,
      theme: "light",
      notifications: true,
      language: "en"
    });
    await KycModel.create({
      userId: user._id,
      status: "PENDING",
      documents: []
    });
    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile = user.toObject();
    delete profile.password;
    delete profile.passwordHash;
    profile.id = profile._id;
    res.status(201).json({ success: true, message: "Registered successfully", token, refreshToken, profile });
  } catch (err) {
    next(err);
  }
};
var login = async (req, res, next) => {
  try {
    const { username, password: passwordInput } = req.body;
    if (!username || !passwordInput) {
      return res.status(400).json({ error: "Missing username or password" });
    }
    const query = {
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }]
    };
    const user = await UserModel.findOne(query);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const hash = user.passwordHash || user.password || "";
    const match = await import_bcryptjs.default.compare(passwordInput, hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile = user.toObject();
    delete profile.password;
    delete profile.passwordHash;
    profile.id = profile._id;
    res.json({ success: true, token, refreshToken, profile });
  } catch (err) {
    next(err);
  }
};
var getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await UserModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const profile = user.toObject();
    const { password: _password, ...safeProfile } = profile;
    safeProfile.id = safeProfile._id;
    res.json({ success: true, profile: safeProfile });
  } catch (err) {
    next(err);
  }
};

// src/middleware/authMiddleware.ts
var protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyToken(token);
    const user = await UserModel.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Token belongs to deleted user", userId: decoded.id });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
var admin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    next();
  } else {
    res.status(403).json({ error: "Not authorized as admin" });
  }
};

// src/routes/authRoutes.ts
console.log("\u2705 authRoutes loaded");
var router = (0, import_express.Router)();
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth route working"
  });
});
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getProfile);
var authRoutes_default = router;

// src/routes/healthRoutes.ts
var import_express2 = require("express");
var router2 = (0, import_express2.Router)();
router2.get("/", (_req, res) => {
  res.json({ success: true, database: "connected" });
});
var healthRoutes_default = router2;

// src/middleware/errorHandler.ts
var errorHandler = (err, _req, res, _next) => {
  console.error("Error:", err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
};

// server.ts
var import_http = __toESM(require("http"), 1);

// src/services/socketServer.ts
var import_socket = require("socket.io");
var SocketServer = class {
  static io = null;
  static connectedUsers = /* @__PURE__ */ new Set();
  static init(server2) {
    if (this.io) {
      return this.io;
    }
    this.io = new import_socket.Server(server2, {
      cors: {
        origin: true,
        methods: ["GET", "POST"],
        credentials: true
      },
      pingInterval: 25e3,
      pingTimeout: 2e4
    });
    this.io.on("connection", (socket) => {
      this.connectedUsers.add(socket.id);
      console.log("Client connected:", socket.id);
      socket.on("subscribe", (userId) => {
        if (userId) {
          socket.join(userId);
          console.log(`Socket ${socket.id} joined room ${userId}`);
        }
      });
      socket.on("disconnect", () => {
        this.connectedUsers.delete(socket.id);
        console.log("Client disconnected:", socket.id);
      });
    });
    return this.io;
  }
  static getIO() {
    return this.io;
  }
  static broadcastPrices(prices) {
    if (this.io) {
      this.io.emit("prices", prices);
    }
  }
  static broadcastMarketUpdate(updates) {
    if (this.io && Array.isArray(updates) && updates.length > 0) {
      this.io.emit("market:update", updates);
    }
  }
  static broadcastPnlUpdate(userId, positions) {
    if (this.io) {
      this.io.to(userId).emit("pnl", positions);
    }
  }
  static broadcastWalletUpdate(userId, wallet) {
    if (this.io) {
      this.io.to(userId).emit("wallet", wallet);
    }
  }
};

// src/services/priceEngine.ts
init_market_service();
init_Position();

// src/models/Order.ts
var import_mongoose7 = __toESM(require("mongoose"), 1);
var OrderSchema = new import_mongoose7.Schema(
  {
    userId: { type: import_mongoose7.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ["BUY", "SELL", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP"], required: true },
    volume: { type: Number, required: true },
    price: { type: Number },
    targetPrice: { type: Number, required: true },
    sl: { type: Number },
    tp: { type: Number },
    status: { type: String, enum: ["PENDING", "EXECUTED", "CANCELLED"], default: "PENDING" }
  },
  { timestamps: true }
);
var OrderModel = import_mongoose7.default.model("Order", OrderSchema);

// src/services/marginEngine.ts
init_Wallet();

// src/engine/SymbolSpecification.ts
init_Symbol();
var SymbolSpecification = class {
  static cache = /* @__PURE__ */ new Map();
  /**
   * Initializes or refreshes the symbol specifications from the database
   */
  static async loadAll() {
    try {
      const symbols = await SymbolModel.find({});
      this.cache.clear();
      for (const sym of symbols) {
        this.cache.set(sym.symbol.toUpperCase(), sym);
      }
    } catch (err) {
      console.error("[SymbolSpecification] Error loading symbols:", err);
    }
  }
  /**
   * Retrieves the specification for a symbol, providing strict MT5 defaults if missing.
   */
  static async get(symbol) {
    const sym = symbol.toUpperCase();
    if (this.cache.has(sym)) {
      return this.cache.get(sym);
    }
    try {
      const dbSym = await SymbolModel.findOne({ symbol: sym });
      if (dbSym) {
        this.cache.set(sym, dbSym);
        return dbSym;
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
  static getSync(symbol) {
    const sym = symbol.toUpperCase();
    if (this.cache.has(sym)) {
      return this.cache.get(sym);
    }
    return this.getDefaults(sym);
  }
  static getDefaults(symbol) {
    const sym = symbol.toUpperCase();
    let contractSize = 1e5;
    let digits = 5;
    if (sym.startsWith("XAU")) {
      contractSize = 100;
      digits = 2;
    } else if (sym.startsWith("XAG")) {
      contractSize = 5e3;
      digits = 3;
    } else if (["BTCUSD", "ETHUSD"].includes(sym)) {
      contractSize = 1;
      digits = 2;
    } else if (["US30", "NAS100", "SPX500"].includes(sym)) {
      contractSize = 10;
      digits = 2;
    } else if (sym.includes("JPY")) {
      contractSize = 1e5;
      digits = 3;
    }
    return {
      symbol: sym,
      contractSize,
      digits,
      minLot: 0.01,
      maxLot: 100,
      lotStep: 0.01,
      leverageLimit: 100,
      spread: 1,
      isActive: true
    };
  }
};

// src/engine/ProfitCalculator.ts
var ProfitCalculator2 = class {
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
  static calculate(side, entryPrice, currentBid, currentAsk, volume, symbol, usdRate = 1) {
    const spec = SymbolSpecification.getSync(symbol);
    const contractSize = spec.contractSize || 1e5;
    let rawProfit = 0;
    if (side === "BUY") {
      rawProfit = (currentBid - entryPrice) * contractSize * volume;
    } else {
      rawProfit = (entryPrice - currentAsk) * contractSize * volume;
    }
    return rawProfit * usdRate;
  }
};

// src/engine/MarginCalculator.ts
var MarginCalculator = class {
  /**
   * Calculates required margin for an open position.
   * Formula exactly as requested: (Price * Contract Size * Volume) / Leverage
   * 
   * @param symbol Symbol string (e.g., 'EURUSD')
   * @param volume Lot size
   * @param price Current market price (Mid price or specific Bid/Ask depending on execution)
   * @param leverage Account or Symbol leverage
   * @param usdRate Conversion rate to USD if margin is calculated in a foreign quote currency
   */
  static calculate(symbol, volume, price, leverage, usdRate = 1) {
    const spec = SymbolSpecification.getSync(symbol);
    const contractSize = spec.contractSize || 1e5;
    const rawMargin = price * contractSize * volume / leverage;
    return rawMargin * usdRate;
  }
};

// src/engine/PriceService.ts
init_market_service();
var PriceService = class {
  /**
   * Gets the current live bid, ask, and spread for a symbol.
   * If the market service only provides a single price, it derives bid/ask using the configured spread.
   */
  static getRawPrice(symbol) {
    return MarketService.getPrice(symbol);
  }
  static getLivePrices(symbol, spreadPips = 1, digits = 5) {
    const rawPrice = MarketService.getPrice(symbol);
    if (!rawPrice) {
      return { bid: 0, ask: 0, spread: 0 };
    }
    const pipValue = Math.pow(10, -digits + 1);
    const pipSize = digits === 2 || digits === 3 ? 0.01 : 1e-4;
    const spreadValue = spreadPips * pipSize;
    const bid = rawPrice;
    const ask = rawPrice + spreadValue;
    return {
      bid: parseFloat(bid.toFixed(digits)),
      ask: parseFloat(ask.toFixed(digits)),
      spread: spreadPips
    };
  }
  /**
   * Retrieves the specific execution price for a new order.
   * BUY -> ASK
   * SELL -> BID
   */
  static getExecutionPrice(symbol, side, spreadPips, digits) {
    const prices = this.getLivePrices(symbol, spreadPips, digits);
    return side === "BUY" ? prices.ask : prices.bid;
  }
};

// src/engine/PositionManager.ts
var PositionManager = class {
  /**
   * Calculates live parameters for a position (PnL, Margin Used)
   */
  static evaluateLivePosition(position, allPrices = {}) {
    const spec = SymbolSpecification.getSync(position.symbol);
    const prices = PriceService.getLivePrices(position.symbol, spec.spread || 1, spec.digits || 5);
    const sym = position.symbol.toUpperCase();
    let usdRate = 1;
    if (!sym.endsWith("USD") && !sym.startsWith("USD")) {
      const quote = sym.substring(3);
      if (quote === "JPY") {
        const cross = "USDJPY";
        let crossPrice = allPrices[cross] ? allPrices[cross].price : null;
        if (!crossPrice) crossPrice = PriceService.getRawPrice(cross);
        if (crossPrice > 0) usdRate = 1 / crossPrice;
      } else if (quote === "GBP") {
        const cross = "GBPUSD";
        let crossPrice = allPrices[cross] ? allPrices[cross].price : null;
        if (!crossPrice) crossPrice = PriceService.getRawPrice(cross);
        if (crossPrice > 0) usdRate = crossPrice;
      }
    } else if (sym.startsWith("USD") && sym !== "USDUSD") {
      const currentMid = (prices.bid + prices.ask) / 2;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }
    const entryPrice = Number(position.openPrice) || 0;
    const volume = Number(position.volume) || 0;
    const side = position.type || "BUY";
    const pnl = ProfitCalculator2.calculate(
      side,
      entryPrice,
      prices.bid,
      prices.ask,
      volume,
      position.symbol,
      usdRate
    );
    const priceForMargin = side === "BUY" ? prices.bid : prices.ask;
    const marginUsed = MarginCalculator.calculate(
      position.symbol,
      volume,
      priceForMargin,
      spec.leverageLimit || 100,
      usdRate
    );
    return { pnl, marginUsed };
  }
  /**
   * Calculates proportional realized PnL and remaining volume for a partial close.
   */
  static calculatePartialClose(position, closeVolume, livePnl) {
    if (closeVolume >= position.volume) {
      return { realizedPnl: livePnl, remainingVolume: 0 };
    }
    const proportion = closeVolume / position.volume;
    const realizedPnl = livePnl * proportion;
    const remainingVolume = position.volume - closeVolume;
    return { realizedPnl, remainingVolume };
  }
};

// src/engine/AccountCalculator.ts
var AccountCalculator = class {
  /**
   * Calculates live account Equity.
   * Equity = Balance + Floating Profit - Commission - Swap
   */
  static calculateEquity(balance, floatingProfit, commission = 0, swap = 0) {
    return balance + floatingProfit - commission - swap;
  }
  /**
   * Calculates Free Margin.
   * Free Margin = Equity - Used Margin
   */
  static calculateFreeMargin(equity, usedMargin) {
    return equity - usedMargin;
  }
  /**
   * Calculates Margin Level percentage.
   * Margin Level = (Equity / Used Margin) * 100
   * 
   * Returns Infinity if usedMargin is 0 (representing "Unlimited").
   */
  static calculateMarginLevel(equity, usedMargin) {
    if (usedMargin <= 0) {
      return Infinity;
    }
    return equity / usedMargin * 100;
  }
};

// src/engine/RiskCalculator.ts
var RiskCalculator = class {
  /**
   * Evaluates the margin level to determine if a stop out or margin call is triggered.
   * Standard values are often 100% for Margin Call, 50% for Stop Out.
   * 
   * @param marginLevel The current Margin Level %
   * @param stopOutLevel The threshold for Stop Out (default 50%)
   * @param marginCallLevel The threshold for Margin Call (default 100%)
   * @returns 'STOP_OUT' | 'MARGIN_CALL' | 'SAFE'
   */
  static evaluateRisk(marginLevel, stopOutLevel = 50, marginCallLevel = 100) {
    if (marginLevel <= stopOutLevel) {
      return "STOP_OUT";
    }
    if (marginLevel <= marginCallLevel) {
      return "MARGIN_CALL";
    }
    return "SAFE";
  }
};

// src/engine/OrderValidator.ts
var OrderValidator = class {
  /**
   * Validates if a new order can be placed.
   * Throws an error with a specific message if validation fails.
   */
  static validateNewOrder(symbol, side, volume, marginRequired, freeMargin, slPrice, tpPrice, entryPrice, marketEnabled = true) {
    if (!marketEnabled) {
      throw new Error("Market is Closed");
    }
    const spec = SymbolSpecification.getSync(symbol);
    if (!spec || !spec.isActive) {
      throw new Error("Disabled Symbol");
    }
    if (volume < spec.minLot || volume > spec.maxLot) {
      throw new Error("Invalid Lot");
    }
    const lotStep = spec.lotStep || 0.01;
    const precision = Math.max(0, -Math.floor(Math.log10(lotStep)));
    const volumeMod = parseFloat((volume % lotStep).toFixed(precision));
    if (volumeMod !== 0 && Math.abs(volumeMod - lotStep) > 1e-4) {
      throw new Error("Invalid Lot");
    }
    if (marginRequired > freeMargin) {
      throw new Error("Insufficient Margin");
    }
    if (entryPrice) {
      if (side === "BUY") {
        if (slPrice && slPrice >= entryPrice) throw new Error("Invalid SL");
        if (tpPrice && tpPrice <= entryPrice) throw new Error("Invalid TP");
      } else {
        if (slPrice && slPrice <= entryPrice) throw new Error("Invalid SL");
        if (tpPrice && tpPrice >= entryPrice) throw new Error("Invalid TP");
      }
    }
  }
};

// src/engine/TradingEngine.ts
var TradingEngine = class {
  /**
   * Evaluates the full wallet state including all open positions.
   * Modifies the positions in-place with new pnl/margin and returns the wallet metrics.
   */
  static evaluateWallet(walletBalance, positions, allPrices = {}) {
    let usedMargin = 0;
    let totalPnl = 0;
    for (const pos of positions) {
      const { pnl, marginUsed } = PositionManager.evaluateLivePosition(pos, allPrices);
      pos.pnl = pnl;
      pos.marginUsed = marginUsed;
      usedMargin += marginUsed;
      totalPnl += pnl;
    }
    const safeBalance = Number(walletBalance) || 0;
    const equity = AccountCalculator.calculateEquity(safeBalance, totalPnl);
    const freeMargin = AccountCalculator.calculateFreeMargin(equity, usedMargin);
    const marginLevel = AccountCalculator.calculateMarginLevel(equity, usedMargin);
    const riskState = RiskCalculator.evaluateRisk(marginLevel);
    return {
      equity,
      usedMargin,
      freeMargin,
      marginLevel,
      riskState,
      totalPnl
    };
  }
  /**
   * Pre-trade validation wrapper.
   */
  static validateOrder(symbol, side, volume, freeMargin, marginRequired, slPrice, tpPrice, entryPrice, marketEnabled = true) {
    OrderValidator.validateNewOrder(
      symbol,
      side,
      volume,
      marginRequired,
      freeMargin,
      slPrice,
      tpPrice,
      entryPrice,
      marketEnabled
    );
  }
};

// src/services/marginEngine.ts
var MarginEngine = class {
  static async calculateMargin(userId, positions, prices) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return null;
    const result = TradingEngine.evaluateWallet(wallet.balance, positions, prices);
    for (const pos of positions) {
      if (pos.status === "OPEN") {
        await Promise.resolve().then(() => (init_Position(), Position_exports)).then(({ PositionModel: PositionModel2 }) => {
          PositionModel2.updateOne(
            { _id: pos._id, status: "OPEN" },
            { $set: { pnl: pos.pnl, marginUsed: pos.marginUsed } }
            // Note: we can optionally update currentPrice if we track it elsewhere, but Engine relies on live feeds.
          ).exec();
        });
      }
    }
    wallet.equity = result.equity;
    wallet.margin = result.usedMargin;
    wallet.usedMargin = result.usedMargin;
    wallet.freeMargin = result.freeMargin;
    wallet.marginLevel = result.marginLevel === Infinity ? 0 : result.marginLevel;
    wallet.pnl = result.totalPnl;
    await wallet.save();
    return wallet;
  }
  static async validateMarginForTrade(userId, symbol, price, volume) {
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return { ok: false, reason: "WALLET_NOT_FOUND" };
    if (wallet.status !== "ACTIVE") return { ok: false, reason: "WALLET_INACTIVE" };
    const spec = SymbolSpecification.getSync(symbol);
    const leverage = spec.leverageLimit || 100;
    let usdRate = 1;
    const sym = spec.symbol.toUpperCase();
    if (!sym.endsWith("USD") && !sym.startsWith("USD")) {
      const quoteCurrency = sym.substring(3);
      if (quoteCurrency === "JPY") {
        const { MarketService: MarketService2 } = await Promise.resolve().then(() => (init_market_service(), market_service_exports));
        const crossQuote = await MarketService2.getQuote("USDJPY");
        if (crossQuote && crossQuote.price > 0) usdRate = 1 / crossQuote.price;
      } else if (quoteCurrency === "GBP") {
        const { MarketService: MarketService2 } = await Promise.resolve().then(() => (init_market_service(), market_service_exports));
        const crossQuote = await MarketService2.getQuote("GBPUSD");
        if (crossQuote && crossQuote.price > 0) usdRate = crossQuote.price;
      }
    } else if (sym.startsWith("USD") && sym !== "USDUSD") {
      const currentMid = price;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }
    const required = MarginCalculator.calculate(symbol, volume, price, leverage, usdRate);
    const free = Number(wallet.freeMargin ?? 0);
    const balance = Number(wallet.balance ?? 0);
    if (required > free) {
      return { ok: false, reason: "INSUFFICIENT_FREE_MARGIN" };
    }
    return { ok: true, required, free, balance };
  }
};

// src/services/stopLossEngine.ts
init_Wallet();
var StopLossEngine = class {
  static async evaluatePositions(positions, prices) {
    const closedPositions = [];
    const { SymbolModel: SymbolModel2 } = await Promise.resolve().then(() => (init_Symbol(), Symbol_exports));
    const allSymbols = await SymbolModel2.find({});
    const symbolMap = allSymbols.reduce((acc, s) => {
      acc[s.symbol] = s;
      return acc;
    }, {});
    for (const pos of positions) {
      if (pos.status !== "OPEN") continue;
      const symSpec = symbolMap[pos.symbol.toUpperCase()];
      const contractSize = symSpec ? symSpec.contractSize : 1e5;
      const currentPriceObj = prices[pos.symbol];
      if (!currentPriceObj) continue;
      const currentBid = currentPriceObj.bid;
      const currentAsk = currentPriceObj.ask;
      let shouldClose = false;
      let closePrice = 0;
      if (pos.type === "BUY") {
        if (pos.sl && currentBid <= pos.sl) {
          shouldClose = true;
          closePrice = currentBid;
        }
        if (pos.tp && currentBid >= pos.tp) {
          shouldClose = true;
          closePrice = currentBid;
        }
      } else if (pos.type === "SELL") {
        if (pos.sl && currentAsk >= pos.sl) {
          shouldClose = true;
          closePrice = currentAsk;
        }
        if (pos.tp && currentAsk <= pos.tp) {
          shouldClose = true;
          closePrice = currentAsk;
        }
      }
      if (shouldClose) {
        const pnl = ProfitCalculator2.calculate(
          pos.type,
          pos.openPrice,
          closePrice,
          closePrice,
          pos.volume,
          pos.symbol
        );
        const { PositionModel: PositionModel2 } = await Promise.resolve().then(() => (init_Position(), Position_exports));
        const updatedPos = await PositionModel2.findOneAndUpdate(
          { _id: pos._id, status: "OPEN" },
          { $set: { status: "CLOSED", closePrice, pnl } },
          { new: true }
        );
        if (updatedPos) {
          const wallet = await WalletModel.findOne({ userId: pos.userId });
          if (wallet) {
            wallet.balance += pnl;
            await wallet.save();
            const openPositions = await PositionModel2.find({ userId: pos.userId, status: "OPEN" });
            await MarginEngine.calculateMargin(pos.userId.toString(), openPositions, prices);
          }
          closedPositions.push(updatedPos);
        }
      }
    }
    return closedPositions;
  }
};

// src/services/stopOutEngine.ts
init_Wallet();
init_Position();
init_market_service();
init_Symbol();
var StopOutEngine = class {
  // Threshold for margin call / stop out (50%)
  static STOP_OUT_LEVEL = 50;
  static async evaluateStopOut(userId, wallet, positions, prices) {
    if (wallet.marginLevel > 0 && wallet.marginLevel < this.STOP_OUT_LEVEL) {
      console.log(`[STOP OUT WARNING] User ${userId} margin level (${wallet.marginLevel.toFixed(2)}%) is below ${this.STOP_OUT_LEVEL}%. Executing Stop Out.`);
      const openPositions = positions.filter((p) => p.status === "OPEN");
      if (openPositions.length === 0) return;
      openPositions.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
      const worstPosition = openPositions[0];
      try {
        const quote = prices[worstPosition.symbol] || await MarketService.getQuote(worstPosition.symbol);
        if (!quote) return;
        const closePrice = worstPosition.type === "BUY" ? quote.bid : quote.ask;
        const sym = await SymbolModel.findOne({ symbol: worstPosition.symbol.toUpperCase() });
        const contractSize = sym ? sym.contractSize : 1e5;
        const finalPnl = ProfitCalculator2.calculate(
          worstPosition.type,
          worstPosition.openPrice,
          closePrice,
          closePrice,
          worstPosition.volume,
          worstPosition.symbol
        );
        const updatedPos = await PositionModel.findOneAndUpdate(
          { _id: worstPosition._id, status: "OPEN" },
          { $set: { status: "CLOSED", closePrice, pnl: finalPnl } },
          { new: true }
        );
        if (updatedPos) {
          const updatedWallet = await WalletModel.findOne({ userId });
          if (updatedWallet) {
            updatedWallet.balance += finalPnl;
            await updatedWallet.save();
          }
          console.log(`[STOP OUT EXECUTED] Closed position ${updatedPos._id} for user ${userId} with PNL: ${finalPnl}`);
          const io = SocketServer.getIO();
          if (io) {
            io.to(userId.toString()).emit("notification", {
              type: "ERROR",
              title: "Stop Out Executed",
              message: `Position ${worstPosition.symbol} was automatically closed due to insufficient margin.`
            });
          }
        }
      } catch (err) {
        console.error(`[STOP OUT ERROR] Failed to close position ${worstPosition._id}:`, err);
      }
    }
  }
};

// src/services/orderExecutionEngine.ts
init_Position();
init_Wallet();
init_Symbol();
init_market_service();

// src/models/Notification.ts
var import_mongoose9 = __toESM(require("mongoose"), 1);
var NotificationSchema = new import_mongoose9.Schema(
  {
    userId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);
var NotificationModel = import_mongoose9.default.model("Notification", NotificationSchema);

// src/models/AuditLog.ts
var import_mongoose10 = __toESM(require("mongoose"), 1);
var AuditLogSchema = new import_mongoose10.Schema(
  {
    adminId: { type: import_mongoose10.Schema.Types.ObjectId, ref: "User" },
    userId: { type: import_mongoose10.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    details: { type: import_mongoose10.Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: true }
);
var AuditLogModel = import_mongoose10.default.model("AuditLog", AuditLogSchema);

// src/services/orderExecutionEngine.ts
var OrderExecutionEngine = class {
  static async evaluateOrders(orders, prices) {
    const executedOrders = [];
    for (const order of orders) {
      if (order.status !== "PENDING") continue;
      const currentPriceObj = prices[order.symbol];
      if (!currentPriceObj) continue;
      const currentPrice = currentPriceObj.price;
      let shouldExecute = false;
      if (order.type === "BUY_LIMIT" && currentPrice <= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === "SELL_LIMIT" && currentPrice >= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === "BUY_STOP" && currentPrice >= order.targetPrice) {
        shouldExecute = true;
      } else if (order.type === "SELL_STOP" && currentPrice <= order.targetPrice) {
        shouldExecute = true;
      }
      if (shouldExecute) {
        const user = await UserModel.findById(order.userId);
        if (!user || user.status !== "ACTIVE") {
          order.status = "CANCELLED";
          await order.save();
          await AuditLogModel.create({ action: "ORDER_CANCELLED", details: { orderId: order._id, reason: "USER_INACTIVE" } });
          continue;
        }
        const wallet = await WalletModel.findOne({ userId: order.userId });
        if (!wallet || wallet.status !== "ACTIVE") {
          order.status = "CANCELLED";
          await order.save();
          await AuditLogModel.create({ action: "ORDER_CANCELLED", details: { orderId: order._id, reason: "WALLET_INVALID" } });
          continue;
        }
        const sym = await SymbolModel.findOne({ symbol: order.symbol.toUpperCase() });
        if (!sym || !sym.isActive) {
          order.status = "CANCELLED";
          await order.save();
          await AuditLogModel.create({ action: "ORDER_CANCELLED", details: { orderId: order._id, reason: "SYMBOL_INACTIVE" } });
          continue;
        }
        const quote = await MarketService.getQuote(order.symbol);
        if (!quote || quote.marketStatus !== "OPEN") {
          continue;
        }
        const marginCheck = await MarginEngine.validateMarginForTrade(order.userId.toString(), sym.symbol, currentPrice, order.volume);
        if (!marginCheck.ok) {
          order.status = "CANCELLED";
          await order.save();
          await NotificationModel.create({ userId: order.userId, title: "Order Cancelled", message: "Order cancelled due to insufficient margin or wallet.", type: "ERROR" });
          await AuditLogModel.create({ action: "ORDER_CANCELLED", details: { orderId: order._id, reason: marginCheck.reason } });
          continue;
        }
        order.status = "EXECUTED";
        await order.save();
        const newPos = await PositionModel.create({
          userId: order.userId,
          symbol: order.symbol,
          type: order.type.startsWith("BUY") ? "BUY" : "SELL",
          volume: order.volume,
          openPrice: currentPrice,
          currentPrice,
          sl: order.sl,
          tp: order.tp,
          pnl: 0,
          status: "OPEN"
        });
        executedOrders.push(newPos);
      }
    }
    return executedOrders;
  }
};

// src/services/priceEngine.ts
var PriceEngine = class {
  static isRunning = false;
  static currentPrices = {};
  static symbols = MarketService.getWatchSymbols();
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("PriceEngine started");
    void this.updateTick();
    setInterval(async () => {
      try {
        await this.updateTick();
      } catch (err) {
        console.error("PriceEngine tick error", err);
      }
    }, 250);
  }
  static lastUserPositionCount = {};
  static async updateTick() {
    const newPrices = await MarketService.getQuotes(this.symbols);
    const changedQuotes = Object.entries(newPrices).filter(([symbol, quote]) => {
      const previous = this.currentPrices[symbol];
      if (!previous) return true;
      return previous.price !== quote.price || previous.bid !== quote.bid || previous.ask !== quote.ask || previous.high !== quote.high || previous.low !== quote.low || previous.open !== quote.open;
    }).map(([symbol, quote]) => ({ symbol, ...quote }));
    this.currentPrices = { ...this.currentPrices, ...newPrices };
    if (changedQuotes.length > 0) {
      SocketServer.broadcastMarketUpdate(changedQuotes);
      SocketServer.broadcastPrices(
        Object.keys(this.currentPrices).map((sym) => ({
          symbol: sym,
          ...this.currentPrices[sym]
        }))
      );
    }
    const openPositions = await PositionModel.find({ status: "OPEN" });
    const pendingOrders = await OrderModel.find({ status: "PENDING" });
    const positionsByUser = this.groupByUser(openPositions);
    const currentUsers = new Set(Object.keys(positionsByUser));
    for (const userId of Object.keys(this.lastUserPositionCount)) {
      if (this.lastUserPositionCount[userId] > 0) {
        currentUsers.add(userId);
      }
    }
    for (const userId of currentUsers) {
      const userPositions = positionsByUser[userId] || [];
      this.lastUserPositionCount[userId] = userPositions.length;
      const closedPos = await StopLossEngine.evaluatePositions(userPositions, this.currentPrices);
      const wallet = await MarginEngine.calculateMargin(userId, userPositions, this.currentPrices);
      if (wallet) {
        await StopOutEngine.evaluateStopOut(userId, wallet, userPositions, this.currentPrices);
      }
      SocketServer.broadcastPnlUpdate(userId, userPositions);
      if (wallet) {
        SocketServer.broadcastWalletUpdate(userId, wallet);
      }
    }
    await OrderExecutionEngine.evaluateOrders(pendingOrders, this.currentPrices);
  }
  static groupByUser(items) {
    return items.reduce((acc, item) => {
      const uid = item.userId.toString();
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(item);
      return acc;
    }, {});
  }
};

// src/routes/walletRoutes.ts
var import_express3 = require("express");

// src/controllers/walletController.ts
init_Wallet();
var getWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = await WalletModel.create({ userId });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var fundWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = await WalletModel.create({ userId, balance: amount, freeMargin: amount, equity: amount });
    } else {
      wallet.balance += amount;
      wallet.freeMargin += amount;
      wallet.equity += amount;
      await wallet.save();
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/walletRoutes.ts
var router3 = (0, import_express3.Router)();
router3.use(protect);
router3.get("/", getWallet);
router3.post("/fund", fundWallet);
var walletRoutes_default = router3;

// src/routes/depositRoutes.ts
var import_express4 = require("express");

// src/models/Deposit.ts
var import_mongoose11 = __toESM(require("mongoose"), 1);
var DepositSchema = new import_mongoose11.Schema(
  {
    userId: { type: import_mongoose11.Schema.Types.ObjectId, required: true, ref: "User" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    paymentMethod: { type: String, enum: ["UPI", "NETBANKING"], required: true, default: "UPI" },
    utr: { type: String, required: true },
    screenshot: { type: String },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    adminNote: { type: String }
  },
  { timestamps: true }
);
var DepositModel = import_mongoose11.default.model("Deposit", DepositSchema);

// src/models/Transaction.ts
var import_mongoose12 = __toESM(require("mongoose"), 1);
var TransactionSchema = new import_mongoose12.Schema(
  {
    userId: { type: import_mongoose12.Schema.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: ["DEPOSIT", "WITHDRAW", "TRADE", "BONUS", "TRADE_LOSS", "ADMIN_ADJUSTMENT", "WITHDRAWAL"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    referenceId: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);
var TransactionModel = import_mongoose12.default.model("Transaction", TransactionSchema);

// src/controllers/depositController.ts
var createDeposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = "USD", paymentMethod = "UPI", utr, screenshot } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    if (!currency) {
      return res.status(400).json({ error: "Currency is required" });
    }
    if (!["UPI", "NETBANKING"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Payment method must be UPI or NETBANKING" });
    }
    if (!utr) {
      return res.status(400).json({ error: "UTR is required" });
    }
    const deposit = await DepositModel.create({
      userId,
      amount,
      currency,
      paymentMethod,
      utr,
      screenshot,
      status: "PENDING"
    });
    await TransactionModel.create({
      userId,
      type: "DEPOSIT",
      amount,
      status: "PENDING",
      referenceId: deposit._id.toString(),
      description: `Deposit request of ${currency} ${amount} via ${paymentMethod} UTR ${utr}`
    });
    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getDeposits = async (req, res) => {
  try {
    const userId = req.user.id;
    const deposits = await DepositModel.find({ userId }).sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/depositRoutes.ts
var router4 = (0, import_express4.Router)();
router4.use(protect);
router4.post("/", createDeposit);
router4.get("/", getDeposits);
var depositRoutes_default = router4;

// src/routes/withdrawalRoutes.ts
var import_express5 = __toESM(require("express"), 1);

// src/models/Withdrawal.ts
var import_mongoose13 = __toESM(require("mongoose"), 1);
var WithdrawalSchema = new import_mongoose13.Schema(
  {
    userId: { type: import_mongoose13.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "INR", "EUR"], default: "USD" },
    bankDetails: { type: import_mongoose13.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    adminNotes: { type: String }
  },
  { timestamps: true }
);
var WithdrawalModel = import_mongoose13.default.model("Withdrawal", WithdrawalSchema);

// src/controllers/withdrawalController.ts
init_Wallet();
var requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = "USD", bankDetails } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet || amount > wallet.freeMargin) {
      return res.status(400).json({ error: "Insufficient free margin" });
    }
    let payoutDetails = bankDetails;
    if (!payoutDetails || Object.keys(payoutDetails).length === 0) {
      const kyc = await KycModel.findOne({ userId });
      if (!kyc || !kyc.accountNumber || !kyc.ifscCode || !kyc.bankName || !kyc.accountHolderName) {
        return res.status(400).json({ error: "Saved bank payout details are unavailable. Complete KYC first." });
      }
      payoutDetails = {
        accountHolderName: kyc.accountHolderName,
        bankName: kyc.bankName,
        accountNumber: kyc.accountNumber,
        ifscCode: kyc.ifscCode
      };
    }
    const withdrawal = await WithdrawalModel.create({
      userId,
      amount,
      currency,
      bankDetails: payoutDetails,
      status: "PENDING"
    });
    wallet.balance -= amount;
    wallet.equity -= amount;
    await wallet.save();
    await TransactionModel.create({
      userId,
      type: "WITHDRAW",
      amount,
      status: "PENDING",
      referenceId: withdrawal._id.toString(),
      description: `Withdrawal request of ${amount} ${currency}`
    });
    await AuditLogModel.create({
      userId,
      action: "WITHDRAWAL_REQUESTED",
      details: { amount, bankDetails }
    });
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getWithdrawals = async (req, res) => {
  try {
    const userId = req.user.id;
    const withdrawals = await WithdrawalModel.find({ userId });
    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/withdrawalRoutes.ts
var router5 = import_express5.default.Router();
router5.use(protect);
router5.post("/", requestWithdrawal);
router5.get("/", getWithdrawals);
var withdrawalRoutes_default = router5;

// src/routes/kycRoutes.ts
var import_express6 = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);

// src/controllers/kycController.ts
var import_mongoose14 = __toESM(require("mongoose"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var submitKyc = async (req, res) => {
  try {
    console.log("[KYC POST] Request received");
    console.log("[KYC POST] Raw request body:", req.body);
    console.log("[KYC POST] User context:", req.user);
    const rawUserId = req.user?.id;
    if (!rawUserId) {
      console.error("[KYC POST] No user ID found in request");
      return res.status(401).json({ error: "User not authenticated" });
    }
    let userId;
    try {
      userId = new import_mongoose14.default.Types.ObjectId(rawUserId);
      console.log("[KYC POST] Converted userId:", userId);
    } catch (err) {
      console.error("[KYC POST] ObjectId conversion failed:", err);
      return res.status(400).json({ error: "Invalid user ID format" });
    }
    const {
      aadharNumber,
      aadharDocument,
      panNumber,
      panDocument,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId
    } = req.body;
    const MAX_FILE_SIZE_BYTES = Number(process.env.KYC_MAX_FILE_BYTES) || 5 * 1024 * 1024;
    const getBase64Payload = (dataUri) => {
      if (!dataUri || typeof dataUri !== "string") return null;
      const match = dataUri.match(/^data:([\w/+.-]+);base64,(.*)$/s);
      return match ? match[2] : null;
    };
    const saveBase64ToFile = (dataUri, filePrefix) => {
      const payload = getBase64Payload(dataUri);
      if (!payload) return null;
      const buffer = Buffer.from(payload, "base64");
      const uploadsDir = import_path.default.join(process.cwd(), "uploads", "kyc");
      if (!import_fs.default.existsSync(uploadsDir)) import_fs.default.mkdirSync(uploadsDir, { recursive: true });
      const extMatch = dataUri.match(/^data:image\/(\w+);base64,/);
      const ext = extMatch ? extMatch[1] : "bin";
      const fileName = `${filePrefix}_${Date.now()}_${Math.floor(Math.random() * 1e4)}.${ext}`;
      const filePath = import_path.default.join(uploadsDir, fileName);
      import_fs.default.writeFileSync(filePath, buffer);
      const baseUrl = process.env.UPLOAD_BASE_URL || "";
      const rel = import_path.default.relative(import_path.default.join(process.cwd(), "uploads"), filePath).split(import_path.default.sep).join("/");
      return baseUrl ? `${baseUrl}/uploads/${rel}` : `/uploads/${rel}`;
    };
    const missingFields = [];
    if (!aadharNumber) missingFields.push("aadharNumber");
    if (!aadharDocument) missingFields.push("aadharDocument");
    if (!panNumber) missingFields.push("panNumber");
    if (!panDocument) missingFields.push("panDocument");
    if (!accountHolderName) missingFields.push("accountHolderName");
    if (!bankName) missingFields.push("bankName");
    if (!accountNumber) missingFields.push("accountNumber");
    if (!ifscCode) missingFields.push("ifscCode");
    if (missingFields.length > 0) {
      console.error("[KYC POST] Missing required fields:", missingFields);
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }
    console.log(`[KYC POST] Processing submission for user ${userId}`);
    const processDocument = (doc, fieldName) => {
      if (!doc || typeof doc !== "string") return doc || null;
      if (doc.startsWith("data:")) {
        const payload = getBase64Payload(doc);
        if (!payload) return null;
        const estimatedBytes = Buffer.byteLength(payload, "base64");
        console.log(`[KYC POST] ${fieldName} size bytes:`, estimatedBytes);
        if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
          const err = new Error(`${fieldName} exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`);
          err.statusCode = 413;
          throw err;
        }
        return saveBase64ToFile(doc, fieldName);
      }
      return doc;
    };
    let kyc = await KycModel.findOne({ userId });
    console.log("[KYC POST] Existing KYC record found:", kyc ? kyc._id : "none");
    if (kyc) {
      console.log("[KYC POST] Updating existing KYC record:", kyc._id);
      const storedAadhar = processDocument(aadharDocument, "aadharDocument");
      const storedPan = processDocument(panDocument, "panDocument");
      const updatePayload = {
        aadharNumber,
        aadharDocument: storedAadhar,
        panNumber,
        panDocument: storedPan,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId: upiId || null,
        status: "PENDING"
      };
      console.log("[KYC POST] Update payload:", updatePayload);
      const updatedKyc = await KycModel.findByIdAndUpdate(
        kyc._id,
        { $set: updatePayload },
        { new: true, runValidators: true }
      );
      console.log("[KYC POST] After findByIdAndUpdate, result:", updatedKyc?.toObject());
      kyc = updatedKyc;
    } else {
      console.log("[KYC POST] Creating new KYC record");
      const storedAadhar = processDocument(aadharDocument, "aadharDocument");
      const storedPan = processDocument(panDocument, "panDocument");
      const kycData = {
        userId,
        aadharNumber,
        aadharDocument: storedAadhar,
        panNumber,
        panDocument: storedPan,
        accountHolderName,
        bankName,
        accountNumber,
        ifscCode,
        upiId: upiId || null,
        documents: [],
        status: "PENDING"
      };
      console.log("[KYC POST] KYC creation payload:", kycData);
      kyc = await KycModel.create(kycData);
      console.log(`[KYC POST] Successfully created KYC record:`, kyc._id);
      console.log("[KYC POST] Created data:", kyc.toObject());
    }
    console.log("[KYC POST] Updating user KYC status to PENDING");
    const updateResult = await UserModel.findByIdAndUpdate(
      userId,
      { kycStatus: "PENDING" },
      { new: true }
    );
    console.log("[KYC POST] User updated:", updateResult?._id);
    console.log("[KYC POST] Sending response");
    res.status(200).json({
      success: true,
      message: "KYC submitted successfully",
      kyc: kyc ? kyc.toObject() : null
    });
  } catch (error) {
    console.error("[KYC POST] Error occurred:", error);
    console.error("[KYC POST] Error stack:", error.stack);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to submit KYC",
      details: error.toString()
    });
  }
};
var getKyc = async (req, res) => {
  try {
    const rawUserId = req.user.id;
    const userId = new import_mongoose14.default.Types.ObjectId(rawUserId);
    console.log(`[KYC GET] Request for user ${userId}`);
    let kyc = await KycModel.findOne({ userId });
    const user = await UserModel.findById(userId);
    if (!kyc && user && user.kycStatus !== "UNSUBMITTED") {
      console.log(`[KYC GET] Inconsistency: User has ${user.kycStatus} but no Kyc document found. Creating fallback.`);
      kyc = await KycModel.create({
        userId,
        status: user.kycStatus,
        documents: []
      });
    }
    if (kyc && user) {
      if (kyc.status !== user.kycStatus) {
        console.log(`[KYC GET] Status mismatch fixed: KycModel(${kyc.status}) -> UserModel(${user.kycStatus})`);
        kyc.status = user.kycStatus;
        await kyc.save();
      }
      console.log(`[KYC GET] Found record for user ${userId}: status ${kyc.status}`);
      res.json(kyc);
    } else {
      console.log(`[KYC GET] No record found for user ${userId}, returning UNSUBMITTED`);
      res.json({ status: "UNSUBMITTED", documents: [] });
    }
  } catch (error) {
    console.error(`[KYC GET] Error:`, error);
    res.status(500).json({ error: error.message });
  }
};
var uploadKycFiles = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }
    const baseUrl = process.env.UPLOAD_BASE_URL || "";
    const fileUrls = files.map((f) => {
      const rel = import_path.default.relative(import_path.default.join(process.cwd(), "uploads"), f.path).split(import_path.default.sep).join("/");
      return baseUrl ? `${baseUrl}/uploads/${rel}` : `/uploads/${rel}`;
    });
    try {
      const rawUserId = req.user?.id;
      if (rawUserId) {
        const userId = new import_mongoose14.default.Types.ObjectId(rawUserId);
        let kyc = await KycModel.findOne({ userId });
        if (!kyc) {
          kyc = await KycModel.create({ userId, documents: fileUrls, status: "PENDING" });
        } else {
          kyc.documents = [...kyc.documents || [], ...fileUrls];
          kyc.status = "PENDING";
          await kyc.save();
        }
        await UserModel.findByIdAndUpdate(userId, { kycStatus: "PENDING" });
      }
    } catch (attachErr) {
      console.warn("Could not attach uploaded files to KYC record:", attachErr);
    }
    res.json({ success: true, files: fileUrls });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// src/routes/kycRoutes.ts
var router6 = (0, import_express6.Router)();
router6.use(protect);
var uploadDir = import_path2.default.join(process.cwd(), "uploads", "kyc");
import_fs2.default.mkdirSync(uploadDir, { recursive: true });
var storage = import_multer.default.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    cb(null, unique);
  }
});
var upload = (0, import_multer.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
router6.post("/upload", upload.array("files", 6), uploadKycFiles);
router6.post("/", submitKyc);
router6.get("/", getKyc);
var kycRoutes_default = router6;

// src/routes/tradingRoutes.ts
var import_express7 = require("express");

// src/controllers/tradingController.ts
init_Position();
init_Wallet();
init_market_service();
var getPositions = async (req, res) => {
  try {
    const userId = req.user.id;
    const positions = await PositionModel.find({ userId, status: "OPEN" });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getClosedPositions = async (req, res) => {
  try {
    const userId = req.user.id;
    const closedPositions = await PositionModel.find({ userId, status: "CLOSED" }).sort({ updatedAt: -1 });
    const history = closedPositions.map((position) => ({
      ...position.toObject(),
      id: position._id.toString()
    }));
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createPosition = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, type, volume, openPrice, sl, tp } = req.body;
    const parsedVolume = Number(volume);
    const parsedPrice = openPrice ? Number(openPrice) : 0;
    const user = await UserModel.findById(userId);
    if (!user || user.status !== "ACTIVE") return res.status(403).json({ error: "User not allowed to trade" });
    const currentOpenPositions = await PositionModel.find({ userId, status: "OPEN" });
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(402).json({ error: "Insufficient funds: wallet not found" });
    if (wallet.status !== "ACTIVE") return res.status(403).json({ error: "Wallet is not active" });
    const allPrices = {};
    const walletState = TradingEngine.evaluateWallet(wallet.balance, currentOpenPositions, allPrices);
    const spec = await SymbolSpecification.get(symbol);
    if (!spec || !spec.isActive) return res.status(400).json({ error: "Disabled Symbol" });
    const quote = await MarketService.getQuote(symbol);
    if (!quote) return res.status(503).json({ error: "Market data unavailable" });
    if (quote.marketStatus === "CLOSED") return res.status(400).json({ error: "Market closed" });
    let priceToUse = parsedPrice > 0 ? parsedPrice : PriceService.getExecutionPrice(symbol, type, spec.spread, spec.digits);
    if (!priceToUse || priceToUse <= 0) return res.status(400).json({ error: "Invalid price" });
    let usdRate = 1;
    const sym = spec.symbol.toUpperCase();
    if (!sym.endsWith("USD") && !sym.startsWith("USD")) {
      const quoteCurrency = sym.substring(3);
      if (quoteCurrency === "JPY") {
        const crossQuote = await MarketService.getQuote("USDJPY");
        if (crossQuote && crossQuote.price > 0) usdRate = 1 / crossQuote.price;
      } else if (quoteCurrency === "GBP") {
        const crossQuote = await MarketService.getQuote("GBPUSD");
        if (crossQuote && crossQuote.price > 0) usdRate = crossQuote.price;
      }
    } else if (sym.startsWith("USD") && sym !== "USDUSD") {
      const currentMid = priceToUse;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }
    const marginRequired = MarginCalculator.calculate(symbol, parsedVolume, priceToUse, spec.leverageLimit || 100, usdRate);
    try {
      TradingEngine.validateOrder(
        symbol,
        type,
        parsedVolume,
        walletState.freeMargin,
        marginRequired,
        sl,
        tp,
        priceToUse,
        true
      );
    } catch (err) {
      return res.status(402).json({ error: err.message });
    }
    const position = await PositionModel.create({
      userId,
      symbol: spec.symbol,
      type,
      volume: parsedVolume,
      openPrice: priceToUse,
      currentPrice: priceToUse,
      sl,
      tp,
      status: "OPEN",
      pnl: 0,
      marginUsed: marginRequired
    });
    const updatedPositions = await PositionModel.find({ userId, status: "OPEN" });
    await MarginEngine.calculateMargin(userId, updatedPositions, {});
    res.status(201).json(position);
  } catch (error) {
    console.error(`Error in createPosition:`, error);
    res.status(500).json({ error: error.message });
  }
};
var closePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const position = await PositionModel.findOne({ _id: id, userId, status: "OPEN" });
    if (!position) return res.status(404).json({ error: "Position not found or already closed" });
    const spec = await SymbolSpecification.get(position.symbol);
    let closePrice = req.body.closePrice;
    if (!closePrice) {
      closePrice = PriceService.getExecutionPrice(position.symbol, position.type === "BUY" ? "SELL" : "BUY", spec.spread, spec.digits);
    }
    position.status = "CLOSED";
    position.closePrice = closePrice;
    position.pnl = ProfitCalculator2.calculate(
      position.type,
      position.openPrice,
      closePrice,
      closePrice,
      position.volume,
      position.symbol
    );
    await position.save();
    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.equity = wallet.balance;
      await wallet.save();
      const openPositions = await PositionModel.find({ userId, status: "OPEN" });
      await MarginEngine.calculateMargin(userId, openPositions, {});
    }
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await OrderModel.find({ userId, status: "PENDING" });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, type, volume, targetPrice, sl, tp } = req.body;
    const wallet = await WalletModel.findOne({ userId });
    if (wallet && wallet.status === "FROZEN") {
      return res.status(403).json({ error: "Trading disabled: wallet frozen" });
    }
    const order = await OrderModel.create({
      userId,
      symbol,
      type,
      volume,
      targetPrice,
      sl,
      tp,
      status: "PENDING"
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const order = await OrderModel.findOne({ _id: id, userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    order.status = "CANCELLED";
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var modifyOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { targetPrice, sl, tp } = req.body;
    const order = await OrderModel.findOne({ _id: id, userId, status: "PENDING" });
    if (!order) return res.status(404).json({ error: "Order not found or not pending" });
    if (targetPrice !== void 0) order.targetPrice = targetPrice;
    if (sl !== void 0) order.sl = sl;
    if (tp !== void 0) order.tp = tp;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var modifyPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { sl, tp } = req.body;
    const position = await PositionModel.findOne({ _id: id, userId, status: "OPEN" });
    if (!position) return res.status(404).json({ error: "Position not found or already closed" });
    if (sl !== void 0) position.sl = sl;
    if (tp !== void 0) position.tp = tp;
    await position.save();
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var partialClosePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { volume } = req.body;
    const closeVol = Number(volume);
    if (isNaN(closeVol) || closeVol <= 0) return res.status(400).json({ error: "Invalid volume to close" });
    const position = await PositionModel.findOne({ _id: id, userId, status: "OPEN" });
    if (!position) return res.status(404).json({ error: "Position not found" });
    if (closeVol >= position.volume) {
      req.body.closePrice = void 0;
      return closePosition(req, res);
    }
    const spec = await SymbolSpecification.get(position.symbol);
    let closePrice = req.body.closePrice;
    if (!closePrice) {
      closePrice = PriceService.getExecutionPrice(position.symbol, position.type === "BUY" ? "SELL" : "BUY", spec.spread, spec.digits);
    }
    const fullPnl = ProfitCalculator2.calculate(
      position.type,
      position.openPrice,
      closePrice,
      closePrice,
      position.volume,
      position.symbol
    );
    const { realizedPnl, remainingVolume } = PositionManager.calculatePartialClose(position, closeVol, fullPnl);
    await PositionModel.create({
      userId,
      symbol: position.symbol,
      type: position.type,
      volume: closeVol,
      openPrice: position.openPrice,
      currentPrice: closePrice,
      closePrice,
      sl: position.sl,
      tp: position.tp,
      pnl: realizedPnl,
      commission: position.commission * (closeVol / position.volume),
      swap: position.swap * (closeVol / position.volume),
      marginUsed: 0,
      status: "CLOSED"
    });
    position.volume = remainingVolume;
    position.commission -= position.commission * (closeVol / (position.volume + closeVol));
    position.swap -= position.swap * (closeVol / (position.volume + closeVol));
    await position.save();
    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += realizedPnl;
      wallet.equity = wallet.balance;
      await wallet.save();
      const openPositions = await PositionModel.find({ userId, status: "OPEN" });
      await MarginEngine.calculateMargin(userId, openPositions, {});
    }
    res.json({ message: "Position partially closed", remainingPosition: position });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/tradingRoutes.ts
var router7 = (0, import_express7.Router)();
router7.use(protect);
router7.get("/positions", getPositions);
router7.get("/closed-positions", getClosedPositions);
router7.get("/positions/closed", getClosedPositions);
router7.post("/positions", createPosition);
router7.post("/positions/:id/close", closePosition);
router7.get("/orders", getOrders);
router7.post("/orders", createOrder);
router7.post("/orders/:id/cancel", cancelOrder);
router7.post("/orders/:id/modify", modifyOrder);
router7.post("/positions/:id/modify", modifyPosition);
router7.post("/positions/:id/partial-close", partialClosePosition);
var tradingRoutes_default = router7;

// src/routes/copyTradingRoutes.ts
var import_express8 = __toESM(require("express"), 1);

// src/models/CopyTrader.ts
var import_mongoose15 = __toESM(require("mongoose"), 1);
var CopyTraderSchema = new import_mongoose15.Schema(
  {
    providerId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "User", required: true },
    followerId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "User", required: true },
    allocationRatio: { type: Number, default: 1 },
    profitSharePercent: { type: Number, default: 20 },
    status: { type: String, enum: ["ACTIVE", "PAUSED", "STOPPED"], default: "ACTIVE" }
  },
  { timestamps: true }
);
var CopyTraderModel = import_mongoose15.default.model("CopyTrader", CopyTraderSchema);

// src/controllers/copyTradingController.ts
var becomeProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    await UserModel.findByIdAndUpdate(userId, { isSignalProvider: true });
    res.json({ success: true, message: "You are now a signal provider" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var followProvider = async (req, res) => {
  try {
    const followerId = req.user.id;
    const { providerId, allocationRatio } = req.body;
    const copyTrader = await CopyTraderModel.create({
      providerId,
      followerId,
      allocationRatio,
      status: "ACTIVE"
    });
    await NotificationModel.create({
      userId: providerId,
      title: "New Follower",
      message: "A new user has started copying your trades.",
      type: "INFO"
    });
    res.json(copyTrader);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getProviders = async (req, res) => {
  try {
    const providers = await UserModel.find({ isSignalProvider: true }).select("fullName email");
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/copyTradingRoutes.ts
var router8 = import_express8.default.Router();
router8.get("/providers", getProviders);
router8.use(protect);
router8.post("/become-provider", becomeProvider);
router8.post("/follow", followProvider);
var copyTradingRoutes_default = router8;

// src/routes/watchlistRoutes.ts
var import_express9 = require("express");

// src/models/Watchlist.ts
var import_mongoose16 = __toESM(require("mongoose"), 1);
var WatchlistSchema = new import_mongoose16.Schema(
  {
    userId: { type: import_mongoose16.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    symbols: [{ type: String }]
  },
  { timestamps: true }
);
var WatchlistModel = import_mongoose16.default.model("Watchlist", WatchlistSchema);

// src/controllers/watchlistController.ts
var getWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    let watchlist = await WatchlistModel.findOne({ userId });
    if (!watchlist) {
      watchlist = await WatchlistModel.create({ userId, symbols: ["EURUSD", "GBPUSD", "BTCUSD", "XAUUSD"] });
    }
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updateWatchlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbols } = req.body;
    let watchlist = await WatchlistModel.findOne({ userId });
    if (!watchlist) {
      watchlist = new WatchlistModel({ userId, symbols });
    } else {
      watchlist.symbols = symbols;
    }
    await watchlist.save();
    res.json(watchlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/watchlistRoutes.ts
var router9 = (0, import_express9.Router)();
router9.use(protect);
router9.get("/", getWatchlist);
router9.put("/", updateWatchlist);
var watchlistRoutes_default = router9;

// src/routes/alertRoutes.ts
var import_express10 = require("express");

// src/models/Alert.ts
var import_mongoose17 = __toESM(require("mongoose"), 1);
var AlertSchema = new import_mongoose17.Schema(
  {
    userId: { type: import_mongoose17.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    condition: { type: String, enum: ["ABOVE", "BELOW"], required: true },
    targetPrice: { type: Number, required: true },
    status: { type: String, enum: ["ACTIVE", "TRIGGERED", "DISABLED"], default: "ACTIVE" }
  },
  { timestamps: true }
);
AlertSchema.index(
  { userId: 1, symbol: 1, condition: 1, targetPrice: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);
var AlertModel = import_mongoose17.default.model("Alert", AlertSchema);

// src/controllers/alertController.ts
var getAlerts = async (req, res) => {
  try {
    const userId = req.user.id;
    const alerts = await AlertModel.find({ userId, status: "ACTIVE" });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createAlert = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, condition, targetPrice } = req.body;
    const existingAlert = await AlertModel.findOne({ userId, symbol, condition, targetPrice, status: "ACTIVE" });
    if (existingAlert) {
      return res.status(409).json({ error: "An active alert with these exact conditions already exists." });
    }
    const alert = await AlertModel.create({
      userId,
      symbol,
      condition,
      targetPrice,
      status: "ACTIVE"
    });
    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { symbol, condition, targetPrice } = req.body;
    const updated = await AlertModel.findOneAndUpdate(
      { _id: id, userId },
      { symbol, condition, targetPrice },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Alert not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await AlertModel.findOneAndDelete({ _id: id, userId });
    res.json({ message: "Alert deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/alertRoutes.ts
var router10 = (0, import_express10.Router)();
router10.use(protect);
router10.get("/", getAlerts);
router10.post("/", createAlert);
router10.patch("/:id", updateAlert);
router10.delete("/:id", deleteAlert);
var alertRoutes_default = router10;

// src/routes/adminRoutes.ts
var import_express11 = require("express");

// src/controllers/adminController.ts
init_Wallet();
init_Position();
init_Symbol();

// src/models/News.ts
var import_mongoose18 = __toESM(require("mongoose"), 1);
var NewsSchema = new import_mongoose18.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, default: "global" },
    source: { type: String, required: true },
    authorId: { type: import_mongoose18.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);
var NewsModel = import_mongoose18.default.model("News", NewsSchema);

// src/controllers/adminController.ts
var import_bcryptjs2 = __toESM(require("bcryptjs"), 1);
var logAdminAction = async (adminId, action, details) => {
  await AuditLogModel.create({ adminId, action, details });
};
var sendNotification = async (userId, title, message, type) => {
  await NotificationModel.create({ userId, title, message, type });
};
var getAdminDashboardData = async (req, res) => {
  try {
    const adminUser = await UserModel.findById(req.user.id);
    if (!adminUser || adminUser.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const users = await UserModel.find().select("-password -passwordHash");
    const deposits = await DepositModel.find().populate("userId", "fullName email");
    const kycRequests = await KycModel.find().populate("userId", "fullName email kycStatus");
    const wallets = await WalletModel.find().populate("userId", "fullName email");
    const withdrawals = await WithdrawalModel.find().populate("userId", "fullName email");
    const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
    const startOfDay = /* @__PURE__ */ new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const depositsToday = await DepositModel.find({ createdAt: { $gte: startOfDay } });
    const withdrawalsToday = await WithdrawalModel.find({ createdAt: { $gte: startOfDay } });
    const openPositions = await PositionModel.find({ status: "OPEN" });
    const closedPositions = await PositionModel.find({ status: "CLOSED" });
    res.json({
      users,
      deposits,
      kycRequests,
      wallets,
      withdrawals,
      analytics: {
        totalUsers: users.length,
        activeUsers,
        depositsToday: depositsToday.reduce((sum, d) => sum + d.amount, 0),
        withdrawalsToday: withdrawalsToday.reduce((sum, w) => sum + w.amount, 0),
        openPositions: openPositions.length,
        closedPositions: closedPositions.length,
        totalPlatformVolume: [...openPositions, ...closedPositions].reduce((sum, p) => sum + p.volume, 0),
        totalPnl: openPositions.reduce((sum, p) => sum + p.pnl, 0)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var approveKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const kyc = await KycModel.findById(id);
    if (!kyc) return res.status(404).json({ error: "KYC not found" });
    kyc.status = "APPROVED";
    await kyc.save();
    await UserModel.findByIdAndUpdate(kyc.userId, { kycStatus: "APPROVED" });
    await logAdminAction(req.user.id, "APPROVE_KYC", { kycId: id });
    await sendNotification(kyc.userId, "KYC Approved", "Your KYC has been approved.", "SUCCESS");
    res.json(kyc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var rejectKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const kyc = await KycModel.findById(id);
    if (!kyc) return res.status(404).json({ error: "KYC not found" });
    kyc.status = "REJECTED";
    await kyc.save();
    await UserModel.findByIdAndUpdate(kyc.userId, { kycStatus: "REJECTED" });
    await logAdminAction(req.user.id, "REJECT_KYC", { kycId: id, reason: req.body.reason });
    await sendNotification(kyc.userId, "KYC Rejected", `Your KYC was rejected. Reason: ${req.body.reason}`, "ERROR");
    res.json(kyc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalModel.findById(id);
    if (!withdrawal) return res.status(404).json({ error: "Not found" });
    withdrawal.status = "APPROVED";
    await withdrawal.save();
    const wallet = await WalletModel.findOne({ userId: withdrawal.userId });
    if (wallet) {
      await TransactionModel.create({
        userId: withdrawal.userId,
        type: "WITHDRAWAL",
        amount: withdrawal.amount,
        balanceAfter: wallet.balance,
        description: "Withdrawal Approved"
      });
    }
    await logAdminAction(req.user.id, "APPROVE_WITHDRAWAL", { withdrawalId: id });
    await sendNotification(withdrawal.userId, "Withdrawal Approved", "Your withdrawal has been processed.", "SUCCESS");
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalModel.findById(id);
    if (!withdrawal) return res.status(404).json({ error: "Not found" });
    withdrawal.status = "REJECTED";
    await withdrawal.save();
    const wallet = await WalletModel.findOne({ userId: withdrawal.userId });
    if (wallet) {
      wallet.balance += withdrawal.amount;
      await wallet.save();
      const openPositions = await PositionModel.find({ userId: withdrawal.userId, status: "OPEN" });
      await MarginEngine.calculateMargin(withdrawal.userId.toString(), openPositions, {});
    }
    await logAdminAction(req.user.id, "REJECT_WITHDRAWAL", { withdrawalId: id });
    await sendNotification(withdrawal.userId, "Withdrawal Rejected", "Your withdrawal request was rejected.", "ERROR");
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var adminWalletControl = async (req, res) => {
  try {
    const { userId, action, amount } = req.body;
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    if (action === "CREDIT") {
      wallet.balance += amount;
      await TransactionModel.create({ userId, type: "ADMIN_ADJUSTMENT", amount, balanceAfter: wallet.balance, description: "Admin Credit" });
    } else if (action === "DEBIT") {
      wallet.balance -= amount;
      await TransactionModel.create({ userId, type: "ADMIN_ADJUSTMENT", amount: -amount, balanceAfter: wallet.balance, description: "Admin Debit" });
    } else if (action === "FREEZE") {
      wallet.status = "FROZEN";
    } else if (action === "UNFREEZE") {
      wallet.status = "ACTIVE";
    }
    await wallet.save();
    const openPositions = await PositionModel.find({ userId, status: "OPEN" });
    await MarginEngine.calculateMargin(userId, openPositions, {});
    await logAdminAction(req.user.id, "WALLET_CONTROL", { userId, action, amount });
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var adminUserControl = async (req, res) => {
  try {
    const { userId, action, newPassword } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (action === "DISABLE") user.status = "DISABLED";
    if (action === "ENABLE") user.status = "ACTIVE";
    if (action === "BLOCK_TRADING") user.status = "TRADING_BLOCKED";
    if (action === "RESET_PASSWORD" && newPassword) {
      const salt = await import_bcryptjs2.default.genSalt(10);
      user.password = await import_bcryptjs2.default.hash(newPassword, salt);
    }
    await user.save();
    await logAdminAction(req.user.id, "USER_CONTROL", { userId, action });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getAllUsers = async (req, res) => {
  try {
    const users = await UserModel.find().select("-password -passwordHash");
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getKycRequests = async (req, res) => {
  try {
    const kycRequests = await KycModel.find().populate("userId", "fullName email username kycStatus");
    res.json({ kycRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getWithdrawals2 = async (req, res) => {
  try {
    const withdrawals = await WithdrawalModel.find().populate("userId", "fullName email username");
    res.json({ withdrawals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getSymbols = async (req, res) => {
  try {
    const symbols = await SymbolModel.find().sort({ symbol: 1 });
    res.json({ symbols });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createSymbol = async (req, res) => {
  try {
    const { symbol, name, category, price, leverageLimit, spread } = req.body;
    if (!symbol || !name || price === void 0 || leverageLimit === void 0 || spread === void 0) {
      return res.status(400).json({ error: "Missing required symbol data" });
    }
    const normalized = String(symbol).toUpperCase().trim();
    const existing = await SymbolModel.findOne({ symbol: normalized });
    if (existing) {
      return res.status(400).json({ error: "Symbol already exists" });
    }
    const newSymbol = await SymbolModel.create({
      symbol: normalized,
      name,
      category,
      price: Number(price),
      leverageLimit: Number(leverageLimit),
      spread: Number(spread),
      isActive: true
    });
    await logAdminAction(req.user.id, "CREATE_SYMBOL", { symbol: normalized });
    res.status(201).json(newSymbol);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var toggleSymbol = async (req, res) => {
  try {
    const symbolCode = String(req.params.symbol || "").toUpperCase();
    const symbol = await SymbolModel.findOne({ symbol: symbolCode });
    if (!symbol) return res.status(404).json({ error: "Symbol not found" });
    symbol.isActive = !symbol.isActive;
    await symbol.save();
    await logAdminAction(req.user.id, "TOGGLE_SYMBOL", { symbol: symbolCode, isActive: symbol.isActive });
    res.json(symbol);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var modifySymbol = async (req, res) => {
  try {
    const symbolCode = String(req.params.symbol || "").toUpperCase();
    const { leverageLimit, spread, minLot, maxLot, lotStep } = req.body;
    const symbol = await SymbolModel.findOne({ symbol: symbolCode });
    if (!symbol) return res.status(404).json({ error: "Symbol not found" });
    if (leverageLimit !== void 0) symbol.leverageLimit = Number(leverageLimit);
    if (spread !== void 0) symbol.spread = Number(spread);
    if (minLot !== void 0) symbol.minLot = Number(minLot);
    if (maxLot !== void 0) symbol.maxLot = Number(maxLot);
    if (lotStep !== void 0) symbol.lotStep = Number(lotStep);
    await symbol.save();
    await logAdminAction(req.user.id, "MODIFY_SYMBOL", { symbol: symbolCode, updates: req.body });
    res.json(symbol);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createNews = async (req, res) => {
  try {
    const { title, summary, content, category, source } = req.body;
    if (!title || !summary || !content || !category || !source) {
      return res.status(400).json({ error: "Missing required news fields" });
    }
    const news = await NewsModel.create({
      title,
      summary,
      content,
      category,
      source,
      authorId: req.user.id
    });
    await logAdminAction(req.user.id, "CREATE_NEWS", { newsId: news._id });
    res.status(201).json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var dispatchNotification = async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "Missing notification title or content" });
    }
    if (userId === "ALL" || !userId) {
      const users = await UserModel.find().select("_id");
      const notifications = users.map((user2) => ({ userId: user2._id, title, message: content, type: "INFO" }));
      await NotificationModel.insertMany(notifications);
      await logAdminAction(req.user.id, "DISPATCH_NOTIFICATION", { target: "ALL" });
      return res.json({ success: true, sent: users.length });
    }
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const notification = await NotificationModel.create({ userId, title, message: content, type: "INFO" });
    await logAdminAction(req.user.id, "DISPATCH_NOTIFICATION", { userId, notificationId: notification._id });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var forceCloseTrade = async (req, res) => {
  try {
    const { posId } = req.params;
    const position = await PositionModel.findById(posId);
    if (!position) return res.status(404).json({ error: "Position not found" });
    if (position.status === "CLOSED") {
      return res.status(400).json({ error: "Position already closed" });
    }
    const { MarketService: MarketService2 } = await Promise.resolve().then(() => (init_market_service(), market_service_exports));
    const { TradeUtils: TradeUtils2 } = await Promise.resolve().then(() => (init_tradeUtils(), tradeUtils_exports));
    const quote = await MarketService2.getQuote(position.symbol);
    if (!quote) return res.status(503).json({ error: "Market data unavailable" });
    position.status = "CLOSED";
    position.closePrice = position.type === "BUY" ? quote.bid : quote.ask;
    const sym = await SymbolModel.findOne({ symbol: position.symbol.toUpperCase() });
    position.pnl = ProfitCalculator.calculate(
      position.type,
      position.openPrice,
      position.closePrice,
      position.closePrice,
      position.volume,
      position.symbol
    );
    await position.save();
    const wallet = await WalletModel.findOne({ userId: position.userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.equity = wallet.balance;
      await wallet.save();
      const openPositions = await PositionModel.find({ userId: position.userId, status: "OPEN" });
      await MarginEngine.calculateMargin(position.userId.toString(), openPositions, {});
    }
    await logAdminAction(req.user.id, "FORCE_CLOSE_POSITION", { positionId: posId });
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/controllers/adminDepositController.ts
var import_mongoose19 = __toESM(require("mongoose"), 1);
init_Wallet();
var getAllDeposits = async (req, res) => {
  try {
    const deposits = await DepositModel.find().sort({ createdAt: -1 }).populate("userId", "fullName email");
    res.json({ success: true, deposits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var getDepositById = async (req, res) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id).populate("userId", "fullName email");
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    res.json({ success: true, deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var approveDeposit = async (req, res) => {
  const session = await import_mongoose19.default.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id).session(session);
    if (!deposit) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, error: "Deposit not found" });
    }
    if (deposit.status === "APPROVED") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: "Deposit is already approved" });
    }
    if (deposit.status === "REJECTED") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, error: "Deposit is already rejected" });
    }
    deposit.status = "APPROVED";
    await deposit.save({ session });
    const wallet = await WalletModel.findOne({ userId: deposit.userId }).session(session);
    if (wallet) {
      wallet.balance += deposit.amount;
      wallet.equity = wallet.balance + wallet.pnl;
      wallet.freeMargin = wallet.equity - wallet.margin;
      await wallet.save({ session });
      await TransactionModel.create([{
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: deposit.amount,
        balanceAfter: wallet.balance,
        status: "APPROVED",
        referenceId: deposit._id.toString(),
        description: "Deposit Approved by Admin"
      }], { session });
    }
    await AuditLogModel.create([{ adminId: req.user.id, action: "APPROVE_DEPOSIT", details: { depositId: id } }], { session });
    await NotificationModel.create([{ userId: deposit.userId, title: "Deposit Approved", message: "Your deposit has been approved.", type: "SUCCESS" }], { session });
    await session.commitTransaction();
    session.endSession();
    res.json({ success: true, message: "Deposit approved successfully", deposit });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message });
  }
};
var rejectDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id);
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    if (deposit.status !== "PENDING") {
      return res.status(400).json({ success: false, error: `Deposit is already ${deposit.status}` });
    }
    deposit.status = "REJECTED";
    await deposit.save();
    await AuditLogModel.create({ adminId: req.user.id, action: "REJECT_DEPOSIT", details: { depositId: id } });
    await NotificationModel.create({ userId: deposit.userId, title: "Deposit Rejected", message: "Your deposit has been rejected.", type: "ERROR" });
    res.json({ success: true, message: "Deposit rejected", deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/routes/adminRoutes.ts
var router11 = (0, import_express11.Router)();
router11.use(protect, admin);
router11.get("/dashboard", getAdminDashboardData);
router11.get("/users", getAllUsers);
router11.get("/kyc", getKycRequests);
router11.get("/withdrawals", getWithdrawals2);
router11.get("/symbols", getSymbols);
router11.get("/deposits", getAllDeposits);
router11.get("/deposits/:id", getDepositById);
router11.patch("/deposits/:id/approve", approveDeposit);
router11.patch("/deposits/:id/reject", rejectDeposit);
router11.post("/kyc/:id/approve", approveKyc);
router11.post("/kyc/:id/reject", rejectKyc);
router11.post("/withdrawals/:id/approve", approveWithdrawal);
router11.post("/withdrawals/:id/reject", rejectWithdrawal);
router11.post("/symbols", createSymbol);
router11.post("/symbols/:symbol/toggle", toggleSymbol);
router11.post("/symbols/:symbol/modify", modifySymbol);
router11.post("/news", createNews);
router11.post("/notifications", dispatchNotification);
router11.post("/trades/force-close/:posId", forceCloseTrade);
router11.post("/wallet", adminWalletControl);
router11.post("/user", adminUserControl);
var adminRoutes_default = router11;

// src/routes/paymentSettingsRoutes.ts
var import_express12 = require("express");

// src/models/PaymentSettings.ts
var import_mongoose20 = __toESM(require("mongoose"), 1);
var PaymentSettingsSchema = new import_mongoose20.Schema(
  {
    upiId: { type: String, default: "demo@upi" },
    qrCodeUrl: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    ifscCode: { type: String, default: "" }
  },
  { timestamps: true }
);
var PaymentSettingsModel = import_mongoose20.default.model("PaymentSettings", PaymentSettingsSchema);

// src/controllers/paymentSettingsController.ts
var getPaymentSettings = async (req, res) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var updatePaymentSettings = async (req, res) => {
  try {
    const updates = req.body;
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create(updates);
    } else {
      Object.assign(settings, updates);
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/routes/paymentSettingsRoutes.ts
var router12 = (0, import_express12.Router)();
router12.get("/", getPaymentSettings);
router12.patch("/", protect, admin, updatePaymentSettings);
var paymentSettingsRoutes_default = router12;

// src/routes/market.routes.ts
var import_express13 = __toESM(require("express"), 1);

// src/controllers/market.controller.ts
init_market_service();
init_symbolMapper();
var getTickers = async (req, res) => {
  try {
    const symbols = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY", "EURGBP", "GBPJPY", "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"];
    const quotes = await MarketService.getQuotes(symbols);
    res.json(Object.values(quotes));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getTickerBySymbol = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getWatch = async (req, res) => {
  try {
    const quotes = await MarketService.getWatchQuotes();
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getSymbolDetail = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Symbol parameter is required" });
    }
    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    res.json({
      ...quote,
      displaySymbol: SymbolMapper.getDisplaySymbol(symbol)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getQuotes = async (req, res) => {
  try {
    const symbolParam = req.params.symbol || req.query.symbols;
    const symbols = symbolParam?.split(",").filter(Boolean) || ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY", "EURGBP", "GBPJPY", "XAUUSD", "XAGUSD", "BTCUSD", "ETHUSD"];
    const quotes = await MarketService.getQuotes(symbols);
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getChart = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const interval = req.query.interval || "D1";
    const chart = await MarketService.getHistoricalCandles(symbol, interval);
    res.json(chart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getForex = async (req, res) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory("FOREX");
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getCrypto = async (req, res) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory("CRYPTO");
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getStocks = async (req, res) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory("INDICES");
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getSearch = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const results = await MarketService.searchSymbols(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getQuote = async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) {
      return res.status(400).json({ error: "Symbol parameter is required" });
    }
    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/market.routes.ts
var router13 = import_express13.default.Router();
router13.get("/tickers", getTickers);
router13.get("/tickers/:symbol", getTickerBySymbol);
router13.get("/watch", getWatch);
router13.get("/symbol/:symbol", getSymbolDetail);
router13.get("/quotes/:symbol", getQuotes);
router13.get("/chart/:symbol", getChart);
router13.get("/forex", getForex);
router13.get("/crypto", getCrypto);
router13.get("/stocks", getStocks);
router13.get("/search", getSearch);
router13.get("/quote", getQuote);
var market_routes_default = router13;

// src/routes/newsRoutes.ts
var import_express14 = __toESM(require("express"), 1);

// src/services/newsService.ts
var import_axios2 = __toESM(require("axios"), 1);
var MARKET_AUX_BASE_URL = "https://api.marketaux.com/v1";
var CACHE_TTL_MS = 1e3 * 60 * 2;
var RETRY_ATTEMPTS = 1;
var FOREX_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "EURJPY",
  "GBPJPY",
  "EURGBP",
  "XAUUSD",
  "XAGUSD",
  "BTCUSD",
  "ETHUSD"
];
var DEFAULT_FILTER_PARAMS = {
  filter_entities: true,
  must_have_entities: true,
  language: "en",
  group_similar: true
};
var NewsService = class {
  static cache = /* @__PURE__ */ new Map();
  static http = import_axios2.default.create({
    baseURL: MARKET_AUX_BASE_URL,
    timeout: 1e4
  });
  static getApiToken() {
    const apiToken = process.env.MARKETAUX_API_KEY;
    if (!apiToken) {
      throw new Error("MARKETAUX_API_KEY is not configured");
    }
    return apiToken;
  }
  static buildCacheKey(path5, params) {
    const normalizedParams = { ...params };
    delete normalizedParams.api_token;
    return `${path5}|${JSON.stringify(normalizedParams)}`;
  }
  static async fetchFromMarketAux(path5, params) {
    const apiToken = this.getApiToken();
    const cacheKey = this.buildCacheKey(path5, params);
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
    const request = async () => {
      const response = await this.http.get(path5, {
        params: {
          api_token: apiToken,
          ...params
        }
      });
      return response.data;
    };
    let lastError;
    for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt += 1) {
      try {
        const result = await request();
        this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: result });
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === RETRY_ATTEMPTS) {
          throw error;
        }
      }
    }
    throw lastError;
  }
  static normalizeSentiment(value) {
    if (!value && value !== 0) {
      return "Neutral";
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized.includes("positive") || normalized.includes("bullish")) return "Positive";
      if (normalized.includes("negative") || normalized.includes("bearish")) return "Negative";
      return "Neutral";
    }
    if (typeof value === "number") {
      if (value > 0.1) return "Positive";
      if (value < -0.1) return "Negative";
      return "Neutral";
    }
    return "Neutral";
  }
  static extractSymbols(item) {
    if (!Array.isArray(item.entities)) return [];
    return item.entities.map((entity) => entity.name || entity.symbol || "").filter((value) => typeof value === "string" && value.length > 0).map((value) => value.toUpperCase()).filter((value, index, array) => array.indexOf(value) === index);
  }
  static normalizeArticles(data) {
    const items = Array.isArray(data) ? data : data?.data && Array.isArray(data.data) ? data.data : data?.articles && Array.isArray(data.articles) ? data.articles : data && typeof data === "object" ? [data] : [];
    return items.map((item, index) => {
      const title = item.title || item.headline || item.summary || "Market update";
      const summary = item.description || item.summary || item.body || "";
      const url = item.url || item.source_url || item.link || "";
      const imageUrl = item.image_url || item.image || item.thumbnail || "";
      const source = item.source || item.clean_url || item.source_name || item.provider_name || "MarketAux";
      const publishedAt = item.published_at || item.publishedAt || item.created_at || (/* @__PURE__ */ new Date()).toISOString();
      const sentiment = this.normalizeSentiment(item.sentiment || item.sentiment_label || item.sentiment_score);
      const relatedSymbols = this.extractSymbols(item);
      const id = item.uuid || item.id || url || `${title}-${index}`;
      return {
        id,
        uuid: item.uuid || id,
        title,
        summary,
        url,
        imageUrl,
        source,
        publishedAt,
        sentiment,
        relatedSymbols,
        content: item.body || item.content || summary
      };
    });
  }
  static async getLatestNews() {
    const response = await this.fetchFromMarketAux("/news/all", {
      per_page: 20,
      ...DEFAULT_FILTER_PARAMS,
      sort: "published_at:desc"
    });
    return this.normalizeArticles(response);
  }
  static async getForexNews() {
    const response = await this.fetchFromMarketAux("/news/all", {
      per_page: 20,
      symbols: FOREX_SYMBOLS.join(","),
      ...DEFAULT_FILTER_PARAMS,
      sort: "published_at:desc"
    });
    return this.normalizeArticles(response);
  }
  static async getSymbolNews(symbol) {
    const normalizedSymbol = String(symbol || "").toUpperCase();
    const response = await this.fetchFromMarketAux("/news/all", {
      per_page: 20,
      symbols: normalizedSymbol,
      ...DEFAULT_FILTER_PARAMS,
      sort: "published_at:desc"
    });
    return this.normalizeArticles(response);
  }
  static async searchNews(query) {
    const response = await this.fetchFromMarketAux("/news/all", {
      per_page: 20,
      q: String(query || ""),
      ...DEFAULT_FILTER_PARAMS,
      sort: "published_at:desc"
    });
    return this.normalizeArticles(response);
  }
  static async getArticle(uuid) {
    const response = await this.fetchFromMarketAux(`/news/uuid/${encodeURIComponent(uuid)}`, {});
    const articles = this.normalizeArticles(response);
    return articles[0] || null;
  }
  static async getSimilarArticles(uuid) {
    const response = await this.fetchFromMarketAux(`/news/similar/${encodeURIComponent(uuid)}`, {
      per_page: 10,
      ...DEFAULT_FILTER_PARAMS
    });
    return this.normalizeArticles(response);
  }
  static async getSources() {
    const response = await this.fetchFromMarketAux("/news/sources", {});
    const items = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
    return items.map((source) => ({
      id: source.id || source.name || source.url || String(source),
      name: source.name || source.title || source.id || String(source),
      url: source.url || source.website || ""
    }));
  }
};

// src/controllers/newsController.ts
var getLatestNews = async (req, res) => {
  try {
    const news = await NewsService.getLatestNews();
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch latest news" });
  }
};
var getForexNews = async (req, res) => {
  try {
    const news = await NewsService.getForexNews();
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch forex news" });
  }
};
var getSymbolNews = async (req, res) => {
  try {
    const symbol = String(req.params.symbol || "");
    const news = await NewsService.getSymbolNews(symbol);
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch news for symbol" });
  }
};
var searchNews = async (req, res) => {
  try {
    const query = String(req.query.q || "");
    const news = await NewsService.searchNews(query);
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to search news" });
  }
};
var getArticle = async (req, res) => {
  try {
    const uuid = String(req.params.uuid || "");
    const article = await NewsService.getArticle(uuid);
    res.json({ article });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch article" });
  }
};
var getSimilarArticles = async (req, res) => {
  try {
    const uuid = String(req.params.uuid || "");
    const news = await NewsService.getSimilarArticles(uuid);
    res.json({ news });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch similar articles" });
  }
};
var getNewsSources = async (req, res) => {
  try {
    const sources = await NewsService.getSources();
    res.json({ sources });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch news sources" });
  }
};

// src/routes/newsRoutes.ts
var router14 = import_express14.default.Router();
router14.get("/", getLatestNews);
router14.get("/forex", getForexNews);
router14.get("/search", searchNews);
router14.get("/sources", getNewsSources);
router14.get("/article/:uuid/similar", getSimilarArticles);
router14.get("/article/:uuid", getArticle);
router14.get("/:symbol", getSymbolNews);
var newsRoutes_default = router14;

// src/routes/economicCalendarRoutes.ts
var import_express15 = __toESM(require("express"), 1);

// src/controllers/economicCalendarController.ts
var import_promises = __toESM(require("fs/promises"), 1);
var import_path3 = __toESM(require("path"), 1);

// src/providers/forexCalendarProvider.ts
var import_axios3 = __toESM(require("axios"), 1);
var API_HOST = process.env.RAPID_API_FOREX_CALENDAR_HOST || "forex-calendar.p.rapidapi.com";
var API_KEY = process.env.RAPIDAPI_KEY;
if (!API_KEY) {
  throw new Error("RAPIDAPI_KEY is not configured in .env");
}
var client = import_axios3.default.create({
  baseURL: `https://${API_HOST}`,
  timeout: 15e3,
  headers: {
    "x-rapidapi-host": API_HOST,
    "x-rapidapi-key": API_KEY,
    "Content-Type": "application/json"
  }
});
var HIGH_IMPACT_PATTERNS = /interest rate|rate decision|non farm payroll|nfp|unemployment|inflation|cpi|ppi|gdp|central bank|fed|ecb|bank of england|boe|bank of japan|boj/i;
var MEDIUM_IMPACT_PATTERNS = /consumer|retail|manufacturing|industrial|services|business|pmi|inventory|trade|balance|confidence|survey/i;
function normalizeImpact(event, currency) {
  const text = `${event ?? ""} ${currency ?? ""}`;
  if (HIGH_IMPACT_PATTERNS.test(text)) return "High";
  if (MEDIUM_IMPACT_PATTERNS.test(text)) return "Medium";
  return "Low";
}
function buildId(event, index) {
  const safeDate = event.date?.replace(/[^0-9]/g, "") ?? "unknown";
  const safeTime = event.time?.replace(/[^0-9apmAPM:]/g, "") ?? "unknown";
  const safeCurrency = event.currency?.replace(/[^A-Z]/gi, "") ?? "GLOBAL";
  const safeName = event.event?.replace(/[^a-zA-Z0-9]/g, "-") ?? "event";
  return `${safeDate}-${safeTime}-${safeCurrency}-${safeName}-${index}`;
}
function normalizeEvent(event, index) {
  const country = event.currency?.trim() || "GLOBAL";
  return {
    id: buildId(event, index),
    country,
    impact: normalizeImpact(event.event, event.currency),
    date: event.date ?? "",
    time: event.time ?? "",
    currency: event.currency ?? "",
    event: event.event ?? "",
    actual: event.actual ?? "",
    forecast: event.forecast ?? "",
    previous: event.previous ?? ""
  };
}
async function fetchForexCalendar(timezone = "America/New_York") {
  const response = await client.get("/api/v1/forex_calendar/forex_calendar", {
    params: {
      use_12h: true,
      target_timezone: timezone
    }
  });
  const payload = response.data;
  const calendar = Array.isArray(payload?.calendar) ? payload.calendar : [];
  return calendar.map((item, index) => normalizeEvent(item, index));
}

// src/controllers/economicCalendarController.ts
var DATA_DIR = import_path3.default.join(process.cwd(), "data");
var CALENDAR_FILE = import_path3.default.join(DATA_DIR, "economicCalendar.json");
async function readStoredCalendar() {
  try {
    const raw = await import_promises.default.readFile(CALENDAR_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.calendar) ? parsed.calendar : parsed;
  } catch (err) {
    return null;
  }
}
var getEconomicCalendar = async (req, res) => {
  try {
    const stored = await readStoredCalendar();
    const refresh = String(req.query.refresh || "false").toLowerCase() === "true";
    const timezone = String(req.query.target_timezone || req.query.timezone || "America/New_York");
    if (!refresh && stored && stored.length > 0) {
      return res.json({ calendar: stored });
    }
    try {
      const fetched = await fetchForexCalendar(timezone);
      if (fetched.length > 0) {
        await import_promises.default.mkdir(DATA_DIR, { recursive: true });
        await import_promises.default.writeFile(CALENDAR_FILE, JSON.stringify({ calendar: fetched }, null, 2), "utf8");
        return res.json({ calendar: fetched });
      }
    } catch (fetchError) {
      console.warn("[EconomicCalendar] remote fetch failed:", fetchError);
    }
    if (stored && stored.length > 0) {
      return res.json({ calendar: stored });
    }
    res.json({
      calendar: [
        {
          id: "1",
          country: "US",
          event: "Non Farm Payroll",
          impact: "High",
          date: "2026-01-01T00:00:00Z"
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch economic calendar" });
  }
};
var importEconomicCalendar = async (req, res) => {
  try {
    const payload = req.body;
    const calendar = Array.isArray(payload) ? payload : payload.calendar || payload?.data || null;
    if (!calendar || !Array.isArray(calendar)) {
      return res.status(400).json({ error: "Invalid payload. Expected { calendar: [ ... ] }" });
    }
    await import_promises.default.mkdir(DATA_DIR, { recursive: true });
    await import_promises.default.writeFile(CALENDAR_FILE, JSON.stringify({ calendar }, null, 2), "utf8");
    res.json({ success: true, calendar });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to import calendar" });
  }
};

// src/routes/economicCalendarRoutes.ts
var router15 = import_express15.default.Router();
router15.get("/", getEconomicCalendar);
router15.post("/import", importEconomicCalendar);
var economicCalendarRoutes_default = router15;

// src/routes/orderRoutes.ts
var import_express16 = require("express");

// src/controllers/orderController.ts
var getOrders2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await OrderModel.find({ userId });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getOrderById = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await OrderModel.findOne({ _id: req.params.id, userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createOrder2 = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, type, volume, price, targetPrice, status } = req.body;
    const { WalletModel: WalletModel2 } = await Promise.resolve().then(() => (init_Wallet(), Wallet_exports));
    const wallet = await WalletModel2.findOne({ userId });
    if (wallet && wallet.status === "FROZEN") {
      return res.status(403).json({ error: "Trading disabled: wallet frozen" });
    }
    const order = await OrderModel.create({
      userId,
      symbol,
      type,
      volume,
      price,
      targetPrice: targetPrice || price || 0,
      status: status || "PENDING"
    });
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updateOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await OrderModel.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var deleteOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const order = await OrderModel.findOneAndDelete({ _id: req.params.id, userId });
    if (!order) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }
    res.json({ message: "Order successfully deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/orderRoutes.ts
var router16 = (0, import_express16.Router)();
router16.use(protect);
router16.route("/").get(getOrders2).post(createOrder2);
router16.route("/:id").get(getOrderById).patch(updateOrder).delete(deleteOrder);
var orderRoutes_default = router16;

// src/routes/profileRoutes.ts
var import_express17 = __toESM(require("express"), 1);

// src/controllers/profileController.ts
var getProfile2 = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const kyc = await KycModel.findOne({ userId: user._id }).lean();
    res.status(200).json({
      _id: user._id,
      username: user.username,
      name: user.fullName || user.username,
      email: user.email,
      phone: user.phone || "",
      country: user.country || "",
      avatar: user.avatar || "",
      createdAt: user.createdAt,
      kycStatus: user.kycStatus || "UNSUBMITTED",
      kycDetails: kyc ? {
        status: kyc.status,
        accountHolderName: kyc.accountHolderName || "",
        bankName: kyc.bankName || "",
        accountNumber: kyc.accountNumber || "",
        ifscCode: kyc.ifscCode || "",
        upiId: kyc.upiId || ""
      } : null
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
var updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const { name, phone, country, avatar } = req.body;
    if (name && typeof name !== "string") {
      res.status(400).json({ message: "Validation Error: name must be string" });
      return;
    }
    if (phone && typeof phone !== "string") {
      res.status(400).json({ message: "Validation Error: phone must be string" });
      return;
    }
    if (country && typeof country !== "string") {
      res.status(400).json({ message: "Validation Error: country must be string" });
      return;
    }
    if (avatar && typeof avatar !== "string") {
      res.status(400).json({ message: "Validation Error: avatar must be string" });
      return;
    }
    const updateFields = {};
    if (name) updateFields.fullName = name;
    if (phone !== void 0) updateFields.phone = phone;
    if (country !== void 0) updateFields.country = country;
    if (avatar !== void 0) updateFields.avatar = avatar;
    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    if (!updatedUser) {
      res.status(404).json({ message: "User Not Found" });
      return;
    }
    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone || "",
      country: updatedUser.country || "",
      avatar: updatedUser.avatar || "",
      createdAt: updatedUser.createdAt
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// src/routes/profileRoutes.ts
var router17 = import_express17.default.Router();
router17.get("/", protect, getProfile2);
router17.put("/", protect, updateProfile);
var profileRoutes_default = router17;

// src/routes/transactionRoutes.ts
var import_express18 = require("express");

// src/controllers/transactionController.ts
var getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const transactions = await TransactionModel.find({ userId }).sort({ createdAt: -1 });
    const formatted = transactions.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description || "",
      createdAt: t.createdAt
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/transactionRoutes.ts
var router18 = (0, import_express18.Router)();
router18.get("/", protect, getTransactions);
var transactionRoutes_default = router18;

// server.ts
var import_path4 = __toESM(require("path"), 1);
import_dotenv3.default.config({ path: "./.env" });
console.log("MONGO URI =", process.env.MONGODB_URI);
var app = (0, import_express19.default)();
var allowedOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174").split(",").map((origin) => origin.trim()).filter(Boolean);
app.use((0, import_cors.default)({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    console.warn(`CORS blocked origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(import_express19.default.json({ limit: "50mb" }));
app.use(import_express19.default.urlencoded({ limit: "50mb", extended: true }));
app.use("/uploads", import_express19.default.static(import_path4.default.join(process.cwd(), "uploads")));
app.use("/api/auth", authRoutes_default);
app.use("/api/health", healthRoutes_default);
app.use("/api/wallet", walletRoutes_default);
app.use("/api/deposits", depositRoutes_default);
app.use("/api/withdrawals", withdrawalRoutes_default);
app.use("/api/transactions", transactionRoutes_default);
app.use("/api/kyc", kycRoutes_default);
app.use("/api/trading", tradingRoutes_default);
app.get("/api/trading/closed-positions", protect, getClosedPositions);
app.get("/api/trading/positions/closed", protect, getClosedPositions);
app.use("/api/copy-trading", copyTradingRoutes_default);
app.use("/api/watchlist", watchlistRoutes_default);
app.use("/api/alerts", alertRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api/payment-settings", paymentSettingsRoutes_default);
app.use("/api/market", market_routes_default);
app.use("/api/news", newsRoutes_default);
app.use("/api/economic-calendar", economicCalendarRoutes_default);
app.use("/api/orders", orderRoutes_default);
app.use("/api/profile", profileRoutes_default);
app.use(errorHandler);
var server = import_http.default.createServer(app);
SocketServer.init(server);
var start = async () => {
  await connectDatabase();
  const PORT = Number(process.env.PORT) || 8e3;
  server.listen(PORT, () => {
    console.log(`\u{1F680} Server running on port ${PORT}`);
    PriceEngine.start();
  });
};
start();
//# sourceMappingURL=server.cjs.map
