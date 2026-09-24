var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/models/User.ts
import mongoose2, { Schema } from "mongoose";
var UserSchema, UserModel;
var init_User = __esm({
  "src/models/User.ts"() {
    "use strict";
    UserSchema = new Schema(
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
        sessionVersion: { type: Number, default: 0 },
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
    UserModel = mongoose2.model("User", UserSchema);
  }
});

// src/models/Wallet.ts
var Wallet_exports = {};
__export(Wallet_exports, {
  WalletModel: () => WalletModel
});
import mongoose3, { Schema as Schema2 } from "mongoose";
var WalletSchema, roundToTwo, WalletModel;
var init_Wallet = __esm({
  "src/models/Wallet.ts"() {
    "use strict";
    WalletSchema = new Schema2(
      {
        userId: { type: Schema2.Types.ObjectId, required: true, ref: "User" },
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
      this.pnl = this.pnl;
      this.freeMargin = Math.max(0, roundToTwo(this.equity - this.margin));
    });
    WalletSchema.pre("findOneAndUpdate", async function() {
      const update = this.getUpdate();
      if (update && update.$set) {
        if (update.$set.balance !== void 0) update.$set.balance = Math.max(0, roundToTwo(update.$set.balance));
        if (update.$set.equity !== void 0) update.$set.equity = Math.max(0, roundToTwo(update.$set.equity));
        if (update.$set.margin !== void 0) update.$set.margin = Math.max(0, roundToTwo(update.$set.margin));
        if (update.$set.pnl !== void 0) update.$set.pnl = update.$set.pnl;
        if (update.$set.equity !== void 0 || update.$set.margin !== void 0) {
        }
        if (update.$set.freeMargin !== void 0) {
          update.$set.freeMargin = Math.max(0, roundToTwo(update.$set.freeMargin));
        }
      }
    });
    WalletModel = mongoose3.model("Wallet", WalletSchema);
  }
});

// src/services/socketServer.ts
import { Server } from "socket.io";
var SocketServer;
var init_socketServer = __esm({
  "src/services/socketServer.ts"() {
    "use strict";
    SocketServer = class {
      static io = null;
      static connectedUsers = /* @__PURE__ */ new Set();
      static init(server2) {
        if (this.io) {
          return this.io;
        }
        const allowedOrigins2 = (process.env.FRONTEND_URL || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174,https://www.novaf.in,https://novaf.in,https://www.novaf.online,https://novaf.online,https://forex-frontend-2dmzc8t8z-forextradebio-boops-projects.vercel.app").split(",").map((origin) => origin.trim()).filter(Boolean);
        this.io = new Server(server2, {
          cors: {
            origin: (origin, callback) => {
              if (!origin) {
                return callback(null, true);
              }
              if (allowedOrigins2.includes(origin)) {
                return callback(null, true);
              }
              if (/\.vercel\.app$/i.test(origin) || /\.onrender\.com$/i.test(origin)) {
                return callback(null, true);
              }
              console.warn(`[Socket.IO CORS] Rejected Origin: ${origin}`);
              return callback(new Error("Not allowed by CORS"));
            },
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
          },
          transports: ["websocket", "polling"],
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
      static broadcastTransactionUpdate(userId) {
        if (this.io) {
          this.io.to(userId).emit("transaction");
        }
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
      GER40: { providerSymbol: "^GDAXI", category: "INDICES", displaySymbol: "GER 40" },
      USOIL: { providerSymbol: "CL=F", category: "METALS", displaySymbol: "USOIL" }
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

// src/models/Symbol.ts
var Symbol_exports = {};
__export(Symbol_exports, {
  SymbolModel: () => SymbolModel
});
import mongoose6, { Schema as Schema5 } from "mongoose";
var SymbolSchema, SymbolModel;
var init_Symbol = __esm({
  "src/models/Symbol.ts"() {
    "use strict";
    SymbolSchema = new Schema5(
      {
        symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
        name: { type: String, required: true },
        category: { type: String, required: true, default: "FOREX" },
        price: { type: Number, required: true, default: 0 },
        leverageLimit: { type: Number, required: true, default: 500 },
        spread: { type: Number, required: true, default: 1 },
        contractSize: { type: Number, required: true, default: 1e5 },
        digits: { type: Number, required: true, default: 5 },
        tickSize: { type: Number },
        tickValue: { type: Number },
        minLot: { type: Number, required: true, default: 0.01 },
        maxLot: { type: Number, required: true, default: 100 },
        lotStep: { type: Number, required: true, default: 0.01 },
        status: { type: String, enum: ["OPEN", "PAUSED", "CLOSED", "MAINTENANCE"], default: "OPEN" },
        visibleToUsers: { type: Boolean, default: true },
        tradingEnabled: { type: Boolean, default: true }
      },
      { timestamps: true }
    );
    SymbolModel = mongoose6.model("Symbol", SymbolSchema);
  }
});

// src/engine/SymbolSpecification.ts
var SymbolSpecification_exports = {};
__export(SymbolSpecification_exports, {
  SymbolSpecification: () => SymbolSpecification
});
var SymbolSpecification;
var init_SymbolSpecification = __esm({
  "src/engine/SymbolSpecification.ts"() {
    "use strict";
    init_Symbol();
    SymbolSpecification = class {
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
          const dbSym = this.cache.get(sym);
          return this.applyLeverageOverrides(dbSym);
        }
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
      static getSync(symbol) {
        const sym = symbol.toUpperCase();
        if (this.cache.has(sym)) {
          const dbSym = this.cache.get(sym);
          return this.applyLeverageOverrides(dbSym);
        }
        return this.getDefaults(sym);
      }
      static applyLeverageOverrides(symInfo) {
        const sym = symInfo.symbol?.toUpperCase();
        if (!sym) return symInfo;
        if (!symInfo.status) {
          symInfo.status = symInfo.isActive === false ? "CLOSED" : "OPEN";
        }
        if (symInfo.tradingEnabled === void 0 || symInfo.tradingEnabled === null) {
          symInfo.tradingEnabled = symInfo.isActive !== false;
        }
        if (symInfo.leverageLimit === 100) {
          if (sym.startsWith("XAU") || sym.startsWith("XAG")) {
            symInfo.leverageLimit = 500;
          } else if (!sym.includes("BTC") && !sym.includes("ETH") && !sym.includes("US30") && !sym.includes("NAS100") && !sym.includes("SPX500")) {
            symInfo.leverageLimit = 500;
          }
        }
        return symInfo;
      }
      static getDefaults(symbol) {
        const sym = symbol.toUpperCase();
        let contractSize = 1e5;
        let digits = 5;
        let leverageLimit = 500;
        if (sym.startsWith("XAU")) {
          contractSize = 100;
          digits = 3;
          leverageLimit = 500;
        } else if (sym.startsWith("XAG")) {
          contractSize = 5e3;
          digits = 3;
          leverageLimit = 500;
        } else if (["BTCUSD", "ETHUSD"].includes(sym)) {
          contractSize = 1;
          digits = 2;
          leverageLimit = 100;
        } else if (["US30", "NAS100", "SPX500"].includes(sym)) {
          contractSize = 10;
          digits = 2;
          leverageLimit = 100;
        } else if (sym.includes("JPY")) {
          contractSize = 1e5;
          digits = 3;
          leverageLimit = 500;
        } else if (sym === "USOIL") {
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
          status: "OPEN",
          tradingEnabled: true
        };
      }
    };
  }
});

// src/models/ApiKey.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var ApiKeySchema, ApiKeyModel;
var init_ApiKey = __esm({
  "src/models/ApiKey.ts"() {
    "use strict";
    ApiKeySchema = new Schema6(
      {
        provider: {
          type: String,
          required: true,
          uppercase: true,
          // Auto-capitalize custom providers
          default: "TWELVEDATA"
        },
        keyName: {
          type: String,
          required: true
        },
        keyValue: {
          type: String,
          required: false
        },
        status: {
          type: String,
          enum: ["ACTIVE", "INACTIVE", "EXHAUSTED"],
          default: "ACTIVE"
        },
        errorCount: {
          type: Number,
          default: 0
        }
      },
      { timestamps: true }
    );
    ApiKeyModel = mongoose7.model("ApiKey", ApiKeySchema);
  }
});

// src/providers/marketProvider.ts
import axios from "axios";
var MarketProvider;
var init_marketProvider = __esm({
  "src/providers/marketProvider.ts"() {
    "use strict";
    init_symbolMapper();
    init_SymbolSpecification();
    init_ApiKey();
    MarketProvider = class {
      static normalizeSymbol(symbol) {
        return SymbolMapper.normalizeSymbol(symbol);
      }
      // Convert normal symbol to TwelveData format, e.g. EURUSD -> EUR/USD, USOIL -> WTI
      static getTwelveDataSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const map = {
          "USOIL": "WTI",
          "UKOIL": "BRENT",
          "XAUUSD": "XAU/USD",
          "XAGUSD": "XAG/USD",
          "BTCUSD": "BTC/USD",
          "ETHUSD": "ETH/USD",
          "LTCUSD": "LTC/USD",
          "XRPUSD": "XRP/USD",
          "DOGEUSD": "DOGE/USD",
          "BCHUSD": "BCH/USD"
        };
        if (map[normalized]) return map[normalized];
        if (normalized.length === 6 && SymbolMapper.getCategory(normalized) === "FOREX") {
          return `${normalized.substring(0, 3)}/${normalized.substring(3)}`;
        }
        return normalized;
      }
      static getFinnhubSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const category = SymbolMapper.getCategory(normalized);
        if (category === "FOREX") return `OANDA:${normalized.substring(0, 3)}_${normalized.substring(3)}`;
        if (category === "CRYPTO") return `BINANCE:${normalized.replace("USD", "USDT")}`;
        return normalized;
      }
      static getBinanceSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (SymbolMapper.getCategory(normalized) === "CRYPTO") {
          return normalized.replace("USD", "USDT");
        }
        return normalized;
      }
      static mapTimeframeToTwelveData(timeframe) {
        switch (timeframe.toLowerCase()) {
          case "m1":
          case "1m":
            return "1min";
          case "m5":
          case "5m":
            return "5min";
          case "m15":
          case "15m":
            return "15min";
          case "m30":
          case "30m":
            return "30min";
          case "h1":
          case "1h":
            return "1h";
          case "h2":
          case "2h":
            return "2h";
          case "h4":
          case "4h":
            return "4h";
          case "d1":
          case "1d":
            return "1day";
          case "1wk":
            return "1week";
          case "1mo":
            return "1month";
          default:
            return "1day";
        }
      }
      static getYahooSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (normalized.endsWith("USD") && (normalized.startsWith("BTC") || normalized.startsWith("ETH") || normalized.startsWith("LTC") || normalized.startsWith("BCH") || normalized.startsWith("XRP") || normalized.startsWith("DOGE"))) {
          return `${normalized.replace("USD", "")}-USD`;
        }
        const map = {
          "US30": "^DJI",
          "NAS100": "^IXIC",
          "SPX500": "^GSPC",
          "UK100": "^FTSE",
          "GER40": "^GDAXI",
          "USOIL": "CL=F",
          "UKOIL": "BZ=F",
          "NGAS": "NG=F",
          "XAUUSD": "GC=F",
          "XAGUSD": "SI=F"
        };
        if (map[normalized]) return map[normalized];
        if (normalized.length === 6 && SymbolMapper.getCategory(normalized) === "FOREX") {
          return `${normalized}=X`;
        }
        return normalized;
      }
      static yahooFinanceInstance = null;
      static async fetchYahooQuote(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        const yfSymbol = this.getYahooSymbol(normalized);
        if (!this.yahooFinanceInstance) {
          const yahooFinanceLib = (await import("yahoo-finance2")).default;
          this.yahooFinanceInstance = new yahooFinanceLib({ suppressNotices: ["yahooSurvey"] });
        }
        try {
          const payload = await this.yahooFinanceInstance.quote(yfSymbol);
          if (!payload) {
            throw new Error(`Invalid Yahoo response for ${symbol}`);
          }
          const price = Number(payload.regularMarketPrice);
          const previousClose = Number(payload.regularMarketPreviousClose || price);
          return {
            symbol: normalized,
            price,
            bid: Number(payload.bid || price),
            ask: Number(payload.ask || price),
            spread: 0,
            high: Number(payload.regularMarketDayHigh || price),
            low: Number(payload.regularMarketDayLow || price),
            open: Number(payload.regularMarketOpen || price),
            previousClose,
            change: Number(payload.regularMarketChange || 0),
            changePercent: Number(payload.regularMarketChangePercent || 0),
            category: SymbolMapper.getCategory(normalized),
            marketStatus: payload.marketState === "REGULAR" ? "OPEN" : "CLOSED",
            volume: Number(payload.regularMarketVolume || 0),
            timestamp: Date.now()
          };
        } catch (e) {
          throw new Error(`Yahoo Finance error for ${symbol}: ${e.message}`);
        }
      }
      static async fetchFinnhubQuote(symbol, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const fhSymbol = this.getFinnhubSymbol(normalized);
        const url = `https://finnhub.io/api/v1/quote?symbol=${fhSymbol}&token=${apiKey}`;
        const response = await axios.get(url, { timeout: 8e3 });
        const data = response.data;
        if (data.c === 0 && data.h === 0 && data.l === 0) {
          throw new Error(`Invalid Finnhub quote response for ${fhSymbol}`);
        }
        const price = Number(data.c);
        return {
          symbol: normalized,
          price,
          bid: price,
          ask: price,
          spread: 0,
          high: Number(data.h),
          low: Number(data.l),
          open: Number(data.o),
          previousClose: Number(data.pc),
          change: Number(data.d),
          changePercent: Number(data.dp),
          category: SymbolMapper.getCategory(normalized),
          marketStatus: "OPEN",
          volume: 0,
          timestamp: Number(data.t) * 1e3 || Date.now()
        };
      }
      static async fetchBinanceQuote(symbol, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const binanceSymbol = this.getBinanceSymbol(normalized);
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
        const response = await axios.get(url, { timeout: 8e3 });
        const data = response.data;
        const price = Number(data.lastPrice);
        return {
          symbol: normalized,
          price,
          bid: Number(data.bidPrice) || price,
          ask: Number(data.askPrice) || price,
          spread: 0,
          high: Number(data.highPrice),
          low: Number(data.lowPrice),
          open: Number(data.openPrice),
          previousClose: Number(data.prevClosePrice),
          change: Number(data.priceChange),
          changePercent: Number(data.priceChangePercent),
          category: SymbolMapper.getCategory(normalized),
          marketStatus: "OPEN",
          volume: Number(data.volume),
          timestamp: Number(data.closeTime) || Date.now()
        };
      }
      static getCryptoApisSymbol(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (SymbolMapper.getCategory(normalized) === "CRYPTO") {
          return normalized.replace("USD", "");
        }
        return normalized;
      }
      static async fetchCryptoApisQuote(symbol, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const apiSymbol = this.getCryptoApisSymbol(normalized);
        const url = `https://api.freecryptoapi.com/v1/getData?symbol=${apiSymbol}&token=${apiKey}`;
        const response = await axios.get(url, { timeout: 8e3 });
        const data = response.data;
        if (data.status === false || !data.symbols || data.symbols.length === 0) {
          throw new Error(`Invalid CryptoApis quote response for ${apiSymbol}`);
        }
        const item = data.symbols[0];
        const price = Number(item.last);
        const changePercent = Number(item.daily_change_percentage);
        const open = price / (1 + changePercent / 100);
        return {
          symbol: normalized,
          price,
          bid: price,
          ask: price,
          spread: 0,
          high: Number(item.highest),
          low: Number(item.lowest),
          open,
          previousClose: open,
          change: price - open,
          changePercent,
          category: SymbolMapper.getCategory(normalized),
          marketStatus: "OPEN",
          volume: 0,
          // Not provided directly in the same field
          timestamp: new Date(item.date).getTime() || Date.now()
        };
      }
      static async fetchInfowayQuote(symbol, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const url = `https://data.infoway.io/common/v2/batch_kline`;
        const response = await axios.post(url, {
          codes: normalized,
          klineType: 1,
          klineNum: 1
        }, {
          headers: { "apiKey": apiKey },
          timeout: 8e3
        });
        const data = response.data;
        if (data.ret !== 200 || !data.data || data.data.length === 0 || !data.data[0].respList || data.data[0].respList.length === 0) {
          throw new Error(`Invalid Infoway quote response for ${normalized}`);
        }
        const item = data.data[0].respList[0];
        const price = Number(item.c);
        const open = Number(item.o);
        const high = Number(item.h);
        const low = Number(item.l);
        return {
          symbol: normalized,
          price,
          bid: price,
          ask: price,
          spread: 0,
          high,
          low,
          open,
          previousClose: open,
          change: Number(item.pca) || price - open,
          changePercent: parseFloat(item.pc) || 0,
          category: SymbolMapper.getCategory(normalized),
          marketStatus: "OPEN",
          volume: Number(item.v) || 0,
          timestamp: Number(item.t) * 1e3 || Date.now()
        };
      }
      static async fetchQuote(symbol) {
        const activeKeys = await ApiKeyModel.find({ status: "ACTIVE" });
        const providerMap = activeKeys.reduce((acc, key) => {
          acc[key.provider] = key.keyValue;
          return acc;
        }, {});
        const normalized = this.normalizeSymbol(symbol);
        try {
          if (providerMap["INFOWAY"]) return await this.fetchInfowayQuote(normalized, providerMap["INFOWAY"]);
          if (providerMap["CRYPTOAPIS"] && SymbolMapper.getCategory(normalized) === "CRYPTO") return await this.fetchCryptoApisQuote(normalized, providerMap["CRYPTOAPIS"]);
          if (providerMap["FINNHUB"]) return await this.fetchFinnhubQuote(normalized, providerMap["FINNHUB"]);
          if (providerMap["TWELVEDATA"]) return await this.fetchTwelveDataQuote(normalized, providerMap["TWELVEDATA"]);
          if (providerMap["BINANCE"] && SymbolMapper.getCategory(normalized) === "CRYPTO") return await this.fetchBinanceQuote(normalized, providerMap["BINANCE"]);
          if (providerMap["YAHOO"]) return await this.fetchYahooQuote(normalized);
        } catch (e) {
          console.warn(`[MarketProvider] Primary fetch failed: ${e.message}, falling back...`);
        }
        if (providerMap["YAHOO"]) {
          try {
            return await this.fetchYahooQuote(normalized);
          } catch (e) {
            throw new Error(`[MarketProvider] All fetch attempts failed including YAHOO fallback.`);
          }
        }
        throw new Error("No active API keys found for fetching quotes.");
      }
      static async fetchTwelveDataQuote(symbol, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const tdSymbol = this.getTwelveDataSymbol(normalized);
        const url = `https://api.twelvedata.com/quote?symbol=${tdSymbol}&apikey=${apiKey}`;
        const response = await axios.get(url, { timeout: 8e3 });
        const data = response.data;
        if (data.code && data.status === "error") {
          throw new Error(`TwelveData API error: ${data.message}`);
        }
        if (!data.open || !data.close) {
          throw new Error(`Invalid TwelveData quote response for ${tdSymbol}`);
        }
        const price = Number(data.close);
        const previousClose = Number(data.previous_close);
        return {
          symbol: normalized,
          price,
          bid: price,
          ask: price,
          spread: 0,
          high: Number(data.high),
          low: Number(data.low),
          open: Number(data.open),
          previousClose,
          change: Number(data.change),
          changePercent: Number(data.percent_change),
          category: SymbolMapper.getCategory(normalized),
          marketStatus: data.is_market_open ? "OPEN" : "CLOSED",
          volume: Number(data.volume) || 0,
          timestamp: Number(data.timestamp) * 1e3 || Date.now()
        };
      }
      static async fetchHistoricalCandles(symbol, timeframe = "D1") {
        const activeKeys = await ApiKeyModel.find({ status: "ACTIVE" });
        const providerMap = activeKeys.reduce((acc, key) => {
          acc[key.provider] = key.keyValue;
          return acc;
        }, {});
        const normalized = this.normalizeSymbol(symbol);
        try {
          if (providerMap["INFOWAY"]) return await this.fetchInfowayCandles(normalized, timeframe, providerMap["INFOWAY"]);
          if (providerMap["FINNHUB"]) return await this.fetchFinnhubCandles(normalized, timeframe, providerMap["FINNHUB"]);
          if (providerMap["TWELVEDATA"]) return await this.fetchTwelveDataCandles(normalized, timeframe, providerMap["TWELVEDATA"]);
        } catch (e) {
          console.warn(`[MarketProvider] Candles fetch failed: ${e.message}`);
        }
        return [];
      }
      static mapTimeframeToFinnhub(timeframe) {
        switch (timeframe.toLowerCase()) {
          case "m1":
          case "1m":
            return "1";
          case "m5":
          case "5m":
            return "5";
          case "m15":
          case "15m":
            return "15";
          case "m30":
          case "30m":
            return "30";
          case "h1":
          case "1h":
            return "60";
          case "d1":
          case "1d":
            return "D";
          case "1wk":
            return "W";
          case "1mo":
            return "M";
          default:
            return "D";
        }
      }
      static mapTimeframeToInfoway(timeframe) {
        switch (timeframe.toLowerCase()) {
          case "m1":
          case "1m":
            return 1;
          case "m5":
          case "5m":
            return 5;
          case "m15":
          case "15m":
            return 15;
          case "m30":
          case "30m":
            return 30;
          case "h1":
          case "1h":
            return 60;
          case "d1":
          case "1d":
            return 6;
          // Or specific daily code, fallback to 6
          default:
            return 60;
        }
      }
      static async fetchInfowayCandles(symbol, timeframe, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const klineType = this.mapTimeframeToInfoway(timeframe);
        const klineNum = 500;
        const url = `https://data.infoway.io/common/v2/batch_kline`;
        const response = await axios.post(url, {
          codes: normalized,
          klineType,
          klineNum
        }, {
          headers: { "apiKey": apiKey },
          timeout: 1e4
        });
        const data = response.data;
        if (data.ret !== 200 || !data.data || data.data.length === 0 || !data.data[0].respList) {
          return [];
        }
        const respList = data.data[0].respList;
        const candles = [];
        for (let i = 0; i < respList.length; i++) {
          const item = respList[i];
          candles.push({
            time: Number(item.t),
            open: Number(item.o),
            high: Number(item.h),
            low: Number(item.l),
            close: Number(item.c),
            volume: Number(item.v) || 0
          });
        }
        return candles.sort((a, b) => a.time - b.time);
      }
      static async fetchFinnhubCandles(symbol, timeframe, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const fhSymbol = this.getFinnhubSymbol(normalized);
        const fhResolution = this.mapTimeframeToFinnhub(timeframe);
        const to = Math.floor(Date.now() / 1e3);
        const from = to - 30 * 24 * 60 * 60;
        const url = `https://finnhub.io/api/v1/stock/candle?symbol=${fhSymbol}&resolution=${fhResolution}&from=${from}&to=${to}&token=${apiKey}`;
        const response = await axios.get(url, { timeout: 1e4 });
        const data = response.data;
        if (data.s !== "ok") {
          throw new Error(`Finnhub candle error: ${data.s}`);
        }
        const candles = [];
        for (let i = 0; i < data.t.length; i++) {
          candles.push({
            time: data.t[i],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: data.v[i]
          });
        }
        return candles;
      }
      static async fetchTwelveDataCandles(symbol, timeframe, apiKey) {
        const normalized = this.normalizeSymbol(symbol);
        const tdSymbol = this.getTwelveDataSymbol(normalized);
        const tdInterval = this.mapTimeframeToTwelveData(timeframe);
        const url = `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=500&timezone=UTC&apikey=${apiKey}`;
        const response = await axios.get(url, { timeout: 1e4 });
        const data = response.data;
        if (data.code && data.status === "error") {
          throw new Error(`TwelveData API error: ${data.message}`);
        }
        if (!data.values || !Array.isArray(data.values)) {
          return [];
        }
        const nowSeconds = Math.floor(Date.now() / 1e3);
        const candles = data.values.map((v) => ({
          time: Math.floor((/* @__PURE__ */ new Date(v.datetime + "Z")).getTime() / 1e3),
          open: Number(v.open),
          high: Number(v.high),
          low: Number(v.low),
          close: Number(v.close),
          volume: Number(v.volume) || 0
        })).filter((c) => c.time <= nowSeconds).sort((a, b) => a.time - b.time);
        return candles;
      }
      static async fetchMovers(params) {
        const exchange = params.exchange || "US";
        const name = params.name || "volume_gainers";
        const locale = params.locale || "en";
        const rapidApiKey = process.env.RAPIDAPI_KEY || process.env.RAPID_API_KEY;
        if (!rapidApiKey) {
          throw new Error("RapidAPI Key is not configured in .env");
        }
        const response = await axios.get("https://trading-view.p.rapidapi.com/market/get-movers", {
          params: { exchange, name, locale },
          headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "trading-view.p.rapidapi.com",
            "x-rapidapi-key": rapidApiKey
          },
          timeout: 1e4
        });
        const payload = response.data;
        const symbols = Array.isArray(payload?.symbols) ? payload.symbols : [];
        return {
          totalCount: Number(payload?.totalCount ?? symbols.length),
          fields: Array.isArray(payload?.fields) ? payload.fields : [],
          symbols: symbols.map((item) => ({
            s: item?.s,
            f: Array.isArray(item?.f) ? item.f : []
          })),
          time: payload?.time
        };
      }
      static getCategory(symbol) {
        return SymbolMapper.getCategory(symbol);
      }
      static getAllSymbols() {
        return SymbolMapper.getAllSymbols();
      }
      static getSpread(symbol) {
        const spec = SymbolSpecification.getSync(this.normalizeSymbol(symbol));
        return spec.spread !== void 0 ? spec.spread : 1;
      }
      static getDigits(symbol) {
        const spec = SymbolSpecification.getSync(this.normalizeSymbol(symbol));
        return spec.digits !== void 0 ? spec.digits : 5;
      }
    };
  }
});

// src/models/Position.ts
var Position_exports = {};
__export(Position_exports, {
  PositionModel: () => PositionModel
});
import mongoose8, { Schema as Schema7 } from "mongoose";
var PositionSchema, PositionModel;
var init_Position = __esm({
  "src/models/Position.ts"() {
    "use strict";
    PositionSchema = new Schema7(
      {
        userId: { type: Schema7.Types.ObjectId, ref: "User", required: true },
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
        closePrice: { type: Number },
        deletedAt: { type: Date },
        isArchived: { type: Boolean, default: false }
      },
      { timestamps: true }
    );
    PositionModel = mongoose8.model("Position", PositionSchema);
  }
});

// src/models/Order.ts
var Order_exports = {};
__export(Order_exports, {
  OrderModel: () => OrderModel
});
import mongoose9, { Schema as Schema8 } from "mongoose";
var OrderSchema, OrderModel;
var init_Order = __esm({
  "src/models/Order.ts"() {
    "use strict";
    OrderSchema = new Schema8(
      {
        userId: { type: Schema8.Types.ObjectId, ref: "User", required: true },
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
    OrderModel = mongoose9.model("Order", OrderSchema);
  }
});

// src/engine/ProfitCalculator.ts
var ProfitCalculator;
var init_ProfitCalculator = __esm({
  "src/engine/ProfitCalculator.ts"() {
    "use strict";
    init_SymbolSpecification();
    ProfitCalculator = class {
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
        const tickSize = spec.tickSize || Math.pow(10, -(spec.digits || 5));
        const tickValue = spec.tickValue || tickSize * contractSize;
        let rawProfit = 0;
        if (side === "BUY") {
          rawProfit = (currentBid - entryPrice) / tickSize * tickValue * volume;
        } else {
          rawProfit = (entryPrice - currentAsk) / tickSize * tickValue * volume;
        }
        return rawProfit * usdRate;
      }
    };
  }
});

// src/engine/MarginCalculator.ts
var MarginCalculator;
var init_MarginCalculator = __esm({
  "src/engine/MarginCalculator.ts"() {
    "use strict";
    init_SymbolSpecification();
    MarginCalculator = class {
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
      static calculate(symbol, volume, price, leverage, usdRate = 1) {
        const spec = SymbolSpecification.getSync(symbol);
        const contractSize = spec.contractSize || 1e5;
        const rawMargin = price * contractSize * volume / leverage;
        return rawMargin * usdRate;
      }
    };
  }
});

// src/engine/PriceService.ts
var PriceService;
var init_PriceService = __esm({
  "src/engine/PriceService.ts"() {
    "use strict";
    init_market_service();
    PriceService = class {
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
          bid: parseFloat(bid.toFixed(6)),
          ask: parseFloat(ask.toFixed(6)),
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
  }
});

// src/engine/PositionManager.ts
var PositionManager;
var init_PositionManager = __esm({
  "src/engine/PositionManager.ts"() {
    "use strict";
    init_ProfitCalculator();
    init_MarginCalculator();
    init_PriceService();
    init_SymbolSpecification();
    PositionManager = class {
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
        const pnl = ProfitCalculator.calculate(
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
        const currentPrice = side === "BUY" ? prices.bid : prices.ask;
        return { pnl, marginUsed, currentPrice };
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
  }
});

// src/engine/AccountCalculator.ts
var AccountCalculator;
var init_AccountCalculator = __esm({
  "src/engine/AccountCalculator.ts"() {
    "use strict";
    AccountCalculator = class {
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
  }
});

// src/engine/RiskCalculator.ts
var RiskCalculator;
var init_RiskCalculator = __esm({
  "src/engine/RiskCalculator.ts"() {
    "use strict";
    RiskCalculator = class {
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
  }
});

// src/engine/OrderValidator.ts
var OrderValidator;
var init_OrderValidator = __esm({
  "src/engine/OrderValidator.ts"() {
    "use strict";
    init_SymbolSpecification();
    OrderValidator = class {
      /**
       * Validates if a new order can be placed.
       * Throws an error with a specific message if validation fails.
       */
      static validateNewOrder(symbol, side, volume, marginRequired, freeMargin, slPrice, tpPrice, entryPrice, marketEnabled = true) {
        if (!marketEnabled) {
          throw new Error("Market is Closed");
        }
        const spec = SymbolSpecification.getSync(symbol);
        if (!spec || spec.status === "CLOSED" || spec.status === "MAINTENANCE" || !spec.tradingEnabled) {
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
  }
});

// src/engine/TradingEngine.ts
var TradingEngine;
var init_TradingEngine = __esm({
  "src/engine/TradingEngine.ts"() {
    "use strict";
    init_PositionManager();
    init_AccountCalculator();
    init_RiskCalculator();
    init_OrderValidator();
    TradingEngine = class {
      /**
       * Evaluates the full wallet state including all open positions.
       * Modifies the positions in-place with new pnl/margin and returns the wallet metrics.
       */
      static evaluateWallet(walletBalance, positions, allPrices = {}) {
        let usedMargin = 0;
        let totalPnl = 0;
        for (const pos of positions) {
          const { pnl, marginUsed, currentPrice } = PositionManager.evaluateLivePosition(pos, allPrices);
          pos.pnl = pnl;
          pos.marginUsed = marginUsed;
          pos.currentPrice = currentPrice;
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
  }
});

// src/services/marginEngine.ts
var MarginEngine;
var init_marginEngine = __esm({
  "src/services/marginEngine.ts"() {
    "use strict";
    init_Wallet();
    init_TradingEngine();
    init_MarginCalculator();
    init_SymbolSpecification();
    MarginEngine = class {
      static async calculateMargin(userId, positions, prices) {
        const wallet = await WalletModel.findOne({ userId });
        if (!wallet) return null;
        const result = TradingEngine.evaluateWallet(wallet.balance, positions, prices);
        const { PositionModel: PositionModel2 } = await Promise.resolve().then(() => (init_Position(), Position_exports));
        const bulkOps = positions.filter((pos) => pos.status === "OPEN").map((pos) => ({
          updateOne: {
            filter: { _id: pos._id, status: "OPEN" },
            update: { $set: { pnl: pos.pnl, marginUsed: pos.marginUsed, currentPrice: pos.currentPrice } }
          }
        }));
        if (bulkOps.length > 0) {
          await PositionModel2.bulkWrite(bulkOps);
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
  }
});

// src/services/stopLossEngine.ts
var StopLossEngine;
var init_stopLossEngine = __esm({
  "src/services/stopLossEngine.ts"() {
    "use strict";
    init_Wallet();
    init_ProfitCalculator();
    StopLossEngine = class {
      static async evaluatePositions(positions, prices) {
        const closedPositions = [];
        for (const pos of positions) {
          if (pos.status !== "OPEN") continue;
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
            const pnl = ProfitCalculator.calculate(
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
              await WalletModel.findOneAndUpdate(
                { userId: pos.userId },
                { $inc: { balance: pnl } }
              );
              closedPositions.push(updatedPos);
            }
          }
        }
        return closedPositions;
      }
    };
  }
});

// src/services/stopOutEngine.ts
var StopOutEngine;
var init_stopOutEngine = __esm({
  "src/services/stopOutEngine.ts"() {
    "use strict";
    init_Wallet();
    init_Position();
    init_market_service();
    init_socketServer();
    init_ProfitCalculator();
    StopOutEngine = class {
      // Threshold for margin call / stop out (50%)
      static STOP_OUT_LEVEL = 50;
      static async evaluateStopOut(userId, wallet, positions, prices) {
        if (wallet.marginLevel > 0 && wallet.marginLevel < this.STOP_OUT_LEVEL) {
          console.log(`[STOP OUT WARNING] User ${userId} margin level (${wallet.marginLevel.toFixed(2)}%) is below ${this.STOP_OUT_LEVEL}%. Executing Stop Out.`);
          const openPositions = positions.filter((p) => p.status === "OPEN");
          if (openPositions.length === 0) return null;
          openPositions.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
          const worstPosition = openPositions[0];
          try {
            const quote = prices[worstPosition.symbol] || await MarketService.getCachedQuote(worstPosition.symbol);
            if (!quote) return null;
            const closePrice = worstPosition.type === "BUY" ? quote.bid : quote.ask;
            const finalPnl = ProfitCalculator.calculate(
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
              await WalletModel.findOneAndUpdate(
                { userId },
                { $inc: { balance: finalPnl } }
              );
              console.log(`[STOP OUT EXECUTED] Closed position ${updatedPos._id} for user ${userId} with PNL: ${finalPnl}`);
              const io = SocketServer.getIO();
              if (io) {
                io.to(userId.toString()).emit("notification", {
                  type: "ERROR",
                  title: "Stop Out Executed",
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
    };
  }
});

// src/models/Notification.ts
import mongoose10, { Schema as Schema9 } from "mongoose";
var NotificationSchema, NotificationModel;
var init_Notification = __esm({
  "src/models/Notification.ts"() {
    "use strict";
    NotificationSchema = new Schema9(
      {
        userId: { type: Schema9.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, required: true },
        read: { type: Boolean, default: false }
      },
      { timestamps: true }
    );
    NotificationModel = mongoose10.model("Notification", NotificationSchema);
  }
});

// src/models/AuditLog.ts
import mongoose11, { Schema as Schema10 } from "mongoose";
var AuditLogSchema, AuditLogModel;
var init_AuditLog = __esm({
  "src/models/AuditLog.ts"() {
    "use strict";
    AuditLogSchema = new Schema10(
      {
        adminId: { type: Schema10.Types.ObjectId, ref: "User" },
        userId: { type: Schema10.Types.ObjectId, ref: "User" },
        action: { type: String, required: true },
        details: { type: Schema10.Types.Mixed },
        ipAddress: { type: String }
      },
      { timestamps: true }
    );
    AuditLogModel = mongoose11.model("AuditLog", AuditLogSchema);
  }
});

// src/services/orderExecutionEngine.ts
var OrderExecutionEngine;
var init_orderExecutionEngine = __esm({
  "src/services/orderExecutionEngine.ts"() {
    "use strict";
    init_Position();
    init_Wallet();
    init_User();
    init_Symbol();
    init_market_service();
    init_marginEngine();
    init_Notification();
    init_AuditLog();
    OrderExecutionEngine = class {
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
            if (!sym || sym.status === "CLOSED" || sym.status === "MAINTENANCE" || !sym.tradingEnabled) {
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
  }
});

// src/models/MarketSettings.ts
var MarketSettings_exports = {};
__export(MarketSettings_exports, {
  MarketSettingsModel: () => MarketSettingsModel
});
import mongoose12, { Schema as Schema11 } from "mongoose";
var MarketSettingsSchema, MarketSettingsModel;
var init_MarketSettings = __esm({
  "src/models/MarketSettings.ts"() {
    "use strict";
    MarketSettingsSchema = new Schema11(
      {
        status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
        trend: { type: String, enum: ["BULLISH", "BEARISH", "NORMAL"], default: "NORMAL" },
        spread: { type: Number, default: 0.1 },
        volatility: { type: Number, default: 10 },
        // Platform Controls
        globalTradingStatus: { type: String, enum: ["ON", "OFF"], default: "ON" },
        globalGraphStatus: { type: String, enum: ["LIVE", "PAUSED"], default: "LIVE" },
        globalMarketStatus: { type: String, enum: ["OPEN", "CLOSED", "MAINTENANCE", "HOLIDAY"], default: "OPEN" },
        lastUpdatedBy: { type: Schema11.Types.ObjectId, ref: "User" },
        reason: { type: String }
      },
      { timestamps: true }
    );
    MarketSettingsModel = mongoose12.model("MarketSettings", MarketSettingsSchema);
  }
});

// src/services/priceEngine.ts
var priceEngine_exports = {};
__export(priceEngine_exports, {
  PriceEngine: () => PriceEngine
});
var PriceEngine;
var init_priceEngine = __esm({
  "src/services/priceEngine.ts"() {
    "use strict";
    init_market_service();
    init_socketServer();
    init_Position();
    init_Order();
    init_marginEngine();
    init_stopLossEngine();
    init_stopOutEngine();
    init_orderExecutionEngine();
    init_MarketSettings();
    PriceEngine = class {
      static isRunning = false;
      static currentPrices = {};
      static marketSettingsCache = { status: "OPEN" };
      static metrics = {
        priceEngineRuns: 0,
        marketChangesProcessed: 0,
        affectedUsersProcessed: 0,
        positionQueries: 0,
        orderQueries: 0
      };
      static isProcessingTick = false;
      static pendingTick = false;
      static processingTimeout = null;
      static BATCH_DELAY_MS = Number(process.env.PRICE_ENGINE_BATCH_DELAY_MS) || 50;
      // In-memory cache for open positions and orders to prevent querying MongoDB every 50ms
      static activePositionsCache = [];
      static pendingOrdersCache = [];
      static cacheLastUpdated = 0;
      static CACHE_TTL_MS = 1e3;
      // Update cache every 1 second
      static start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("PriceEngine started (Event-driven with in-memory caching)");
        setInterval(async () => {
          try {
            const settings = await MarketSettingsModel.findOne();
            if (settings) {
              this.marketSettingsCache = settings;
            }
          } catch (err) {
            console.error("Error fetching market settings", err);
          }
        }, 5e3);
        setInterval(async () => {
          await this.refreshCache();
        }, this.CACHE_TTL_MS);
      }
      static async refreshCache() {
        try {
          this.metrics.positionQueries++;
          this.activePositionsCache = await PositionModel.find({ status: "OPEN" }).lean();
          this.metrics.orderQueries++;
          this.pendingOrdersCache = await OrderModel.find({ status: "PENDING" }).lean();
          this.cacheLastUpdated = Date.now();
        } catch (err) {
          console.error("[PriceEngine] Error refreshing positions/orders cache:", err);
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
      static async runTickLoop() {
        this.isProcessingTick = true;
        this.pendingTick = false;
        try {
          if (this.marketSettingsCache?.status !== "CLOSED") {
            await this.updateTick();
          }
        } catch (err) {
          console.error("PriceEngine tick error", err);
        } finally {
          this.isProcessingTick = false;
          if (this.pendingTick) {
            setTimeout(() => this.scheduleProcessing(), 0);
          }
        }
      }
      static async updateTick() {
        const changedQuotes = MarketService.consumeDirtyQuotes();
        if (changedQuotes.length === 0) {
          return;
        }
        this.metrics.priceEngineRuns++;
        this.metrics.marketChangesProcessed += changedQuotes.length;
        for (const quote of changedQuotes) {
          this.currentPrices[quote.symbol] = quote;
        }
        SocketServer.broadcastMarketUpdate(changedQuotes);
        SocketServer.broadcastPrices(changedQuotes);
        const changedSymbolNames = new Set(changedQuotes.map((q) => q.symbol));
        if (this.cacheLastUpdated === 0) {
          await this.refreshCache();
        }
        const affectedUserIds = /* @__PURE__ */ new Set();
        for (const pos of this.activePositionsCache) {
          if (changedSymbolNames.has(pos.symbol)) {
            affectedUserIds.add(pos.userId.toString());
          }
        }
        const currentAffectedUsers = Array.from(affectedUserIds);
        const openPositions = this.activePositionsCache.filter((pos) => affectedUserIds.has(pos.userId.toString()));
        const pendingOrders = this.pendingOrdersCache.filter((order) => changedSymbolNames.has(order.symbol));
        const positionsByUser = this.groupByUser(openPositions);
        this.metrics.affectedUsersProcessed += currentAffectedUsers.length;
        const concurrencyLimit = Number(process.env.PRICE_ENGINE_USER_CONCURRENCY) || 50;
        for (let i = 0; i < currentAffectedUsers.length; i += concurrencyLimit) {
          const chunk = currentAffectedUsers.slice(i, i + concurrencyLimit);
          await Promise.all(chunk.map(async (userId) => {
            try {
              let activePositions = positionsByUser[userId] || [];
              const closedBySl = await StopLossEngine.evaluatePositions(activePositions, this.currentPrices);
              if (closedBySl && closedBySl.length > 0) {
                const closedIds = closedBySl.map((p) => p._id.toString());
                activePositions = activePositions.filter((p) => !closedIds.includes(p._id.toString()));
              }
              let wallet = await MarginEngine.calculateMargin(userId, activePositions, this.currentPrices);
              if (wallet) {
                const stopOutResult = await StopOutEngine.evaluateStopOut(userId, wallet, activePositions, this.currentPrices);
                if (stopOutResult && stopOutResult.closedPosition) {
                  activePositions = activePositions.filter((p) => p._id.toString() !== stopOutResult.closedPosition._id.toString());
                  wallet = await MarginEngine.calculateMargin(userId, activePositions, this.currentPrices);
                }
              }
              SocketServer.broadcastPnlUpdate(userId, activePositions);
              if (wallet) {
                SocketServer.broadcastWalletUpdate(userId, wallet);
              }
            } catch (error) {
              console.error(`[PriceEngine] Error processing user ${userId}:`, error);
            }
          }));
        }
        if (pendingOrders.length > 0) {
          await OrderExecutionEngine.evaluateOrders(pendingOrders, this.currentPrices);
        }
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
  }
});

// src/services/market.service.ts
var market_service_exports = {};
__export(market_service_exports, {
  MarketService: () => MarketService
});
import WebSocket from "ws";
var MarketService;
var init_market_service = __esm({
  "src/services/market.service.ts"() {
    "use strict";
    init_marketProvider();
    init_symbolMapper();
    init_ApiKey();
    MarketService = class {
      static CANDLE_TTL_MS = 6e4;
      static latestPriceCache = /* @__PURE__ */ new Map();
      static candleCache = /* @__PURE__ */ new Map();
      static quotePromises = /* @__PURE__ */ new Map();
      static candlePromises = /* @__PURE__ */ new Map();
      static isRunning = false;
      static isRefreshing = false;
      static activeSymbols = [];
      static dirtySymbols = /* @__PURE__ */ new Set();
      static ws = null;
      static binanceWs = null;
      static finnhubWs = null;
      // Automatically populated with all non-crypto active symbols
      static WS_SYMBOLS = [];
      static metrics = {
        providerRequests: 0,
        providerErrors: 0,
        cacheHits: 0,
        cacheMisses: 0,
        activeSymbols: 0,
        lastSuccessfulUpdate: 0,
        staleSymbols: 0
      };
      static async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[MarketService] Starting background market data refresh service");
        try {
          const yahooKey = await ApiKeyModel.findOne({ provider: "YAHOO" });
          this.isYahooActive = yahooKey ? yahooKey.status === "ACTIVE" : false;
        } catch (e) {
          console.error("[MarketService] Error fetching YAHOO state on start");
          this.isYahooActive = false;
        }
        this.activeSymbols = await this.getWatchSymbols();
        this.metrics.activeSymbols = this.activeSymbols.length;
        const cryptoSymbols = ["BTCUSDT", "ETHUSDT", "LTCUSDT", "BCHUSDT", "XRPUSDT", "DOGEUSDT"].map((s) => s.replace("USDT", "USD"));
        this.WS_SYMBOLS = this.activeSymbols.filter((sym) => !cryptoSymbols.includes(sym)).map((sym) => {
          if (sym.length === 6 && !sym.includes("/")) return `${sym.substring(0, 3)}/${sym.substring(3)}`;
          if (sym === "USOIL") return "WTI";
          if (sym === "UKOIL") return "BRENT";
          return sym;
        });
        await this.refreshQuotes(this.WS_SYMBOLS.map((s) => s.replace("/", "")));
        setInterval(async () => {
          try {
            if (this.activeSymbols.length === 0) return;
            const nonWsSymbols = this.activeSymbols.filter(
              (sym) => {
                const isCrypto = cryptoSymbols.includes(sym);
                if (isCrypto && this.binanceWs && this.binanceWs.readyState === 1) return false;
                const isWsActive = this.ws && this.ws.readyState === 1 || this.finnhubWs && this.finnhubWs.readyState === 1;
                if (!isCrypto && isWsActive) {
                  if (this.WS_SYMBOLS.includes(sym) || this.WS_SYMBOLS.includes(sym.replace("/", ""))) return false;
                }
                return true;
              }
            );
            if (nonWsSymbols.length > 0) {
              await this.pollRestQuotes(nonWsSymbols);
            }
          } catch (err) {
            console.error("[MarketService] REST polling error:", err);
          }
        }, 2500);
        this.connectWebSocket();
        this.connectBinanceWebSocket();
        this.connectFinnhubWebSocket();
        const symbolRefreshMs = Number(process.env.SYMBOL_REFRESH_MS) || 6e4;
        setInterval(async () => {
          try {
            this.activeSymbols = await this.getWatchSymbols();
            this.metrics.activeSymbols = this.activeSymbols.length;
            const updatedWsSymbols = this.activeSymbols.filter((sym) => !cryptoSymbols.includes(sym)).map((sym) => {
              if (sym.length === 6 && !sym.includes("/")) return `${sym.substring(0, 3)}/${sym.substring(3)}`;
              if (sym === "USOIL") return "WTI";
              if (sym === "UKOIL") return "BRENT";
              return sym;
            });
            if (updatedWsSymbols.sort().join(",") !== this.WS_SYMBOLS.sort().join(",")) {
              this.WS_SYMBOLS = updatedWsSymbols;
              console.log("[MarketService] Watchlist changed, reconnecting WebSocket...");
              if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
                this.ws.close();
              }
            }
          } catch (err) {
            console.error("[MarketService] Symbol refresh error:", err);
          }
        }, symbolRefreshMs);
      }
      static currentTwelveDataKeyId = null;
      static async reloadProvider(provider) {
        if (provider === "TWELVEDATA") {
          console.log("[MarketService] Forcing TwelveData WebSocket reload...");
          if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) {
            this.ws.close();
          } else {
            this.connectWebSocket();
          }
        } else if (provider === "BINANCE") {
          console.log("[MarketService] Forcing Binance WebSocket reload...");
          if (this.binanceWs && (this.binanceWs.readyState === 0 || this.binanceWs.readyState === 1)) {
            this.binanceWs.close();
          } else {
            this.connectBinanceWebSocket();
          }
        } else if (provider === "FINNHUB") {
          console.log("[MarketService] Forcing Finnhub WebSocket reload...");
          if (this.finnhubWs && (this.finnhubWs.readyState === 0 || this.finnhubWs.readyState === 1)) {
            this.finnhubWs.close();
          } else {
            this.connectFinnhubWebSocket();
          }
        } else if (provider === "YAHOO") {
          console.log("[MarketService] Reloading Yahoo status...");
          const keyRecord = await ApiKeyModel.findOne({ provider: "YAHOO" });
          this.isYahooActive = keyRecord?.status === "ACTIVE";
        }
      }
      static async connectWebSocket() {
        let apiKey = null;
        try {
          const keyRecord = await ApiKeyModel.findOne({ provider: "TWELVEDATA", status: "ACTIVE" });
          if (keyRecord && keyRecord.keyValue) {
            apiKey = keyRecord.keyValue;
            this.currentTwelveDataKeyId = keyRecord._id;
          } else {
            this.currentTwelveDataKeyId = null;
          }
        } catch (e) {
          console.error("[MarketService] Error fetching API Key from DB:", e);
        }
        if (!apiKey) {
          console.warn("[MarketService] No ACTIVE TWELVEDATA_API_KEY found in DB, skipping WebSocket connection");
          return;
        }
        const wsUrl = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`;
        const ws = new WebSocket(wsUrl);
        this.ws = ws;
        ws.on("open", () => {
          console.log(`[MarketService] TwelveData WebSocket connected`);
          const subscribeMsg = {
            action: "subscribe",
            params: {
              symbols: this.WS_SYMBOLS.join(",")
            }
          };
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(subscribeMsg));
          }
        });
        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.event === "price") {
              await this.handleTick(message);
            } else if (message.event === "subscribe-status") {
              console.log("[MarketService] WS Subscribe Status:", message);
              if (message.status === "error" && message.fails) {
                const hasLimitError = message.fails.some(
                  (f) => f.message && (f.message.toLowerCase().includes("limit") || f.message.toLowerCase().includes("quota") || f.message.toLowerCase().includes("plan"))
                );
                if (hasLimitError && this.currentTwelveDataKeyId) {
                  console.warn("[MarketService] TwelveData API Limit reached! Marking key as EXHAUSTED and rotating...");
                  await ApiKeyModel.findByIdAndUpdate(this.currentTwelveDataKeyId, { status: "EXHAUSTED", errorCount: 1 });
                  ws.close();
                }
              }
            } else if (message.event === "error") {
              if (message.message && (message.message.toLowerCase().includes("limit") || message.message.toLowerCase().includes("quota") || message.message.toLowerCase().includes("plan"))) {
                console.warn("[MarketService] TwelveData API Limit reached (Global Error)! Marking key as EXHAUSTED and rotating...");
                if (this.currentTwelveDataKeyId) {
                  await ApiKeyModel.findByIdAndUpdate(this.currentTwelveDataKeyId, { status: "EXHAUSTED", errorCount: 1 });
                }
                ws.close();
              }
            }
          } catch (err) {
            console.error("[MarketService] WS message error:", err);
          }
        });
        ws.on("unexpected-response", (request, response) => {
          console.error(`[MarketService] TwelveData WebSocket unexpected response: ${response.statusCode}`);
          if (response.statusCode === 200) {
            console.error("[MarketService] This usually means API rate limit or plan limit reached.");
          }
        });
        ws.on("close", () => {
          console.log(`[MarketService] TwelveData WebSocket closed. Reconnecting in 10s...`);
          if (this.ws === ws) this.ws = null;
          setTimeout(() => this.connectWebSocket(), 1e4);
        });
        ws.on("error", (err) => {
          console.error("[MarketService] TwelveData WebSocket error:", err.message);
        });
      }
      static async handleTick(tick) {
        const normalized = this.normalizeSymbol(tick.symbol.replace("/", ""));
        if (!normalized) return;
        const existingCached = this.latestPriceCache.get(normalized);
        const newPrice = Number(tick.price);
        if (existingCached) {
          const quote = existingCached.value;
          const changed = quote.price !== newPrice;
          if (changed) {
            const spreadPips = MarketProvider.getSpread(normalized);
            const digits = MarketProvider.getDigits(normalized);
            const pipSize = digits === 2 || digits === 3 ? 0.01 : 1e-4;
            const spreadValue = spreadPips * pipSize;
            quote.price = newPrice;
            quote.bid = Number(newPrice.toFixed(6));
            quote.ask = Number((newPrice + spreadValue).toFixed(6));
            quote.spread = spreadPips;
            if (newPrice > quote.high) quote.high = newPrice;
            if (newPrice < quote.low) quote.low = newPrice;
            quote.timestamp = Date.now();
            existingCached.isStale = false;
            this.dirtySymbols.add(normalized);
            this.metrics.lastSuccessfulUpdate = Date.now();
            const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
            PriceEngine2.scheduleProcessing();
          }
        } else {
          if (!this.quotePromises.has(normalized)) {
            const fetchPromise = (async () => {
              try {
                const baseQuote = await MarketProvider.fetchQuote(normalized);
                this.latestPriceCache.set(normalized, { value: baseQuote, timestamp: Date.now(), isStale: false });
                this.dirtySymbols.add(normalized);
                const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
                PriceEngine2.scheduleProcessing();
              } catch (err) {
                console.warn(`[MarketService] Failed to fetch base quote for ${normalized}: ${err.message}`);
              } finally {
                this.quotePromises.delete(normalized);
              }
            })();
            this.quotePromises.set(normalized, fetchPromise);
          }
        }
      }
      static async connectFinnhubWebSocket() {
        let apiKey = null;
        try {
          const keyRecord = await ApiKeyModel.findOne({ provider: "FINNHUB", status: "ACTIVE" });
          if (keyRecord && keyRecord.keyValue) {
            apiKey = keyRecord.keyValue;
          }
        } catch (e) {
          console.error("[MarketService] Error fetching Finnhub Key from DB:", e);
        }
        if (!apiKey) {
          return;
        }
        const wsUrl = `wss://ws.finnhub.io?token=${apiKey}`;
        const ws = new WebSocket(wsUrl);
        this.finnhubWs = ws;
        ws.on("open", () => {
          console.log(`[MarketService] Finnhub WebSocket connected`);
          for (const symbol of this.WS_SYMBOLS) {
            const fhSymbol = MarketProvider.getFinnhubSymbol(symbol);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "subscribe", symbol: fhSymbol }));
            }
          }
        });
        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === "trade" && message.data && message.data.length > 0) {
              const trade = message.data[0];
              let internalSymbol = trade.s;
              if (trade.s.startsWith("OANDA:")) {
                internalSymbol = trade.s.replace("OANDA:", "").replace("_", "");
              } else if (trade.s.startsWith("BINANCE:")) {
                internalSymbol = trade.s.replace("BINANCE:", "").replace("USDT", "USD");
              }
              await this.handleFinnhubTick(internalSymbol, trade);
            }
          } catch (err) {
          }
        });
        ws.on("close", () => {
          console.log("[MarketService] Finnhub WebSocket closed. Reconnecting in 5s...");
          if (this.finnhubWs === ws) this.finnhubWs = null;
          setTimeout(() => this.connectFinnhubWebSocket(), 5e3);
        });
        ws.on("error", (err) => {
          console.error("[MarketService] Finnhub WebSocket error:", err);
        });
      }
      static async handleFinnhubTick(symbol, trade) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return;
        const existingCached = this.latestPriceCache.get(normalized);
        const newPrice = Number(trade.p);
        if (existingCached) {
          const quote = existingCached.value;
          const changed = quote.price !== newPrice;
          if (changed) {
            const spreadPips = MarketProvider.getSpread(normalized);
            const digits = MarketProvider.getDigits(normalized);
            const pipSize = digits === 2 || digits === 3 ? 0.01 : 1e-4;
            const spreadValue = spreadPips * pipSize;
            quote.price = newPrice;
            quote.bid = Number(newPrice.toFixed(6));
            quote.ask = Number((newPrice + spreadValue).toFixed(6));
            quote.spread = spreadPips;
            if (newPrice > quote.high) quote.high = newPrice;
            if (newPrice < quote.low) quote.low = newPrice;
            quote.timestamp = Date.now();
            existingCached.isStale = false;
            this.dirtySymbols.add(normalized);
            this.metrics.lastSuccessfulUpdate = Date.now();
            const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
            PriceEngine2.scheduleProcessing();
          }
        } else {
          if (!this.quotePromises.has(normalized)) {
            const fetchPromise = (async () => {
              try {
                const baseQuote = await MarketProvider.fetchQuote(normalized);
                this.latestPriceCache.set(normalized, { value: baseQuote, timestamp: Date.now(), isStale: false });
                this.dirtySymbols.add(normalized);
                const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
                PriceEngine2.scheduleProcessing();
              } catch (err) {
                console.warn(`[MarketService] Failed to fetch base quote for ${normalized}: ${err.message}`);
              } finally {
                this.quotePromises.delete(normalized);
              }
            })();
            this.quotePromises.set(normalized, fetchPromise);
          }
        }
      }
      static async connectBinanceWebSocket() {
        try {
          const keyRecord = await ApiKeyModel.findOne({ provider: "BINANCE" });
          if (!keyRecord || keyRecord.status !== "ACTIVE") {
            console.warn("[MarketService] BINANCE provider is INACTIVE or missing, skipping connection");
            return;
          }
        } catch (e) {
          console.error("[MarketService] Error fetching Binance Key from DB:", e);
        }
        const cryptoSymbols = ["BTCUSDT", "ETHUSDT", "LTCUSDT", "BCHUSDT", "XRPUSDT", "DOGEUSDT"];
        const streams = cryptoSymbols.map((s) => s.toLowerCase() + "@ticker").join("/");
        const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
        const ws = new WebSocket(wsUrl);
        this.binanceWs = ws;
        ws.on("open", () => {
          console.log("[MarketService] Binance WebSocket connected (FREE CRYPTO)");
        });
        ws.on("message", async (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.data && message.data.c) {
              const s = message.data.s;
              let symbol = s.replace("USDT", "USD");
              await this.handleBinanceTick(symbol, message.data);
            }
          } catch (err) {
          }
        });
        ws.on("close", () => {
          console.log("[MarketService] Binance WebSocket closed. Reconnecting in 5s...");
          if (this.binanceWs === ws) this.binanceWs = null;
          setTimeout(() => this.connectBinanceWebSocket(), 5e3);
        });
        ws.on("error", (err) => {
          console.error("[MarketService] Binance WebSocket error:", err);
        });
      }
      static async handleBinanceTick(symbol, tick) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return;
        const existingCached = this.latestPriceCache.get(normalized);
        const newPrice = Number(tick.c);
        if (existingCached) {
          const quote = existingCached.value;
          const changed = quote.price !== newPrice;
          if (changed) {
            quote.price = newPrice;
            quote.bid = Number(tick.b) || newPrice;
            quote.ask = Number(tick.a) || newPrice;
            quote.spread = Number((quote.ask - quote.bid).toFixed(6)) * 1e4;
            quote.high = Number(tick.h) || quote.high;
            quote.low = Number(tick.l) || quote.low;
            quote.open = Number(tick.o) || quote.open;
            quote.change = newPrice - quote.open;
            quote.changePercent = quote.open !== 0 ? quote.change / quote.open * 100 : 0;
            quote.volume = Number(tick.v) || quote.volume;
            quote.timestamp = Date.now();
            existingCached.isStale = false;
            this.dirtySymbols.add(normalized);
            this.metrics.lastSuccessfulUpdate = Date.now();
            const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
            PriceEngine2.scheduleProcessing();
          }
        } else {
          const quote = {
            symbol: normalized,
            price: newPrice,
            bid: Number(tick.b) || newPrice,
            ask: Number(tick.a) || newPrice,
            spread: 0,
            high: Number(tick.h) || newPrice,
            low: Number(tick.l) || newPrice,
            open: Number(tick.o) || newPrice,
            previousClose: Number(tick.o) || newPrice,
            change: newPrice - (Number(tick.o) || newPrice),
            changePercent: tick.P ? Number(tick.P) : 0,
            category: "CRYPTO",
            marketStatus: "OPEN",
            volume: Number(tick.v) || 0,
            timestamp: Date.now()
          };
          this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
          this.dirtySymbols.add(normalized);
          const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
          PriceEngine2.scheduleProcessing();
        }
      }
      // Adjusted to only fetch a limited set of symbols to respect API rate limits
      static async refreshQuotes(symbolsToFetch) {
        if (this.isRefreshing) return;
        this.isRefreshing = true;
        try {
          await Promise.all(
            symbolsToFetch.map(async (symbol) => {
              const normalized = this.normalizeSymbol(symbol);
              if (!normalized) return;
              if (this.quotePromises.has(normalized)) {
                return this.quotePromises.get(normalized);
              }
              const fetchPromise = (async () => {
                try {
                  this.metrics.providerRequests++;
                  const quote = await MarketProvider.fetchQuote(normalized);
                  let changed = false;
                  const existingCached = this.latestPriceCache.get(normalized);
                  if (existingCached) {
                    const previous = existingCached.value;
                    if (previous.price !== quote.price || previous.bid !== quote.bid || previous.ask !== quote.ask || previous.high !== quote.high || previous.low !== quote.low || previous.open !== quote.open) {
                      this.dirtySymbols.add(normalized);
                      changed = true;
                    }
                  } else {
                    this.dirtySymbols.add(normalized);
                    changed = true;
                  }
                  this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
                  this.metrics.lastSuccessfulUpdate = Date.now();
                  if (changed) {
                    const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
                    PriceEngine2.scheduleProcessing();
                  }
                } catch (error) {
                  this.metrics.providerErrors++;
                  console.warn(`[MarketService] REST fetch failed for ${normalized}: ${error.message}`);
                } finally {
                  this.quotePromises.delete(normalized);
                }
              })();
              this.quotePromises.set(normalized, fetchPromise);
              return fetchPromise;
            })
          );
        } finally {
          this.isRefreshing = false;
        }
      }
      static isYahooActive = true;
      static async pollRestQuotes(symbolsToFetch) {
        try {
          await Promise.all(
            symbolsToFetch.map(async (symbol) => {
              const normalized = this.normalizeSymbol(symbol);
              if (!normalized) return;
              try {
                this.metrics.providerRequests++;
                const quote = await MarketProvider.fetchQuote(normalized);
                let changed = false;
                const existingCached = this.latestPriceCache.get(normalized);
                if (existingCached) {
                  const previous = existingCached.value;
                  if (previous.price !== quote.price || previous.bid !== quote.bid || previous.ask !== quote.ask || previous.high !== quote.high || previous.low !== quote.low || previous.open !== quote.open) {
                    this.dirtySymbols.add(normalized);
                    changed = true;
                  }
                } else {
                  this.dirtySymbols.add(normalized);
                  changed = true;
                }
                if (changed) {
                  const spreadPips = MarketProvider.getSpread(normalized);
                  const digits = MarketProvider.getDigits(normalized);
                  const pipSize = digits === 2 || digits === 3 ? 0.01 : 1e-4;
                  const spreadValue = spreadPips * pipSize;
                  quote.bid = Number(quote.price.toFixed(6));
                  quote.ask = Number((quote.price + spreadValue).toFixed(6));
                  quote.spread = spreadPips;
                }
                this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
                this.metrics.lastSuccessfulUpdate = Date.now();
                if (changed) {
                  const { PriceEngine: PriceEngine2 } = await Promise.resolve().then(() => (init_priceEngine(), priceEngine_exports));
                  PriceEngine2.scheduleProcessing();
                }
              } catch (error) {
                this.metrics.providerErrors++;
                console.warn(`[MarketService] REST fetch failed for ${normalized}: ${error.message}`);
              }
            })
          );
        } catch (err) {
          console.error("[MarketService] pollRestQuotes error:", err);
        }
      }
      static normalizeSymbol(symbol) {
        return SymbolMapper.normalizeSymbol(symbol);
      }
      static async getWatchSymbols() {
        const { SymbolModel: SymbolModel2 } = await Promise.resolve().then(() => (init_Symbol(), Symbol_exports));
        const symbols = await SymbolModel2.find({ visibleToUsers: { $ne: false } }).lean();
        const supported = SymbolMapper.getAllSymbols();
        return symbols.map((s) => s.symbol).filter((sym) => supported.includes(SymbolMapper.normalizeSymbol(sym)));
      }
      static async getWatchQuotes() {
        const symbols = await this.getWatchSymbols();
        return Object.values(await this.getQuotes(symbols));
      }
      static getActiveSymbols() {
        return this.activeSymbols;
      }
      static consumeDirtyQuotes() {
        const quotes = [];
        const batch = this.dirtySymbols;
        this.dirtySymbols = /* @__PURE__ */ new Set();
        for (const symbol of batch) {
          const q = this.getCachedQuote(symbol);
          if (q) quotes.push(q);
        }
        return quotes;
      }
      static async getQuote(symbol) {
        const cached = this.getCachedQuote(symbol);
        if (cached) return cached;
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return null;
        try {
          const quote = await MarketProvider.fetchYahooQuote(normalized);
          this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
          return quote;
        } catch (e) {
          try {
            const quote = await MarketProvider.fetchQuote(normalized);
            this.latestPriceCache.set(normalized, { value: quote, timestamp: Date.now(), isStale: false });
            return quote;
          } catch (err2) {
            return null;
          }
        }
      }
      static getCachedQuote(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return null;
        const cached = this.latestPriceCache.get(normalized);
        if (cached) {
          this.metrics.cacheHits++;
          return { ...cached.value, isStale: cached.isStale };
        }
        this.metrics.cacheMisses++;
        return null;
      }
      static getCachedQuotes(symbols) {
        const results = {};
        for (const symbol of symbols) {
          const quote = this.getCachedQuote(symbol);
          if (quote) {
            results[quote.symbol] = quote;
          }
        }
        return results;
      }
      static getPrice(symbol) {
        const normalized = this.normalizeSymbol(symbol);
        if (!normalized) return null;
        return this.latestPriceCache.get(normalized)?.value?.price || null;
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
      static async getMovers(params) {
        return MarketProvider.fetchMovers(params);
      }
    };
  }
});

// src/models/TradeHistory.ts
var TradeHistory_exports = {};
__export(TradeHistory_exports, {
  TradeHistoryModel: () => TradeHistoryModel
});
import mongoose22, { Schema as Schema20 } from "mongoose";
var TradeHistorySchema, TradeHistoryModel;
var init_TradeHistory = __esm({
  "src/models/TradeHistory.ts"() {
    "use strict";
    TradeHistorySchema = new Schema20(
      {
        userId: { type: Schema20.Types.ObjectId, ref: "User", required: true },
        positionId: { type: Schema20.Types.ObjectId, ref: "Position", required: true },
        symbol: { type: String, required: true },
        type: { type: String, enum: ["BUY", "SELL"], required: true },
        volume: { type: Number, required: true },
        openPrice: { type: Number, required: true },
        closePrice: { type: Number, required: true },
        pnl: { type: Number, required: true },
        openTime: { type: Date, required: true },
        closeTime: { type: Date, required: true },
        isDeleted: { type: Boolean, default: false }
      },
      { timestamps: true }
    );
    TradeHistoryModel = mongoose22.model("TradeHistory", TradeHistorySchema);
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
import dotenv2 from "dotenv";
import express8 from "express";
import cors from "cors";

// src/config/database.ts
import mongoose from "mongoose";

// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();
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
      process.env.MONGOMS_SERVER_STARTUP_TIMEOUT = "60000";
      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 45e3
      });
      console.log("MongoDB Connected Successfully (in-memory)");
    } else {
      await mongoose.connect(config.mongoUri, {
        dbName: "forextradebio",
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 45e3
      });
      console.log("MongoDB Connected Successfully to forextradebio database");
    }
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
  mongoose.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
  const gracefulExit = async () => {
    await mongoose.connection.close();
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
import { Router } from "express";

// src/controllers/authController.ts
init_User();
init_Wallet();
import bcrypt from "bcryptjs";

// src/models/Kyc.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var KycSchema = new Schema3(
  {
    userId: { type: Schema3.Types.ObjectId, ref: "User", required: true, unique: true },
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
var KycModel = mongoose4.model("Kyc", KycSchema);

// src/models/Settings.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var SettingsSchema = new Schema4(
  {
    userId: { type: Schema4.Types.ObjectId, ref: "User", required: true, unique: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    notifications: { type: Boolean, default: true },
    language: { type: String, default: "en" }
  },
  { timestamps: true }
);
var SettingsModel = mongoose5.model("Settings", SettingsSchema);

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var signAccessToken = (payload, expiresIn = "1d") => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn });
};
var signRefreshToken = (payload, expiresIn = "7d") => {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn });
};
var verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? config.jwtRefreshSecret : config.jwtSecret;
  return jwt.verify(token, secret);
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
    const hashed = await bcrypt.hash(password, 12);
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
    const token = signAccessToken({ id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 });
    const refreshToken = signRefreshToken({ id: user._id, sessionVersion: user.sessionVersion || 0 });
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
    const match = await bcrypt.compare(passwordInput, hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signAccessToken({ id: user._id, role: user.role, sessionVersion: user.sessionVersion || 0 });
    const refreshToken = signRefreshToken({ id: user._id, sessionVersion: user.sessionVersion || 0 });
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
var resetAdminCredentials = async (req, res, next) => {
  try {
    const { newEmail, newPassword } = req.body;
    if (!newEmail || !newPassword) {
      return res.status(400).json({ error: "Missing newEmail or newPassword" });
    }
    const admin2 = await UserModel.findOne({ role: { $regex: /^admin$/i } });
    if (!admin2) {
      return res.status(404).json({ error: "Admin user not found in database" });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    admin2.email = newEmail.toLowerCase();
    admin2.username = newEmail.toLowerCase();
    admin2.passwordHash = hashed;
    await admin2.save();
    res.json({ success: true, message: "Admin credentials updated successfully!" });
  } catch (err) {
    next(err);
  }
};

// src/middleware/authMiddleware.ts
init_User();
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
    if ((decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
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
var router = Router();
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Auth route working"
  });
});
router.post("/register", register);
router.post("/login", login);
router.post("/reset-admin", resetAdminCredentials);
router.get("/me", protect, getProfile);
var authRoutes_default = router;

// src/routes/healthRoutes.ts
import { Router as Router2 } from "express";
var router2 = Router2();
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
init_socketServer();
init_market_service();
init_priceEngine();
import http from "http";

// src/routes/walletRoutes.ts
import { Router as Router3 } from "express";

// src/controllers/walletController.ts
init_Wallet();

// src/models/Transaction.ts
import mongoose13, { Schema as Schema12 } from "mongoose";
var TransactionSchema = new Schema12(
  {
    userId: { type: Schema12.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: ["DEPOSIT", "WITHDRAW", "TRADE", "BONUS", "TRADE_LOSS", "ADMIN_ADJUSTMENT", "WITHDRAWAL"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    referenceId: { type: String },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false },
    displayCurrency: { type: String, enum: ["INR", "USDT", "BOTH"], default: "BOTH" }
  },
  { timestamps: true }
);
var TransactionModel = mongoose13.model("Transaction", TransactionSchema);

// src/controllers/walletController.ts
init_socketServer();
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
    await TransactionModel.create({
      userId,
      type: "DEPOSIT",
      amount,
      balanceAfter: wallet.balance,
      status: "APPROVED",
      description: "Instant Funding (Testing)"
    });
    SocketServer.broadcastTransactionUpdate(userId.toString());
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/walletRoutes.ts
var router3 = Router3();
router3.use(protect);
router3.get("/", getWallet);
router3.post("/fund", fundWallet);
var walletRoutes_default = router3;

// src/routes/depositRoutes.ts
import { Router as Router4 } from "express";

// src/models/Deposit.ts
import mongoose14, { Schema as Schema13 } from "mongoose";
var DepositSchema = new Schema13(
  {
    userId: { type: Schema13.Types.ObjectId, required: true, ref: "User" },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    paymentMethod: { type: String, enum: ["UPI", "NETBANKING"], required: true, default: "UPI" },
    utr: { type: String, required: true },
    screenshot: { type: String },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED", "BLOCKED"], default: "PENDING" },
    adminNote: { type: String },
    remarks: { type: String },
    exchangeRate: { type: Number },
    creditedUSD: { type: Number },
    approvedBy: { type: Schema13.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);
var DepositModel = mongoose14.model("Deposit", DepositSchema);

// src/controllers/depositController.ts
init_socketServer();
var createDeposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, currency = "USD", paymentMethod = "UPI", utr } = req.body;
    let screenshot = req.body.screenshot || "";
    const uploadedFile = req.file;
    if (uploadedFile) {
      screenshot = `/uploads/${uploadedFile.filename}`;
    }
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
    SocketServer.broadcastTransactionUpdate(userId.toString());
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

// src/middleware/uploadMiddleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
var uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
var storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
  }
};
var upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});

// src/routes/depositRoutes.ts
var router4 = Router4();
router4.use(protect);
router4.post("/", upload.single("screenshot"), createDeposit);
router4.get("/", getDeposits);
router4.get("/history", getDeposits);
var depositRoutes_default = router4;

// src/routes/withdrawalRoutes.ts
import express from "express";

// src/models/Withdrawal.ts
import mongoose15, { Schema as Schema14 } from "mongoose";
var WithdrawalSchema = new Schema14(
  {
    userId: { type: Schema14.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["USD", "INR", "EUR"], default: "USD" },
    bankDetails: { type: Schema14.Types.Mixed, required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    adminNotes: { type: String },
    exchangeRate: { type: Number },
    receivedINR: { type: Number },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);
var WithdrawalModel = mongoose15.model("Withdrawal", WithdrawalSchema);

// src/controllers/withdrawalController.ts
init_Wallet();
init_AuditLog();
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
var router5 = express.Router();
router5.use(protect);
router5.post("/", requestWithdrawal);
router5.get("/", getWithdrawals);
var withdrawalRoutes_default = router5;

// src/routes/kycRoutes.ts
import { Router as Router5 } from "express";
import multer2 from "multer";
import path3 from "path";
import fs3 from "fs";

// src/controllers/kycController.ts
import mongoose16 from "mongoose";
init_User();
import path2 from "path";
import fs2 from "fs";
var MAX_FILE_SIZE_BYTES = Number(process.env.KYC_MAX_FILE_BYTES) || 5 * 1024 * 1024;
var getBase64Payload = (dataUri) => {
  if (!dataUri || typeof dataUri !== "string") return null;
  const match = dataUri.match(/^data:([\w/+.-]+);base64,(.*)$/s);
  return match ? match[2] : null;
};
var normalizeKycDocumentValue = (doc, options) => {
  if (!doc || typeof doc !== "string") return doc || null;
  const trimmed = doc.trim();
  if (!trimmed) return null;
  if (/^data:image\//i.test(trimmed)) {
    const payload = getBase64Payload(trimmed);
    if (payload) {
      const estimatedBytes = Buffer.byteLength(payload, "base64");
      const maxAllowed = options?.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;
      if (estimatedBytes > maxAllowed) {
        const err = new Error(`Document exceeds maximum allowed size of ${maxAllowed} bytes`);
        err.statusCode = 413;
        throw err;
      }
    }
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/") || trimmed.startsWith("uploads/")) {
    return trimmed;
  }
  const rawPayload = trimmed.replace(/^data:.*;base64,/, "");
  if (/^(?:[A-Za-z0-9+/]{20,}={0,2})$/.test(rawPayload)) {
    const estimatedBytes = Buffer.byteLength(rawPayload, "base64");
    const maxAllowed = options?.maxFileSizeBytes ?? MAX_FILE_SIZE_BYTES;
    if (estimatedBytes > maxAllowed) {
      const err = new Error(`Document exceeds maximum allowed size of ${maxAllowed} bytes`);
      err.statusCode = 413;
      throw err;
    }
    return `data:image/jpeg;base64,${trimmed}`;
  }
  return trimmed;
};
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
      userId = new mongoose16.Types.ObjectId(rawUserId);
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
      const normalized = normalizeKycDocumentValue(doc, { maxFileSizeBytes: MAX_FILE_SIZE_BYTES });
      if (normalized) {
        console.log(`[KYC POST] ${fieldName} normalized to ${typeof normalized === "string" ? normalized.slice(0, 30) : "non-string"}...`);
      }
      return normalized;
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
    const userId = new mongoose16.Types.ObjectId(rawUserId);
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
    const getMimeType = (file) => {
      if (file.mimetype && file.mimetype.startsWith("image/")) return file.mimetype;
      const ext = path2.extname(file.originalname || "").toLowerCase();
      if (ext === ".png") return "image/png";
      if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
      if (ext === ".webp") return "image/webp";
      if (ext === ".gif") return "image/gif";
      return "application/octet-stream";
    };
    const fileUrls = files.map((f) => {
      const fileBuffer = fs2.readFileSync(f.path);
      const mimeType = getMimeType(f);
      const base64 = fileBuffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    });
    try {
      const rawUserId = req.user?.id;
      if (rawUserId) {
        const userId = new mongoose16.Types.ObjectId(rawUserId);
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
var router6 = Router5();
router6.use(protect);
var uploadDir2 = path3.join(process.cwd(), "uploads", "kyc");
fs3.mkdirSync(uploadDir2, { recursive: true });
var storage2 = multer2.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir2);
  },
  filename: function(req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    cb(null, unique);
  }
});
var upload2 = multer2({ storage: storage2, limits: { fileSize: 10 * 1024 * 1024 } });
router6.post("/upload", upload2.array("files", 6), uploadKycFiles);
router6.post("/", submitKyc);
router6.get("/", getKyc);
var kycRoutes_default = router6;

// src/routes/tradingRoutes.ts
import { Router as Router6 } from "express";

// src/controllers/tradingController.ts
init_Position();
init_Order();
init_Wallet();
init_User();
init_market_service();
init_marginEngine();
init_TradingEngine();
init_PriceService();
init_SymbolSpecification();
init_MarginCalculator();
init_ProfitCalculator();
init_PositionManager();
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
    if (!spec || spec.status !== "OPEN" || !spec.tradingEnabled) return res.status(400).json({ error: "Trading is disabled or market closed for this symbol" });
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
    position.pnl = ProfitCalculator.calculate(
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
    const fullPnl = ProfitCalculator.calculate(
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
var router7 = Router6();
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
import express2 from "express";

// src/models/CopyTrader.ts
import mongoose17, { Schema as Schema15 } from "mongoose";
var CopyTraderSchema = new Schema15(
  {
    providerId: { type: Schema15.Types.ObjectId, ref: "User", required: true },
    followerId: { type: Schema15.Types.ObjectId, ref: "User", required: true },
    allocationRatio: { type: Number, default: 1 },
    profitSharePercent: { type: Number, default: 20 },
    status: { type: String, enum: ["ACTIVE", "PAUSED", "STOPPED"], default: "ACTIVE" }
  },
  { timestamps: true }
);
var CopyTraderModel = mongoose17.model("CopyTrader", CopyTraderSchema);

// src/controllers/copyTradingController.ts
init_User();
init_Notification();
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
var router8 = express2.Router();
router8.get("/providers", getProviders);
router8.use(protect);
router8.post("/become-provider", becomeProvider);
router8.post("/follow", followProvider);
var copyTradingRoutes_default = router8;

// src/routes/watchlistRoutes.ts
import { Router as Router7 } from "express";

// src/models/Watchlist.ts
import mongoose18, { Schema as Schema16 } from "mongoose";
var WatchlistSchema = new Schema16(
  {
    userId: { type: Schema16.Types.ObjectId, ref: "User", required: true, unique: true },
    symbols: [{ type: String }]
  },
  { timestamps: true }
);
var WatchlistModel = mongoose18.model("Watchlist", WatchlistSchema);

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
var router9 = Router7();
router9.use(protect);
router9.get("/", getWatchlist);
router9.put("/", updateWatchlist);
var watchlistRoutes_default = router9;

// src/routes/alertRoutes.ts
import { Router as Router8 } from "express";

// src/models/Alert.ts
import mongoose19, { Schema as Schema17 } from "mongoose";
var AlertSchema = new Schema17(
  {
    userId: { type: Schema17.Types.ObjectId, ref: "User", required: true },
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
var AlertModel = mongoose19.model("Alert", AlertSchema);

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
var router10 = Router8();
router10.use(protect);
router10.get("/", getAlerts);
router10.post("/", createAlert);
router10.patch("/:id", updateAlert);
router10.delete("/:id", deleteAlert);
var alertRoutes_default = router10;

// src/routes/adminRoutes.ts
import { Router as Router9 } from "express";

// src/controllers/adminController.ts
init_User();
init_Wallet();
init_AuditLog();
init_Position();
init_Notification();
init_Symbol();

// src/models/News.ts
import mongoose20, { Schema as Schema18 } from "mongoose";
var NewsSchema = new Schema18(
  {
    title: { type: String, required: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true, default: "global" },
    source: { type: String, required: true },
    authorId: { type: Schema18.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);
var NewsModel = mongoose20.model("News", NewsSchema);

// src/controllers/adminController.ts
init_marginEngine();
init_socketServer();
import bcrypt2 from "bcryptjs";

// src/models/ExchangeRate.ts
import mongoose21, { Schema as Schema19 } from "mongoose";
var ExchangeRateSchema = new Schema19(
  {
    currentRate: { type: Number, required: true },
    baseCurrency: { type: String, required: true, default: "USD" },
    quoteCurrency: { type: String, required: true, default: "INR" },
    provider: { type: String, enum: ["MANUAL", "LIVE"], default: "MANUAL" },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: Schema19.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);
var ExchangeRateModel = mongoose21.model("ExchangeRate", ExchangeRateSchema);

// src/controllers/adminController.ts
init_ApiKey();
init_market_service();
var buildPublicUploadUrl = (value, request) => {
  if (!value || typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (/^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(?:[A-Za-z0-9+/\s]{20,}={0,2})$/.test(trimmed)) return trimmed;
  const envBaseUrl = (process.env.UPLOAD_BASE_URL || process.env.BACKEND_URL || "").replace(/\/$/, "");
  const requestBaseUrl = request ? `${request.protocol}://${request.get("host")}`.replace(/\/$/, "") : "";
  const baseUrl = (envBaseUrl || requestBaseUrl || "http://localhost:8000").replace(/\/$/, "");
  const rootBase = baseUrl.replace(/\/api$/, "");
  if (trimmed.startsWith("/uploads/")) return `${rootBase}${trimmed}`;
  if (trimmed.startsWith("/api/uploads/")) return `${rootBase}${trimmed.replace("/api", "")}`;
  if (trimmed.startsWith("uploads/")) return `${rootBase}/${trimmed}`;
  if (trimmed.startsWith("/")) return `${rootBase}${trimmed}`;
  if (trimmed.startsWith("http")) return trimmed;
  return `${rootBase}/uploads/${trimmed}`;
};
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
    const deposits = await DepositModel.find().select("-screenshot").populate("userId", "fullName email");
    const kycRequests = await KycModel.find().select("-aadharDocument -panDocument -documents").populate("userId", "fullName email kycStatus");
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
    const { displayCurrency } = req.body;
    const withdrawal = await WithdrawalModel.findById(id);
    if (!withdrawal) return res.status(404).json({ error: "Not found" });
    const exchangeRateDoc = await ExchangeRateModel.findOne({ isActive: true });
    const rate = exchangeRateDoc ? exchangeRateDoc.currentRate : 85;
    withdrawal.status = "APPROVED";
    withdrawal.exchangeRate = rate;
    withdrawal.receivedINR = withdrawal.amount * rate;
    await withdrawal.save();
    const wallet = await WalletModel.findOne({ userId: withdrawal.userId });
    if (wallet) {
      await TransactionModel.create({
        userId: withdrawal.userId,
        type: "WITHDRAWAL",
        amount: withdrawal.amount,
        balanceAfter: wallet.balance,
        status: "APPROVED",
        description: "Withdrawal Approved",
        displayCurrency: displayCurrency || "BOTH"
      });
    }
    await logAdminAction(req.user.id, "APPROVE_WITHDRAWAL", { withdrawalId: id });
    await sendNotification(withdrawal.userId, "Withdrawal Approved", "Your withdrawal has been processed.", "SUCCESS");
    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var deleteWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalModel.findByIdAndDelete(id);
    if (!withdrawal) return res.status(404).json({ error: "Not found" });
    await logAdminAction(req.user.id, "DELETE_WITHDRAWAL", { withdrawalId: id });
    res.json({ message: "Withdrawal deleted successfully" });
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
      SocketServer.broadcastTransactionUpdate(userId);
    } else if (action === "DEBIT") {
      wallet.balance -= amount;
      await TransactionModel.create({ userId, type: "ADMIN_ADJUSTMENT", amount: -amount, balanceAfter: wallet.balance, description: "Admin Debit" });
      SocketServer.broadcastTransactionUpdate(userId);
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
      const salt = await bcrypt2.genSalt(10);
      user.passwordHash = await bcrypt2.hash(newPassword, salt);
      user.password = void 0;
      user.sessionVersion = (user.sessionVersion || 0) + 1;
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
    const users = await UserModel.find().select("-password -passwordHash").lean();
    const wallets = await WalletModel.find().lean();
    const walletMap = /* @__PURE__ */ new Map();
    for (const w of wallets) {
      walletMap.set(w.userId.toString(), w);
    }
    const populated = users.map((u) => ({ ...u, wallet: walletMap.get(u._id.toString()) || null }));
    res.json({ users: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getKycRequests = async (req, res) => {
  try {
    const rawKycRequests = await KycModel.find().select("-aadharDocument -panDocument -documents").populate("userId", "fullName email username kycStatus").sort({ createdAt: -1 });
    const kycRequests = rawKycRequests.map((kyc) => {
      const rawDoc = kyc.toObject ? kyc.toObject() : kyc;
      const documents = Array.isArray(rawDoc.documents) ? rawDoc.documents.map((item) => {
        if (typeof item === "string") return buildPublicUploadUrl(item, req);
        if (item && typeof item === "object") {
          return buildPublicUploadUrl(item.url || item.src || item.path || item.image || item.file || item.document || item.documentUrl || item.fileUrl, req);
        }
        return item;
      }).filter(Boolean) : [];
      const frontImage = buildPublicUploadUrl(rawDoc.aadharDocument || rawDoc.frontImage || rawDoc.aadharDocumentUrl || rawDoc.aadharUrl || documents[0], req);
      const selfieImage = buildPublicUploadUrl(rawDoc.panDocument || rawDoc.selfieImage || rawDoc.panDocumentUrl || rawDoc.panUrl || documents[1], req);
      return {
        ...rawDoc,
        aadharDocument: frontImage,
        panDocument: selfieImage,
        frontImage,
        selfieImage,
        documents
      };
    });
    console.log("[GET /admin/kyc] fetched kycRequests count:", kycRequests.length);
    res.json({ kycRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getKycRequestById = async (req, res) => {
  try {
    const rawDoc = await KycModel.findById(req.params.id).populate("userId", "fullName email username kycStatus").lean();
    if (!rawDoc) {
      return res.status(404).json({ error: "KYC not found" });
    }
    const documents = Array.isArray(rawDoc.documents) ? rawDoc.documents.map((item) => {
      if (typeof item === "string") return buildPublicUploadUrl(item, req);
      if (item && typeof item === "object") {
        return buildPublicUploadUrl(item.url || item.src || item.path || item.image || item.file || item.document || item.documentUrl || item.fileUrl, req);
      }
      return item;
    }).filter(Boolean) : [];
    const frontImage = buildPublicUploadUrl(rawDoc.aadharDocument || rawDoc.frontImage || rawDoc.aadharDocumentUrl || rawDoc.aadharUrl || documents[0], req);
    const selfieImage = buildPublicUploadUrl(rawDoc.panDocument || rawDoc.selfieImage || rawDoc.panDocumentUrl || rawDoc.panUrl || documents[1], req);
    res.json({
      kyc: {
        ...rawDoc,
        aadharDocument: frontImage,
        panDocument: selfieImage,
        frontImage,
        selfieImage,
        documents
      }
    });
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
var clearUserHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { TradeHistoryModel: TradeHistoryModel2 } = await Promise.resolve().then(() => (init_TradeHistory(), TradeHistory_exports));
    await TradeHistoryModel2.updateMany({ userId: id }, { isDeleted: true });
    await logAdminAction(req.user.id, "CLEAR_USER_HISTORY_SOFT", { userId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getSymbols = async (req, res) => {
  try {
    const symbols = await SymbolModel.find().lean();
    const activePositions = await PositionModel.aggregate([
      { $match: { status: "OPEN" } },
      { $group: { _id: "$symbol", count: { $sum: 1 } } }
    ]);
    const positionsMap = new Map(activePositions.map((p) => [p._id, p.count]));
    const enrichedSymbols = symbols.map((s) => ({
      ...s,
      openPositions: positionsMap.get(s.symbol) || 0,
      connectedUsers: Math.floor(Math.random() * 50) + 10
      // Mocked for now
    }));
    res.json({ symbols: enrichedSymbols });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updateSymbolStatus = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { status, visibleToUsers, tradingEnabled, spread, leverageLimit } = req.body;
    const targetSymbol = await SymbolModel.findOne({ symbol: symbol.toUpperCase() });
    if (!targetSymbol) return res.status(404).json({ error: "Symbol not found" });
    const oldStatus = targetSymbol.status;
    if (status) targetSymbol.status = status;
    if (visibleToUsers !== void 0) targetSymbol.visibleToUsers = visibleToUsers;
    if (tradingEnabled !== void 0) targetSymbol.tradingEnabled = tradingEnabled;
    if (spread !== void 0) targetSymbol.spread = spread;
    if (leverageLimit !== void 0) targetSymbol.leverageLimit = leverageLimit;
    await targetSymbol.save();
    const { SymbolSpecification: SymbolSpecification2 } = await Promise.resolve().then(() => (init_SymbolSpecification(), SymbolSpecification_exports));
    await SymbolSpecification2.loadAll();
    SocketServer.broadcastMarketUpdate([{
      symbol: targetSymbol.symbol,
      status: targetSymbol.status,
      visibleToUsers: targetSymbol.visibleToUsers,
      tradingEnabled: targetSymbol.tradingEnabled,
      spread: targetSymbol.spread
    }]);
    await logAdminAction(req.user.id, "UPDATE_SYMBOL", {
      symbol,
      oldStatus,
      newStatus: targetSymbol.status
    });
    res.json({ success: true, symbol: targetSymbol });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id).select("-password -passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    const wallet = await WalletModel.findOne({ userId: id });
    const kyc = await KycModel.findOne({ userId: id });
    const deposits = await DepositModel.find({ userId: id, isDeleted: false }).sort({ createdAt: -1 });
    const withdrawals = await WithdrawalModel.find({ userId: id, isDeleted: false }).sort({ createdAt: -1 });
    const transactions = await TransactionModel.find({ userId: id, isDeleted: false }).sort({ createdAt: -1 });
    const { TradeHistoryModel: TradeHistoryModel2 } = await Promise.resolve().then(() => (init_TradeHistory(), TradeHistory_exports));
    const trades = await TradeHistoryModel2.find({ userId: id, isDeleted: false }).sort({ createdAt: -1 });
    const openPositions = await PositionModel.find({ userId: id, status: "OPEN" });
    res.json({
      user,
      wallet,
      kyc,
      deposits,
      withdrawals,
      transactions,
      trades,
      openPositions
    });
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
      status: "OPEN",
      tradingEnabled: true,
      visibleToUsers: true
    });
    await logAdminAction(req.user.id, "CREATE_SYMBOL", { symbol: normalized });
    res.status(201).json(newSymbol);
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
    const { price } = req.body;
    const position = await PositionModel.findById(posId);
    if (!position) return res.status(404).json({ error: "Position not found" });
    if (position.status === "CLOSED") {
      return res.status(400).json({ error: "Position already closed" });
    }
    const { MarketService: MarketService2 } = await Promise.resolve().then(() => (init_market_service(), market_service_exports));
    const { TradeUtils: TradeUtils2 } = await Promise.resolve().then(() => (init_tradeUtils(), tradeUtils_exports));
    position.status = "CLOSED";
    position.closePrice = price ? Number(price) : position.currentPrice;
    position.pnl = TradeUtils2.calculatePnl(
      position.type,
      position.openPrice,
      position.closePrice,
      // bid
      position.closePrice,
      // ask
      position.volume,
      position.symbol
    );
    await position.save();
    const { TradeHistoryModel: TradeHistoryModel2 } = await Promise.resolve().then(() => (init_TradeHistory(), TradeHistory_exports));
    await TradeHistoryModel2.create({
      userId: position.userId,
      positionId: position._id,
      symbol: position.symbol,
      type: position.type,
      volume: position.volume,
      openPrice: position.openPrice,
      closePrice: position.closePrice,
      pnl: position.pnl,
      openTime: position.createdAt,
      closeTime: /* @__PURE__ */ new Date()
    });
    const wallet = await WalletModel.findOne({ userId: position.userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.equity = wallet.balance;
      await wallet.save();
      const openPositions = await PositionModel.find({ userId: position.userId, status: "OPEN" });
      await MarginEngine.calculateMargin(position.userId.toString(), openPositions, {});
    }
    await logAdminAction(req.user.id, "FORCE_CLOSE_POSITION", { positionId: posId, closePrice: position.closePrice });
    res.json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getMarketSettings = async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne();
    if (!settings) {
      settings = await MarketSettingsModel2.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updateMarketSettings = async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne();
    if (!settings) {
      settings = await MarketSettingsModel2.create({});
    }
    Object.assign(settings, req.body);
    await settings.save();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updatePlatformTradingStatus = async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne() || await MarketSettingsModel2.create({});
    settings.globalTradingStatus = req.body.status;
    settings.lastUpdatedBy = req.user?._id;
    settings.reason = req.body.reason;
    await settings.save();
    const { getSocketServer } = await import("../socket");
    const io = getSocketServer();
    if (io) {
      io.emit("PLATFORM_STATUS_UPDATED", settings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updatePlatformGraphStatus = async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne() || await MarketSettingsModel2.create({});
    settings.globalGraphStatus = req.body.status;
    settings.lastUpdatedBy = req.user?._id;
    settings.reason = req.body.reason;
    await settings.save();
    const { getSocketServer } = await import("../socket");
    const io = getSocketServer();
    if (io) {
      io.emit("PLATFORM_STATUS_UPDATED", settings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var updatePlatformMarketStatus = async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne() || await MarketSettingsModel2.create({});
    settings.globalMarketStatus = req.body.status;
    settings.lastUpdatedBy = req.user?._id;
    settings.reason = req.body.reason;
    await settings.save();
    const { getSocketServer } = await import("../socket");
    const io = getSocketServer();
    if (io) {
      io.emit("PLATFORM_STATUS_UPDATED", settings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getAllTrades = async (req, res) => {
  try {
    const { OrderModel: OrderModel2 } = await Promise.resolve().then(() => (init_Order(), Order_exports));
    const [openPositions, closedPositions, pendingOrders] = await Promise.all([
      PositionModel.find({ status: "OPEN" }).populate("userId", "fullName email username"),
      PositionModel.find({ status: "CLOSED" }).populate("userId", "fullName email username"),
      OrderModel2.find({ status: "PENDING" }).populate("userId", "fullName email username")
    ]);
    const openTrades = openPositions.map((p) => ({
      id: p._id,
      userId: p.userId?._id,
      userFullName: p.userId?.fullName || p.userId?.username || p.userId?.email || "Unknown User",
      assetSymbol: p.symbol,
      assetType: "FOREX",
      direction: p.type,
      amount: p.volume,
      leverage: p.leverage || 100,
      entryPrice: p.openPrice,
      exitPrice: p.currentPrice,
      // For open trades, exitPrice isn't set yet, show currentPrice or undefined
      profit: p.pnl,
      status: "OPEN",
      createdAt: p.createdAt
    }));
    const closedTradesList = closedPositions.map((p) => ({
      id: p._id,
      userId: p.userId?._id,
      userFullName: p.userId?.fullName || p.userId?.username || p.userId?.email || "Unknown User",
      assetSymbol: p.symbol,
      assetType: "FOREX",
      direction: p.type,
      amount: p.volume,
      leverage: p.leverage || 100,
      entryPrice: p.openPrice,
      exitPrice: p.closePrice,
      profit: p.pnl,
      status: "CLOSED",
      createdAt: p.createdAt
    }));
    const pendingTrades = pendingOrders.map((o) => ({
      id: o._id,
      userId: o.userId?._id,
      userFullName: o.userId?.fullName || o.userId?.username || o.userId?.email || "Unknown User",
      assetSymbol: o.symbol,
      assetType: "FOREX",
      direction: o.type,
      amount: o.volume,
      leverage: o.leverage || 100,
      entryPrice: o.targetPrice,
      exitPrice: void 0,
      profit: 0,
      status: "PENDING",
      createdAt: o.createdAt
    }));
    res.json([...openTrades, ...closedTradesList, ...pendingTrades]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var cancelPendingOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { OrderModel: OrderModel2 } = await Promise.resolve().then(() => (init_Order(), Order_exports));
    const order = await OrderModel2.findById(id);
    if (!order || order.status !== "PENDING") {
      return res.status(404).json({ error: "Pending order not found" });
    }
    order.status = "CANCELLED";
    await order.save();
    await logAdminAction(req.user?.id, "CANCEL_PENDING_ORDER", { orderId: id, symbol: order.symbol });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getModelForType = (type) => {
  switch (type) {
    case "deposit":
      return DepositModel;
    case "withdrawal":
      return WithdrawalModel;
    case "position":
      return PositionModel;
    case "transaction":
      return TransactionModel;
    default:
      return null;
  }
};
var archiveRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    const model = getModelForType(type);
    if (!model) return res.status(400).json({ error: "Invalid record type" });
    const record = await model.findById(id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    record.isArchived = true;
    await record.save();
    await logAdminAction(req.user?.id, `ARCHIVE_RECORD_${type.toUpperCase()}`, { recordId: id });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var restoreRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    const model = getModelForType(type);
    if (!model) return res.status(400).json({ error: "Invalid record type" });
    const record = await model.findById(id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    record.isArchived = false;
    record.isDeleted = false;
    record.deletedAt = void 0;
    await record.save();
    await logAdminAction(req.user?.id, `RESTORE_RECORD_${type.toUpperCase()}`, { recordId: id });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var softDeleteRecord = async (req, res) => {
  try {
    const { type, id } = req.params;
    const model = getModelForType(type);
    if (!model) return res.status(400).json({ error: "Invalid record type" });
    const record = await model.findById(id);
    if (!record) return res.status(404).json({ error: "Record not found" });
    record.isDeleted = true;
    record.deletedAt = /* @__PURE__ */ new Date();
    await record.save();
    await logAdminAction(req.user?.id, `SOFT_DELETE_RECORD_${type.toUpperCase()}`, { recordId: id });
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var hardDeleteRecord = async (req, res) => {
  try {
    const adminUser = await UserModel.findById(req.user.id);
    if (!adminUser || adminUser.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Only Super Admin can hard delete financial records" });
    }
    const { type, id } = req.params;
    const model = getModelForType(type);
    if (!model) return res.status(400).json({ error: "Invalid record type" });
    await model.findByIdAndDelete(id);
    await logAdminAction(adminUser.id, `HARD_DELETE_RECORD_${type.toUpperCase()}`, { recordId: id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getHistoryRecords = async (req, res) => {
  try {
    const { type } = req.params;
    const { archived, deleted } = req.query;
    const model = getModelForType(type);
    if (!model) return res.status(400).json({ error: "Invalid record type" });
    let query = {};
    if (archived === "true") {
      query.isArchived = true;
    } else if (deleted === "true") {
      query.isDeleted = true;
    } else {
      query.isArchived = { $ne: true };
      query.isDeleted = { $ne: true };
    }
    const records = await model.find(query).populate("userId", "fullName email").sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getApiKeys = async (req, res) => {
  try {
    let keys = await ApiKeyModel.find().sort({ createdAt: -1 });
    if (keys.length === 0) {
      const defaultKeys = [
        { provider: "BINANCE", keyName: "Default System (Free)", keyValue: "No Key Required", status: "ACTIVE" },
        { provider: "YAHOO", keyName: "Default System (Free)", keyValue: "No Key Required", status: "ACTIVE" },
        { provider: "TWELVEDATA", keyName: "Environment Default", keyValue: process.env.TWELVEDATA_API_KEY || "19dea2e7729b4d81ad2271d8048ddc8e", status: "ACTIVE" }
      ];
      await ApiKeyModel.insertMany(defaultKeys);
      keys = await ApiKeyModel.find().sort({ createdAt: -1 });
    }
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var addApiKey = async (req, res) => {
  try {
    const { provider, keyName, keyValue } = req.body;
    if (!provider || !keyName) {
      return res.status(400).json({ error: "Provider and Key Name are required" });
    }
    const newKey = await ApiKeyModel.create({
      provider,
      keyName,
      keyValue: keyValue || "",
      status: "ACTIVE"
    });
    await logAdminAction(req.user.id, "API_KEY_ADDED", { provider, keyName });
    res.status(201).json(newKey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var toggleApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const key = await ApiKeyModel.findById(id);
    if (!key) return res.status(404).json({ error: "API Key not found" });
    if (status && ["ACTIVE", "INACTIVE"].includes(status)) {
      key.status = status;
      if (status === "ACTIVE") key.errorCount = 0;
    } else {
      key.status = key.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      if (key.status === "ACTIVE") key.errorCount = 0;
    }
    await key.save();
    await logAdminAction(req.user.id, "API_KEY_TOGGLED", { keyId: id, status: key.status });
    await MarketService.reloadProvider(key.provider);
    res.json(key);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var deleteApiKey = async (req, res) => {
  try {
    const { id } = req.params;
    const key = await ApiKeyModel.findByIdAndDelete(id);
    if (!key) return res.status(404).json({ error: "API Key not found" });
    await logAdminAction(req.user.id, "API_KEY_DELETED", { keyId: id });
    res.json({ message: "API Key deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/controllers/adminDepositController.ts
init_Wallet();
init_AuditLog();
init_Notification();
init_socketServer();
var getAllDeposits = async (req, res) => {
  try {
    const deposits = await DepositModel.find().sort({ createdAt: -1 }).populate("userId", "fullName username email");
    res.json({ success: true, deposits });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var getDepositById = async (req, res) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id).populate("userId", "fullName username email");
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    res.json({ success: true, deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var approveDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, customExchangeRate, displayCurrency } = req.body;
    const adminId = req.user.id;
    const deposit = await DepositModel.findById(id);
    if (!deposit) {
      return res.status(404).json({ success: false, error: "Deposit not found" });
    }
    if (deposit.status === "APPROVED") {
      return res.status(400).json({ success: false, error: "Deposit is already approved" });
    }
    if (deposit.status === "REJECTED") {
      return res.status(400).json({ success: false, error: "Deposit is already rejected" });
    }
    deposit.status = "APPROVED";
    deposit.remarks = remarks || deposit.remarks;
    deposit.approvedBy = adminId;
    deposit.approvedAt = /* @__PURE__ */ new Date();
    const wallet = await WalletModel.findOne({ userId: deposit.userId });
    let amountInUSD = 0;
    if (wallet) {
      const exchangeRateDoc = await ExchangeRateModel.findOne({ isActive: true });
      const rate = customExchangeRate ? Number(customExchangeRate) : exchangeRateDoc ? exchangeRateDoc.currentRate : 85;
      amountInUSD = deposit.amount / rate;
      deposit.exchangeRate = rate;
      deposit.creditedUSD = amountInUSD;
      wallet.balance += amountInUSD;
      wallet.equity = wallet.balance + (wallet.pnl || 0);
      wallet.freeMargin = wallet.equity - (wallet.margin || 0);
      await wallet.save();
    }
    await deposit.save();
    if (wallet) {
      await TransactionModel.create({
        userId: deposit.userId,
        type: "DEPOSIT",
        amount: amountInUSD,
        balanceAfter: wallet.balance,
        status: "APPROVED",
        referenceId: deposit._id.toString(),
        description: `Deposit Approved by Admin${remarks ? " - " + remarks : ""}`,
        displayCurrency: displayCurrency || "BOTH"
      });
    }
    await AuditLogModel.create({ adminId, action: "APPROVE_DEPOSIT", details: { depositId: id, remarks } });
    await NotificationModel.create({ userId: deposit.userId, title: "Deposit Approved", message: `Your deposit of ${deposit.currency || "USD"} ${deposit.amount} has been approved.`, type: "SUCCESS" });
    SocketServer.broadcastTransactionUpdate(deposit.userId.toString());
    return res.json({ success: true, message: "Deposit approved successfully", deposit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
var rejectDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;
    const adminId = req.user.id;
    const deposit = await DepositModel.findById(id);
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    if (deposit.status !== "PENDING") {
      return res.status(400).json({ success: false, error: `Deposit is already ${deposit.status}` });
    }
    deposit.status = "REJECTED";
    deposit.remarks = reason || remarks || "Rejected by Admin";
    await deposit.save();
    await TransactionModel.create({
      userId: deposit.userId,
      type: "DEPOSIT",
      amount: deposit.amount,
      status: "REJECTED",
      referenceId: deposit._id.toString(),
      description: `Deposit Rejected - ${deposit.remarks}`
    });
    await AuditLogModel.create({ adminId, action: "REJECT_DEPOSIT", details: { depositId: id, reason: deposit.remarks } });
    await NotificationModel.create({ userId: deposit.userId, title: "Deposit Rejected", message: `Your deposit request was rejected. Reason: ${deposit.remarks}`, type: "ERROR" });
    res.json({ success: true, message: "Deposit rejected", deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var deleteDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id);
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    await DepositModel.findByIdAndDelete(id);
    await AuditLogModel.create({ adminId: req.user.id, action: "DELETE_DEPOSIT", details: { depositId: id } });
    res.json({ success: true, message: "Deposit deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var blockDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;
    const adminId = req.user.id;
    const deposit = await DepositModel.findById(id);
    if (!deposit) return res.status(404).json({ success: false, error: "Deposit not found" });
    if (deposit.status !== "PENDING" && deposit.status !== "REJECTED") {
      return res.status(400).json({ success: false, error: `Cannot block deposit that is ${deposit.status}` });
    }
    deposit.status = "BLOCKED";
    deposit.remarks = reason || remarks || "Blocked by Admin for security reasons";
    await deposit.save();
    await TransactionModel.create({
      userId: deposit.userId,
      type: "DEPOSIT",
      amount: deposit.amount,
      status: "BLOCKED",
      referenceId: deposit._id.toString(),
      description: `Deposit Blocked - ${deposit.remarks}`
    });
    await AuditLogModel.create({ adminId, action: "BLOCK_DEPOSIT", details: { depositId: id, reason: deposit.remarks } });
    await NotificationModel.create({ userId: deposit.userId, title: "Deposit Blocked", message: `Your deposit request was blocked. Reason: ${deposit.remarks}`, type: "ERROR" });
    res.json({ success: true, message: "Deposit blocked", deposit });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/routes/adminRoutes.ts
var router11 = Router9();
router11.use(protect, admin);
router11.get("/dashboard", getAdminDashboardData);
router11.get("/users", getAllUsers);
router11.get("/users/:id/details", getUserDetails);
router11.get("/kyc", getKycRequests);
router11.get("/kyc/:id", getKycRequestById);
router11.get("/withdrawals", getWithdrawals2);
router11.get("/symbols", getSymbols);
router11.get("/trades", getAllTrades);
router11.delete("/orders/:id", cancelPendingOrder);
router11.get("/deposits", getAllDeposits);
router11.get("/deposits/:id", getDepositById);
router11.patch("/deposits/:id/approve", approveDeposit);
router11.patch("/deposits/:id/reject", rejectDeposit);
router11.patch("/deposits/:id/block", blockDeposit);
router11.delete("/deposits/:id", deleteDeposit);
router11.post("/kyc/:id/approve", approveKyc);
router11.post("/kyc/:id/reject", rejectKyc);
router11.post("/withdrawals/:id/approve", approveWithdrawal);
router11.post("/withdrawals/:id/reject", rejectWithdrawal);
router11.delete("/withdraw/:id", deleteWithdrawal);
router11.post("/symbols", createSymbol);
router11.post("/symbols/:symbol/status", updateSymbolStatus);
router11.post("/symbols/:symbol/modify", modifySymbol);
router11.post("/news", createNews);
router11.post("/notifications", dispatchNotification);
router11.post("/trades/force-close/:posId", forceCloseTrade);
router11.get("/market-settings", getMarketSettings);
router11.put("/market-settings", updateMarketSettings);
router11.get("/platform/status", getMarketSettings);
router11.patch("/platform/trading-status", updatePlatformTradingStatus);
router11.patch("/platform/graph-status", updatePlatformGraphStatus);
router11.patch("/platform/market-status", updatePlatformMarketStatus);
router11.get("/history/:type", getHistoryRecords);
router11.patch("/history/:type/:id/archive", archiveRecord);
router11.patch("/history/:type/:id/restore", restoreRecord);
router11.delete("/history/:type/:id/soft", softDeleteRecord);
router11.delete("/history/:type/:id/hard", hardDeleteRecord);
router11.delete("/users/:id/history", clearUserHistory);
router11.post("/wallet", adminWalletControl);
router11.post("/user", adminUserControl);
router11.get("/apikeys", getApiKeys);
router11.post("/apikeys", addApiKey);
router11.patch("/apikeys/:id/toggle", toggleApiKey);
router11.delete("/apikeys/:id", deleteApiKey);
var adminRoutes_default = router11;

// src/routes/paymentSettingsRoutes.ts
import { Router as Router10 } from "express";

// src/models/PaymentSettings.ts
import mongoose23, { Schema as Schema21 } from "mongoose";
var PaymentSettingsSchema = new Schema21(
  {
    upiEnabled: { type: Boolean, default: true },
    bankEnabled: { type: Boolean, default: true },
    merchantName: { type: String, default: "" },
    upiId: { type: String, default: "demo@upi" },
    qrImage: { type: String, default: "" },
    qrCodeUrl: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountHolder: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    bankAccount: { type: String, default: "" },
    ifsc: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    branch: { type: String, default: "" },
    accountType: { type: String, default: "" },
    instructions: { type: String, default: "" },
    updatedBy: { type: Schema21.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);
var PaymentSettingsModel = mongoose23.model("PaymentSettings", PaymentSettingsSchema);

// src/controllers/paymentSettingsController.ts
import path4 from "path";
import fs4 from "fs";
var buildUploadUrl = (filename) => {
  const baseUrl = process.env.UPLOAD_BASE_URL || process.env.API_BASE_URL || "";
  if (baseUrl) {
    const normalizedBase = baseUrl.replace(/\/$/, "");
    return `${normalizedBase}/uploads/${filename}`;
  }
  return `/api/uploads/${filename}`;
};
var getStoredFilename = (value) => {
  if (!value) return "";
  const match = value.match(/(?:\/uploads\/|\/api\/uploads\/)([^/?#]+)$/i);
  return match?.[1] || "";
};
var getPaymentSettings = async (req, res) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({});
    }
    if (settings.qrImage && settings.qrImage.startsWith("/uploads/")) {
      settings.qrImage = buildUploadUrl(settings.qrImage.replace("/uploads/", ""));
    }
    if (settings.qrCodeUrl && settings.qrCodeUrl.startsWith("/uploads/")) {
      settings.qrCodeUrl = buildUploadUrl(settings.qrCodeUrl.replace("/uploads/", ""));
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var updatePaymentSettings = async (req, res) => {
  try {
    const updates = { ...req.body };
    const existingSettings = await PaymentSettingsModel.findOne();
    if (req.user && req.user.id) {
      updates.updatedBy = req.user.id;
    }
    if (existingSettings) {
      if (updates.qrImage === void 0) updates.qrImage = existingSettings.qrImage || "";
      if (updates.qrCodeUrl === void 0) updates.qrCodeUrl = existingSettings.qrCodeUrl || "";
    }
    let settings = existingSettings;
    if (!settings) {
      settings = await PaymentSettingsModel.create(updates);
    } else {
      settings = await PaymentSettingsModel.findOneAndUpdate({}, { $set: updates }, { new: true });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var uploadQR = async (req, res) => {
  try {
    const uploadedFile = req.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: "No image provided" });
    }
    const base64Data = fs4.readFileSync(uploadedFile.path, "base64");
    const mimeType = uploadedFile.mimetype || "image/png";
    const qrImageUrl = `data:${mimeType};base64,${base64Data}`;
    if (fs4.existsSync(uploadedFile.path)) {
      fs4.unlinkSync(uploadedFile.path);
    }
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({ qrImage: qrImageUrl });
    } else {
      settings.qrImage = qrImageUrl;
      settings.qrCodeUrl = qrImageUrl;
      if (req.user && req.user.id) {
        settings.updatedBy = req.user.id;
      }
      await settings.save();
    }
    res.json({ success: true, message: "QR Image uploaded successfully", qrImage: qrImageUrl });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var deleteQR = async (req, res) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (settings) {
      const previousFilename = getStoredFilename(settings.qrImage);
      if (previousFilename) {
        const oldPath = path4.join(process.cwd(), "uploads", previousFilename);
        if (fs4.existsSync(oldPath)) fs4.unlinkSync(oldPath);
      }
      settings.qrImage = "";
      settings.qrCodeUrl = "";
      if (req.user && req.user.id) {
        settings.updatedBy = req.user.id;
      }
      await settings.save();
    }
    res.json({ success: true, message: "QR Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/routes/paymentSettingsRoutes.ts
var router12 = Router10();
router12.get("/", getPaymentSettings);
router12.patch("/", protect, admin, updatePaymentSettings);
router12.post("/upload-qr", protect, admin, upload.single("qrImage"), uploadQR);
router12.delete("/qr", protect, admin, deleteQR);
var paymentSettingsRoutes_default = router12;

// src/routes/market.routes.ts
import express3 from "express";

// src/controllers/market.controller.ts
init_market_service();
init_symbolMapper();
var getTickers = async (req, res) => {
  try {
    const symbols = await MarketService.getWatchSymbols();
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
var getMovers = async (req, res) => {
  try {
    const exchange = req.query.exchange || "US";
    const name = req.query.name || "volume_gainers";
    const locale = req.query.locale || "en";
    const movers = await MarketService.getMovers({ exchange, name, locale });
    res.json(movers);
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
var getCrudeOil = async (req, res) => {
  try {
    const quote = await MarketService.getQuote("CL=F");
    if (!quote) {
      return res.status(404).json({ error: "Crude oil data not found" });
    }
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getCrudeOilChart = async (req, res) => {
  try {
    const symbol = req.query.symbol || "CL=F";
    const interval = req.query.interval || "1d";
    const range = req.query.range || "ytd";
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      }
    );
    if (!response.ok) {
      return res.status(response.status).json({
        error: `Yahoo Finance API returned ${response.status}`
      });
    }
    const data = await response.json();
    res.json({ status: 200, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getDividends = async (req, res) => {
  try {
    const cursor = req.query.cursor;
    let url = "https://api.massive.com/v3/reference/dividends";
    if (cursor) {
      url += `?cursor=${cursor}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": "Bearer Ou6vzKg8HGlOBRmr5ClS6F1myh4GioCh",
        "Accept": "application/json"
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Massive API returned ${response.status}` });
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/market.routes.ts
var router13 = express3.Router();
router13.get("/tickers", getTickers);
router13.get("/platform-status", async (req, res) => {
  try {
    const { MarketSettingsModel: MarketSettingsModel2 } = await Promise.resolve().then(() => (init_MarketSettings(), MarketSettings_exports));
    let settings = await MarketSettingsModel2.findOne();
    if (!settings) {
      settings = await MarketSettingsModel2.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router13.get("/tickers/:symbol", getTickerBySymbol);
router13.get("/watch", getWatch);
router13.get("/symbol/:symbol", getSymbolDetail);
router13.get("/quotes/:symbol", getQuotes);
router13.get("/chart/:symbol", getChart);
router13.get("/get-movers", getMovers);
router13.get("/forex", getForex);
router13.get("/crypto", getCrypto);
router13.get("/stocks", getStocks);
router13.get("/search", getSearch);
router13.get("/quote", getQuote);
router13.get("/crude-oil", getCrudeOil);
router13.get("/crude-oil-chart", getCrudeOilChart);
router13.get("/dividends", getDividends);
var market_routes_default = router13;

// src/routes/newsRoutes.ts
import express4 from "express";

// src/services/newsService.ts
import axios2 from "axios";
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
  static http = axios2.create({
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
  static buildCacheKey(path7, params) {
    const normalizedParams = { ...params };
    delete normalizedParams.api_token;
    return `${path7}|${JSON.stringify(normalizedParams)}`;
  }
  static async fetchFromMarketAux(path7, params) {
    const apiToken = this.getApiToken();
    const cacheKey = this.buildCacheKey(path7, params);
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }
    const request = async () => {
      const response = await this.http.get(path7, {
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
var router14 = express4.Router();
router14.get("/", getLatestNews);
router14.get("/forex", getForexNews);
router14.get("/search", searchNews);
router14.get("/sources", getNewsSources);
router14.get("/article/:uuid/similar", getSimilarArticles);
router14.get("/article/:uuid", getArticle);
router14.get("/:symbol", getSymbolNews);
var newsRoutes_default = router14;

// src/routes/economicCalendarRoutes.ts
import express5 from "express";

// src/controllers/economicCalendarController.ts
import fs5 from "fs/promises";
import path5 from "path";

// src/providers/forexCalendarProvider.ts
import axios3 from "axios";
var API_HOST = process.env.RAPID_API_FOREX_CALENDAR_HOST || "forex-calendar.p.rapidapi.com";
var API_KEY = process.env.RAPIDAPI_KEY;
if (!API_KEY) {
  throw new Error("RAPIDAPI_KEY is not configured in .env");
}
var client = axios3.create({
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
var DATA_DIR = path5.join(process.cwd(), "data");
var CALENDAR_FILE = path5.join(DATA_DIR, "economicCalendar.json");
async function readStoredCalendar() {
  try {
    const raw = await fs5.readFile(CALENDAR_FILE, "utf8");
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
        await fs5.mkdir(DATA_DIR, { recursive: true });
        await fs5.writeFile(CALENDAR_FILE, JSON.stringify({ calendar: fetched }, null, 2), "utf8");
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
    await fs5.mkdir(DATA_DIR, { recursive: true });
    await fs5.writeFile(CALENDAR_FILE, JSON.stringify({ calendar }, null, 2), "utf8");
    res.json({ success: true, calendar });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to import calendar" });
  }
};

// src/routes/economicCalendarRoutes.ts
var router15 = express5.Router();
router15.get("/", getEconomicCalendar);
router15.post("/import", importEconomicCalendar);
var economicCalendarRoutes_default = router15;

// src/routes/orderRoutes.ts
import { Router as Router11 } from "express";

// src/controllers/orderController.ts
init_Order();
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
var router16 = Router11();
router16.use(protect);
router16.route("/").get(getOrders2).post(createOrder2);
router16.route("/:id").get(getOrderById).patch(updateOrder).delete(deleteOrder);
var orderRoutes_default = router16;

// src/routes/profileRoutes.ts
import express6 from "express";

// src/controllers/profileController.ts
init_User();
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
    const { name, phone, country, avatar, email } = req.body;
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
    if (email && typeof email !== "string") {
      res.status(400).json({ message: "Validation Error: email must be string" });
      return;
    }
    const updateFields = {};
    if (name) updateFields.fullName = name;
    if (phone !== void 0) updateFields.phone = phone;
    if (country !== void 0) updateFields.country = country;
    if (avatar !== void 0) updateFields.avatar = avatar;
    if (email !== void 0) updateFields.email = email;
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
var router17 = express6.Router();
router17.get("/", protect, getProfile2);
router17.put("/", protect, updateProfile);
var profileRoutes_default = router17;

// src/routes/transactionRoutes.ts
import { Router as Router12 } from "express";

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
var router18 = Router12();
router18.get("/", protect, getTransactions);
var transactionRoutes_default = router18;

// src/routes/exchangeRateRoutes.ts
import express7 from "express";

// src/controllers/exchangeRateController.ts
var initDefaultRate = async () => {
  const count = await ExchangeRateModel.countDocuments();
  if (count === 0) {
    await ExchangeRateModel.create({
      currentRate: 85,
      baseCurrency: "USD",
      quoteCurrency: "INR",
      provider: "MANUAL",
      isActive: true
    });
  }
};
var getCurrentExchangeRate = async (req, res) => {
  try {
    const rate = await ExchangeRateModel.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!rate) {
      return res.json({ success: true, currentRate: 85 });
    }
    res.json({ success: true, rate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var updateExchangeRate = async (req, res) => {
  try {
    const { currentRate, provider } = req.body;
    const userId = req.user.id;
    if (!currentRate || currentRate <= 0) {
      return res.status(400).json({ success: false, error: "Invalid exchange rate" });
    }
    await ExchangeRateModel.updateMany({ isActive: true }, { $set: { isActive: false } });
    const newRate = await ExchangeRateModel.create({
      currentRate,
      baseCurrency: "USD",
      quoteCurrency: "INR",
      provider: provider || "MANUAL",
      isActive: true,
      updatedBy: userId
    });
    res.json({ success: true, rate: newRate });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
var getExchangeRateHistory = async (req, res) => {
  try {
    const history = await ExchangeRateModel.find().sort({ createdAt: -1 }).populate("updatedBy", "fullName username email").limit(50);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// src/routes/exchangeRateRoutes.ts
var router19 = express7.Router();
router19.get("/current", getCurrentExchangeRate);
router19.post("/", protect, admin, updateExchangeRate);
router19.get("/history", protect, admin, getExchangeRateHistory);
var exchangeRateRoutes_default = router19;

// server.ts
init_SymbolSpecification();
init_User();
init_Wallet();
import path6 from "path";
import bcrypt3 from "bcryptjs";
dotenv2.config({ path: "./.env" });
console.log("MONGO URI =", process.env.MONGODB_URI);
var app = express8();
var defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://www.novaf.in",
  "https://novaf.in",
  "https://www.novaf.online",
  "https://novaf.online",
  "https://forex-factory-admin-panel.vercel.app",
  "https://forex-factory-admin-panel.vercel.app/",
  "https://forex-backend-iem1.onrender.com",
  "https://forex-backend-63xj.onrender.com",
  "https://forex-frontend-2dmzc8t8z-forextradebio-boops-projects.vercel.app"
];
var envOrigins = (process.env.FRONTEND_URL || process.env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
var allowedOrigins = [.../* @__PURE__ */ new Set([...defaultAllowedOrigins, ...envOrigins])];
var isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/\.vercel\.app$/i.test(origin) || /\.onrender\.com$/i.test(origin)) return true;
  return false;
};
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Rejected Origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"]
}));
app.use(express8.json({ limit: "100mb" }));
app.use(express8.urlencoded({ limit: "100mb", extended: true }));
app.use((req, res, next) => {
  if (process.env.REQUEST_LOGGING === "true") {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
  }
  next();
});
app.use("/uploads", express8.static(path6.join(process.cwd(), "uploads")));
app.use("/api/uploads", express8.static(path6.join(process.cwd(), "uploads")));
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
app.use("/api/exchange-rates", exchangeRateRoutes_default);
app.use(errorHandler);
var server = http.createServer(app);
SocketServer.init(server);
var seedAdmin = async () => {
  try {
    const existingAdmin = await UserModel.findOne({ role: { $regex: /^admin$/i } });
    if (existingAdmin) {
      console.log("[Startup] Admin user already exists.");
      return;
    }
    const hashedPassword = await bcrypt3.hash("Admin@1234", 12);
    const adminUser = await UserModel.create({
      username: "admin@trading.com",
      fullName: "Admin User",
      email: "admin@trading.com",
      passwordHash: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
      kycStatus: "APPROVED"
    });
    await WalletModel.create({
      userId: adminUser._id,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      pnl: 0
    });
    await KycModel.create({
      userId: adminUser._id,
      status: "APPROVED",
      documents: []
    });
    await SettingsModel.create({
      userId: adminUser._id,
      theme: "light",
      notifications: true,
      language: "en"
    });
    console.log("[Startup] Admin user created: admin@trading.com / Admin@1234");
  } catch (error) {
    console.error("[Startup] Failed to seed admin:", error);
  }
};
var start = async () => {
  await connectDatabase();
  await initDefaultRate();
  await seedAdmin();
  await SymbolSpecification.loadAll();
  console.log("[Startup] Symbol specifications loaded.");
  const PORT = Number(process.env.PORT) || 8e3;
  try {
    await MarketService.start();
    PriceEngine.start();
    server.listen(PORT, () => {
      console.log(`\u{1F680} Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("[Startup] Failed to start market services:", err);
    server.listen(PORT, () => {
      console.log(`\u{1F680} Server running on port ${PORT} (Market Services Failed)`);
    });
  }
};
start();
//# sourceMappingURL=server.js.map
