"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// server.ts
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_express18 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);

// src/config/database.ts
var import_mongoose = __toESM(require("mongoose"), 1);

// src/config/env.ts
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET ? "YES" : "NO");
console.log("JWT_REFRESH_SECRET loaded:", !!process.env.JWT_REFRESH_SECRET ? "YES" : "NO");
console.log("PORT value:", process.env.PORT);
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is missing from .env");
}
var config = {
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  port: process.env.PORT || "8000",
  nodeEnv: process.env.NODE_ENV || "development"
};

// src/config/database.ts
var connectDatabase = async () => {
  try {
    await import_mongoose.default.connect(config.mongoUri, {
      // useNewUrlParser and useUnifiedTopology are default in Mongoose 6+
    });
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
  import_mongoose.default.connection.on("error", (err) => {
    console.error("MongoDB error:", err);
  });
  const gracefulExit = async () => {
    await import_mongoose.default.connection.close();
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
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    country: { type: String },
    avatar: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER" },
    status: { type: String, enum: ["ACTIVE", "BANNED", "SUSPENDED"], default: "ACTIVE" },
    kycStatus: {
      type: String,
      enum: ["UNSUBMITTED", "PENDING", "APPROVED", "REJECTED"],
      default: "UNSUBMITTED"
    },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    isOtpVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);
var UserModel = import_mongoose2.default.model("User", UserSchema);

// src/models/Wallet.ts
var import_mongoose3 = __toESM(require("mongoose"), 1);
var WalletSchema = new import_mongoose3.Schema(
  {
    userId: { type: import_mongoose3.Schema.Types.ObjectId, required: true, ref: "User" },
    balance: { type: Number, default: 0 },
    equity: { type: Number, default: 0 },
    margin: { type: Number, default: 0 },
    freeMargin: { type: Number, default: 0 },
    pnl: { type: Number, default: 0 }
  },
  { timestamps: true }
);
var roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;
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
var WalletModel = import_mongoose3.default.model("Wallet", WalletSchema);

// src/utils/jwt.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var signAccessToken = (payload, expiresIn = "15m") => {
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
    const { fullName, email, password, phone } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const hashed = await import_bcryptjs.default.hash(password, 10);
    const otpCode = "123456";
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    const user = await UserModel.create({
      fullName,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashed,
      otpCode,
      otpExpiresAt,
      isOtpVerified: false
    });
    await WalletModel.create({
      userId: user._id,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      pnl: 0
    });
    res.status(201).json({
      success: true,
      userId: user._id,
      otpRequired: true,
      demoOtp: otpCode
    });
  } catch (err) {
    next(err);
  }
};
var login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const match = await import_bcryptjs.default.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!user.isOtpVerified) {
      const otpCode = "123456";
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      user.otpCode = otpCode;
      user.otpExpiresAt = otpExpiresAt;
      await user.save();
      console.log(`[DEVELOPMENT] Demo OTP for Login generated: ${otpCode}`);
      return res.status(200).json({
        success: true,
        userId: user._id,
        otpRequired: true,
        demoOtp: otpCode
      });
    }
    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile = user.toObject();
    delete profile.password;
    profile.id = profile._id;
    res.json({ token, refreshToken, profile });
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
    profile.id = profile._id;
    res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
};
var verify2FA = async (req, res, next) => {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: "Missing userId or code" });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.otpCode !== code && code !== "123456") {
      return res.status(400).json({ success: false, error: "Invalid OTP" });
    }
    if (user.otpExpiresAt && user.otpExpiresAt < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ success: false, error: "OTP expired" });
    }
    user.isOtpVerified = true;
    user.otpCode = void 0;
    user.otpExpiresAt = void 0;
    await user.save();
    const token = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });
    const profile = user.toObject();
    delete profile.password;
    profile.id = profile._id;
    res.status(200).json({
      success: true,
      message: "OTP verified",
      token,
      refreshToken,
      profile
    });
  } catch (err) {
    next(err);
  }
};
var resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (user.isOtpVerified) {
      return res.status(400).json({ error: "User is already verified" });
    }
    const otpCode = "123456";
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1e3);
    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    console.log(`[DEVELOPMENT] Resend Demo OTP generated: ${otpCode}`);
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      demoOtp: otpCode
    });
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
router.post("/verify-2fa", verify2FA);
router.post("/resend-otp", resendOTP);
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
  static io;
  static init(server2) {
    const allowedOrigins2 = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : ["http://localhost:5173", "http://localhost:5174"];
    this.io = new import_socket.Server(server2, {
      cors: {
        origin: allowedOrigins2,
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });
  }
  static broadcastPrices(prices) {
    if (this.io) {
      this.io.emit("prices", prices);
    }
  }
  static broadcastPnlUpdate(userId, positions) {
    if (this.io) {
      this.io.emit(`pnl_${userId}`, positions);
    }
  }
  static broadcastWalletUpdate(userId, wallet) {
    if (this.io) {
      this.io.emit(`wallet_${userId}`, wallet);
    }
  }
};

// src/services/apitxService.ts
var import_axios = __toESM(require("axios"), 1);
var ApitxService = class {
  static getHeaders() {
    return {
      "Authorization": `Bearer ${process.env.APITX_API_KEY}`,
      "Content-Type": "application/json"
    };
  }
  static async fetchLivePrices(symbols) {
    if (!process.env.APITX_API_KEY) return null;
    try {
      const res = await import_axios.default.get(`https://api.apitx.com/v1/market/quotes?symbols=${symbols.join(",")}`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      console.error("APITX fetchLivePrices failed", err);
      return null;
    }
  }
  static async placeOrder(payload) {
    if (!process.env.APITX_API_KEY) return { id: "mock_" + Date.now(), status: "FILLED" };
    try {
      const res = await import_axios.default.post("https://api.apitx.com/v1/trading/orders", payload, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error("APITX placeOrder failed");
    }
  }
  static async modifyOrder(orderId, payload) {
    if (!process.env.APITX_API_KEY) return { id: orderId, status: "MODIFIED" };
    try {
      const res = await import_axios.default.put(`https://api.apitx.com/v1/trading/orders/${orderId}`, payload, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error("APITX modifyOrder failed");
    }
  }
  static async closePosition(positionId) {
    if (!process.env.APITX_API_KEY) return { id: positionId, status: "CLOSED" };
    try {
      const res = await import_axios.default.post(`https://api.apitx.com/v1/trading/positions/${positionId}/close`, {}, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      throw new Error("APITX closePosition failed");
    }
  }
  static async fetchOpenPositions(accountId) {
    if (!process.env.APITX_API_KEY) return [];
    try {
      const res = await import_axios.default.get(`https://api.apitx.com/v1/trading/accounts/${accountId}/positions`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      return [];
    }
  }
  static async fetchAccountSummary(accountId) {
    if (!process.env.APITX_API_KEY) return null;
    try {
      const res = await import_axios.default.get(`https://api.apitx.com/v1/trading/accounts/${accountId}`, {
        headers: this.getHeaders()
      });
      return res.data;
    } catch (err) {
      return null;
    }
  }
};

// src/services/marketDataService.ts
var marketData = {
  "EURUSD": { price: 1.085, spread: 2e-4, category: "FOREX" },
  "GBPUSD": { price: 1.27, spread: 2e-4, category: "FOREX" },
  "USDJPY": { price: 150.5, spread: 0.01, category: "FOREX" },
  "BTCUSD": { price: 64000.5, spread: 1.5, category: "CRYPTO" },
  "ETHUSD": { price: 3500.25, spread: 0.5, category: "CRYPTO" },
  "SOLUSD": { price: 145.2, spread: 0.1, category: "CRYPTO" },
  "XAUUSD": { price: 2350.4, spread: 0.3, category: "METALS" },
  "XAGUSD": { price: 28.5, spread: 0.02, category: "METALS" },
  "AAPL": { price: 175.5, spread: 0.1, category: "STOCKS" },
  "TSLA": { price: 190.2, spread: 0.15, category: "STOCKS" }
};
var MarketDataService = class {
  /**
   * Generates a random tick price for a given symbol
   */
  static generateTick(symbol) {
    const data = marketData[symbol];
    if (!data) return null;
    const change = data.price * (Math.random() * 2e-3 - 1e-3);
    data.price = data.price + change;
    return {
      symbol,
      bid: Number((data.price - data.spread / 2).toFixed(5)),
      ask: Number((data.price + data.spread / 2).toFixed(5)),
      spread: data.spread,
      price: Number(data.price.toFixed(5)),
      change: Number(change.toFixed(5)),
      changePercent: Number((change / data.price * 100).toFixed(3)),
      category: data.category
    };
  }
  static async getTickers() {
    return Object.keys(marketData).map((sym) => this.generateTick(sym)).filter(Boolean);
  }
  static async getTicker(symbol) {
    return this.generateTick(symbol);
  }
  static async getByCategory(category) {
    const tickers = await this.getTickers();
    return tickers.filter((t) => t?.category === category);
  }
  static async getTopGainers() {
    const tickers = await this.getTickers();
    return tickers.sort((a, b) => (b?.changePercent || 0) - (a?.changePercent || 0)).slice(0, 5);
  }
  static async getTopLosers() {
    const tickers = await this.getTickers();
    return tickers.sort((a, b) => (a?.changePercent || 0) - (b?.changePercent || 0)).slice(0, 5);
  }
  static async getQuotes(symbols) {
    const results = {};
    if (process.env.APITX_API_KEY) {
      const livePrices = await ApitxService.fetchLivePrices(symbols);
      if (livePrices) return livePrices;
    }
    for (const sym of symbols) {
      const basePrice = marketData[sym]?.price || 100;
      const change = basePrice * (Math.random() * 2e-3 - 1e-3);
      const newPrice = basePrice + change;
      if (marketData[sym]) marketData[sym].price = newPrice;
      results[sym] = {
        price: newPrice,
        high: newPrice * 1.02,
        low: newPrice * 0.98,
        open: newPrice * 0.99,
        volume: Math.floor(Math.random() * 1e5)
      };
    }
    return results;
  }
  static async getChart(symbol) {
    const basePrice = marketData[symbol]?.price || 100;
    const history = [];
    let currentPrice = basePrice * 0.9;
    for (let i = 0; i < 50; i++) {
      const open = currentPrice;
      const close = open * (1 + (Math.random() * 0.02 - 0.01));
      const high = Math.max(open, close) * 1.01;
      const low = Math.min(open, close) * 0.99;
      history.push({
        time: Math.floor((Date.now() - (50 - i) * 6e4) / 1e3),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100
      });
      currentPrice = close;
    }
    return history;
  }
};

// src/models/Position.ts
var import_mongoose4 = __toESM(require("mongoose"), 1);
var PositionSchema = new import_mongoose4.Schema(
  {
    userId: { type: import_mongoose4.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    volume: { type: Number, required: true },
    openPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    sl: { type: Number },
    tp: { type: Number },
    pnl: { type: Number, default: 0 },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    closePrice: { type: Number }
  },
  { timestamps: true }
);
var PositionModel = import_mongoose4.default.model("Position", PositionSchema);

// src/models/Order.ts
var import_mongoose5 = __toESM(require("mongoose"), 1);
var OrderSchema = new import_mongoose5.Schema(
  {
    userId: { type: import_mongoose5.Schema.Types.ObjectId, ref: "User", required: true },
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
var OrderModel = import_mongoose5.default.model("Order", OrderSchema);

// src/services/marginEngine.ts
var MarginEngine = class {
  static async calculateMargin(userId, positions, prices) {
    let usedMargin = 0;
    let totalPnl = 0;
    for (const pos of positions) {
      if (pos.status !== "OPEN") continue;
      const currentPriceObj = prices[pos.symbol];
      const currentPrice = currentPriceObj ? currentPriceObj.price : pos.currentPrice || pos.openPrice;
      let pnl = 0;
      if (pos.type === "BUY") {
        pnl = (currentPrice - pos.openPrice) * pos.volume;
      } else if (pos.type === "SELL") {
        pnl = (pos.openPrice - currentPrice) * pos.volume;
      }
      pos.currentPrice = currentPrice;
      pos.pnl = pnl;
      totalPnl += pnl;
      const leverage = 100;
      usedMargin += currentPrice * pos.volume / leverage;
      await pos.save();
    }
    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      const equity = wallet.balance + totalPnl;
      wallet.equity = equity;
      wallet.margin = usedMargin;
      wallet.freeMargin = equity - usedMargin;
      wallet.marginLevel = usedMargin > 0 ? equity / usedMargin * 100 : 0;
      await wallet.save();
      return wallet;
    }
    return null;
  }
};

// src/services/stopLossEngine.ts
var StopLossEngine = class {
  static async evaluatePositions(positions, prices) {
    const closedPositions = [];
    for (const pos of positions) {
      if (pos.status !== "OPEN") continue;
      const currentPriceObj = prices[pos.symbol];
      if (!currentPriceObj) continue;
      const currentPrice = currentPriceObj.price;
      let shouldClose = false;
      if (pos.type === "BUY") {
        if (pos.sl && currentPrice <= pos.sl) shouldClose = true;
        if (pos.tp && currentPrice >= pos.tp) shouldClose = true;
      } else if (pos.type === "SELL") {
        if (pos.sl && currentPrice >= pos.sl) shouldClose = true;
        if (pos.tp && currentPrice <= pos.tp) shouldClose = true;
      }
      if (shouldClose) {
        pos.status = "CLOSED";
        pos.closePrice = currentPrice;
        let pnl = 0;
        if (pos.type === "BUY") {
          pnl = (currentPrice - pos.openPrice) * pos.volume;
        } else if (pos.type === "SELL") {
          pnl = (pos.openPrice - currentPrice) * pos.volume;
        }
        pos.pnl = pnl;
        await pos.save();
        const wallet = await WalletModel.findOne({ userId: pos.userId });
        if (wallet) {
          wallet.balance += pnl;
          await wallet.save();
        }
        closedPositions.push(pos);
      }
    }
    return closedPositions;
  }
};

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
  static symbols = ["BTCUSD", "ETHUSD", "AAPL", "TSLA", "EURUSD"];
  // Add more as needed
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("PriceEngine started");
    setInterval(async () => {
      try {
        await this.updateTick();
      } catch (err) {
        console.error("PriceEngine tick error", err);
      }
    }, 1e3);
  }
  static async updateTick() {
    const newPrices = await MarketDataService.getQuotes(this.symbols);
    this.currentPrices = { ...this.currentPrices, ...newPrices };
    SocketServer.broadcastPrices(
      Object.keys(this.currentPrices).map((sym) => ({
        symbol: sym,
        ...this.currentPrices[sym]
      }))
    );
    const openPositions = await PositionModel.find({ status: "OPEN" });
    const pendingOrders = await OrderModel.find({ status: "PENDING" });
    const positionsByUser = this.groupByUser(openPositions);
    for (const userId of Object.keys(positionsByUser)) {
      const userPositions = positionsByUser[userId];
      const closedPos = await StopLossEngine.evaluatePositions(userPositions, this.currentPrices);
      const wallet = await MarginEngine.calculateMargin(userId, userPositions, this.currentPrices);
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

// src/routes/walletRoutes.ts
var router3 = (0, import_express3.Router)();
router3.use(protect);
router3.get("/", getWallet);
var walletRoutes_default = router3;

// src/routes/depositRoutes.ts
var import_express4 = require("express");

// src/models/Deposit.ts
var import_mongoose6 = __toESM(require("mongoose"), 1);
var DepositSchema = new import_mongoose6.Schema(
  {
    userId: { type: import_mongoose6.Schema.Types.ObjectId, required: true, ref: "User" },
    amount: { type: Number, required: true },
    utr: { type: String, required: true },
    screenshot: { type: String },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    adminNote: { type: String }
  },
  { timestamps: true }
);
var DepositModel = import_mongoose6.default.model("Deposit", DepositSchema);

// src/models/Transaction.ts
var import_mongoose7 = __toESM(require("mongoose"), 1);
var TransactionSchema = new import_mongoose7.Schema(
  {
    userId: { type: import_mongoose7.Schema.Types.ObjectId, required: true, ref: "User" },
    type: { type: String, enum: ["DEPOSIT", "WITHDRAW", "TRADE", "BONUS", "TRADE_LOSS", "ADMIN_ADJUSTMENT"], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    referenceId: { type: String },
    description: { type: String }
  },
  { timestamps: true }
);
var TransactionModel = import_mongoose7.default.model("Transaction", TransactionSchema);

// src/controllers/depositController.ts
var createDeposit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, utr, screenshot } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    if (!utr) {
      return res.status(400).json({ error: "UTR is required" });
    }
    const deposit = await DepositModel.create({
      userId,
      amount,
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
      description: `Deposit request of $${amount} via UTR ${utr}`
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
var import_mongoose8 = __toESM(require("mongoose"), 1);
var WithdrawalSchema = new import_mongoose8.Schema(
  {
    userId: { type: import_mongoose8.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    bankDetails: { type: import_mongoose8.Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
    adminNotes: { type: String }
  },
  { timestamps: true }
);
var WithdrawalModel = import_mongoose8.default.model("Withdrawal", WithdrawalSchema);

// src/models/AuditLog.ts
var import_mongoose9 = __toESM(require("mongoose"), 1);
var AuditLogSchema = new import_mongoose9.Schema(
  {
    adminId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "User" },
    userId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    details: { type: import_mongoose9.Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: true }
);
var AuditLogModel = import_mongoose9.default.model("AuditLog", AuditLogSchema);

// src/controllers/withdrawalController.ts
var requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, bankDetails } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Amount must be greater than 0" });
    }
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet || amount > wallet.freeMargin) {
      return res.status(400).json({ error: "Insufficient free margin" });
    }
    const withdrawal = await WithdrawalModel.create({
      userId,
      amount,
      bankDetails,
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
      description: `Withdrawal request of $${amount}`
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

// src/controllers/kycController.ts
var import_mongoose11 = __toESM(require("mongoose"), 1);

// src/models/Kyc.ts
var import_mongoose10 = __toESM(require("mongoose"), 1);
var KycSchema = new import_mongoose10.Schema(
  {
    userId: { type: import_mongoose10.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["UNSUBMITTED", "PENDING", "APPROVED", "REJECTED"], default: "UNSUBMITTED" },
    documentType: { type: String },
    documentNumber: { type: String },
    fullName: { type: String },
    dob: { type: String },
    documents: [{ type: String }],
    adminNotes: { type: String }
  },
  { timestamps: true }
);
var KycModel = import_mongoose10.default.model("Kyc", KycSchema);

// src/controllers/kycController.ts
var submitKyc = async (req, res) => {
  try {
    const rawUserId = req.user.id;
    const userId = new import_mongoose11.default.Types.ObjectId(rawUserId);
    const { documentType, documentNumber, fullName, dob, documents } = req.body;
    console.log(`[KYC POST] Received submission for user ${userId}. Body:`, req.body);
    let kyc = await KycModel.findOne({ userId });
    if (kyc) {
      kyc.documentType = documentType;
      kyc.documentNumber = documentNumber;
      kyc.fullName = fullName;
      kyc.dob = dob;
      kyc.documents = documents;
      kyc.status = "PENDING";
      await kyc.save();
      console.log(`[KYC POST] Updated existing record:`, kyc._id);
    } else {
      kyc = await KycModel.create({
        userId,
        documentType,
        documentNumber,
        fullName,
        dob,
        documents,
        status: "PENDING"
      });
      console.log(`[KYC POST] Created new record:`, kyc._id);
    }
    await UserModel.findByIdAndUpdate(userId, { kycStatus: "PENDING" });
    res.json(kyc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getKyc = async (req, res) => {
  try {
    const rawUserId = req.user.id;
    const userId = new import_mongoose11.default.Types.ObjectId(rawUserId);
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

// src/routes/kycRoutes.ts
var router6 = (0, import_express6.Router)();
router6.use(protect);
router6.post("/", submitKyc);
router6.get("/", getKyc);
var kycRoutes_default = router6;

// src/routes/tradingRoutes.ts
var import_express7 = require("express");

// src/controllers/tradingController.ts
var getPositions = async (req, res) => {
  try {
    const userId = req.user.id;
    const positions = await PositionModel.find({ userId });
    res.json(positions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var createPosition = async (req, res) => {
  try {
    const userId = req.user.id;
    const { symbol, type, volume, openPrice, sl, tp } = req.body;
    const position = await PositionModel.create({
      userId,
      symbol,
      type,
      volume,
      openPrice,
      currentPrice: openPrice,
      sl,
      tp,
      status: "OPEN",
      pnl: 0
    });
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var closePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const position = await PositionModel.findOne({ _id: id, userId });
    if (!position) return res.status(404).json({ error: "Position not found" });
    position.status = "CLOSED";
    position.closePrice = req.body.closePrice || position.currentPrice;
    await position.save();
    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.pnl -= position.pnl;
      wallet.equity = wallet.balance + wallet.pnl;
      await wallet.save();
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

// src/routes/tradingRoutes.ts
var router7 = (0, import_express7.Router)();
router7.use(protect);
router7.get("/positions", getPositions);
router7.post("/positions", createPosition);
router7.post("/positions/:id/close", closePosition);
router7.get("/orders", getOrders);
router7.post("/orders", createOrder);
router7.post("/orders/:id/cancel", cancelOrder);
var tradingRoutes_default = router7;

// src/routes/copyTradingRoutes.ts
var import_express8 = __toESM(require("express"), 1);

// src/models/CopyTrader.ts
var import_mongoose12 = __toESM(require("mongoose"), 1);
var CopyTraderSchema = new import_mongoose12.Schema(
  {
    providerId: { type: import_mongoose12.Schema.Types.ObjectId, ref: "User", required: true },
    followerId: { type: import_mongoose12.Schema.Types.ObjectId, ref: "User", required: true },
    allocationRatio: { type: Number, default: 1 },
    profitSharePercent: { type: Number, default: 20 },
    status: { type: String, enum: ["ACTIVE", "PAUSED", "STOPPED"], default: "ACTIVE" }
  },
  { timestamps: true }
);
var CopyTraderModel = import_mongoose12.default.model("CopyTrader", CopyTraderSchema);

// src/models/Notification.ts
var import_mongoose13 = __toESM(require("mongoose"), 1);
var NotificationSchema = new import_mongoose13.Schema(
  {
    userId: { type: import_mongoose13.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);
var NotificationModel = import_mongoose13.default.model("Notification", NotificationSchema);

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
var import_mongoose14 = __toESM(require("mongoose"), 1);
var WatchlistSchema = new import_mongoose14.Schema(
  {
    userId: { type: import_mongoose14.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    symbols: [{ type: String }]
  },
  { timestamps: true }
);
var WatchlistModel = import_mongoose14.default.model("Watchlist", WatchlistSchema);

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
var import_mongoose15 = __toESM(require("mongoose"), 1);
var AlertSchema = new import_mongoose15.Schema(
  {
    userId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "User", required: true },
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
var AlertModel = import_mongoose15.default.model("Alert", AlertSchema);

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
    const users = await UserModel.find().select("-password");
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

// src/controllers/adminDepositController.ts
var import_mongoose16 = __toESM(require("mongoose"), 1);
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
  const session = await import_mongoose16.default.startSession();
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
router11.get("/deposits", getAllDeposits);
router11.get("/deposits/:id", getDepositById);
router11.patch("/deposits/:id/approve", approveDeposit);
router11.patch("/deposits/:id/reject", rejectDeposit);
router11.post("/kyc/:id/approve", approveKyc);
router11.post("/kyc/:id/reject", rejectKyc);
router11.post("/withdrawals/:id/approve", approveWithdrawal);
router11.post("/withdrawals/:id/reject", rejectWithdrawal);
router11.post("/wallet", adminWalletControl);
router11.post("/user", adminUserControl);
var adminRoutes_default = router11;

// src/routes/marketRoutes.ts
var import_express12 = __toESM(require("express"), 1);

// src/controllers/marketController.ts
var getTickers = async (req, res) => {
  try {
    const tickers = await MarketDataService.getTickers();
    res.json(tickers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getTickerBySymbol = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    const ticker = await MarketDataService.getTicker(symbol);
    if (!ticker) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    res.json(ticker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getTopGainers = async (req, res) => {
  try {
    const gainers = await MarketDataService.getTopGainers();
    res.json(gainers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getTopLosers = async (req, res) => {
  try {
    const losers = await MarketDataService.getTopLosers();
    res.json(losers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getForex = async (req, res) => {
  try {
    const forex = await MarketDataService.getByCategory("FOREX");
    res.json(forex);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getCrypto = async (req, res) => {
  try {
    const crypto = await MarketDataService.getByCategory("CRYPTO");
    res.json(crypto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getMetals = async (req, res) => {
  try {
    const metals = await MarketDataService.getByCategory("METALS");
    res.json(metals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getQuotes = async (req, res) => {
  try {
    const symbolParam = req.params.symbol || req.query.symbols;
    const symbols = symbolParam?.split(",") || ["BTCUSD", "ETHUSD", "AAPL", "TSLA"];
    const quotes = await MarketDataService.getQuotes(symbols);
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
var getSymbols = async (req, res) => {
  res.json({
    symbols: [
      { symbol: "BTCUSD", name: "Bitcoin", category: "CRYPTO" },
      { symbol: "ETHUSD", name: "Ethereum", category: "CRYPTO" },
      { symbol: "AAPL", name: "Apple Inc.", category: "STOCKS" },
      { symbol: "TSLA", name: "Tesla", category: "STOCKS" },
      { symbol: "EURUSD", name: "Euro / US Dollar", category: "FOREX" }
    ]
  });
};
var getChart = async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const chart = await MarketDataService.getChart(symbol);
    res.json(chart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/routes/marketRoutes.ts
var router12 = import_express12.default.Router();
router12.get("/tickers", protect, getTickers);
router12.get("/tickers/:symbol", protect, getTickerBySymbol);
router12.get("/quotes/:symbol", protect, getQuotes);
router12.get("/top-gainers", protect, getTopGainers);
router12.get("/top-losers", protect, getTopLosers);
router12.get("/forex", protect, getForex);
router12.get("/crypto", protect, getCrypto);
router12.get("/metals", protect, getMetals);
router12.get("/symbols", getSymbols);
router12.get("/chart/:symbol", getChart);
var marketRoutes_default = router12;

// src/routes/newsRoutes.ts
var import_express13 = __toESM(require("express"), 1);

// src/controllers/newsController.ts
var getNews = async (req, res) => {
  try {
    res.json({
      news: [
        {
          id: "1",
          title: "Market Update",
          summary: "Global markets remain stable",
          source: "Forex Factory",
          publishedAt: "2026-01-01T00:00:00Z"
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
};

// src/routes/newsRoutes.ts
var router13 = import_express13.default.Router();
router13.get("/", getNews);
var newsRoutes_default = router13;

// src/routes/economicCalendarRoutes.ts
var import_express14 = __toESM(require("express"), 1);

// src/controllers/economicCalendarController.ts
var getEconomicCalendar = async (req, res) => {
  try {
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

// src/routes/economicCalendarRoutes.ts
var router14 = import_express14.default.Router();
router14.get("/", getEconomicCalendar);
var economicCalendarRoutes_default = router14;

// src/routes/orderRoutes.ts
var import_express15 = require("express");

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
var router15 = (0, import_express15.Router)();
router15.use(protect);
router15.route("/").get(getOrders2).post(createOrder2);
router15.route("/:id").get(getOrderById).patch(updateOrder).delete(deleteOrder);
var orderRoutes_default = router15;

// src/routes/profileRoutes.ts
var import_express16 = __toESM(require("express"), 1);

// src/controllers/profileController.ts
var getProfile2 = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.status(200).json({
      _id: user._id,
      name: user.fullName,
      email: user.email,
      phone: user.phone || "",
      country: user.country || "",
      avatar: user.avatar || "",
      createdAt: user.createdAt
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
var router16 = import_express16.default.Router();
router16.get("/", protect, getProfile2);
router16.put("/", protect, updateProfile);
var profileRoutes_default = router16;

// src/routes/transactionRoutes.ts
var import_express17 = require("express");

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
var router17 = (0, import_express17.Router)();
router17.get("/", protect, getTransactions);
var transactionRoutes_default = router17;

// server.ts
import_dotenv2.default.config({ path: "./.env" });
console.log("MONGO URI =", process.env.MONGODB_URI);
var app = (0, import_express18.default)();
var allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",") : ["http://localhost:5173", "http://localhost:5174"];
app.use((0, import_cors.default)({
  origin: allowedOrigins,
  credentials: true
}));
app.use(import_express18.default.json({ limit: "50mb" }));
app.use(import_express18.default.urlencoded({ limit: "50mb", extended: true }));
app.use("/api/auth", authRoutes_default);
app.use("/api/health", healthRoutes_default);
app.use("/api/wallet", walletRoutes_default);
app.use("/api/deposits", depositRoutes_default);
app.use("/api/withdrawals", withdrawalRoutes_default);
app.use("/api/transactions", transactionRoutes_default);
app.use("/api/kyc", kycRoutes_default);
app.use("/api/trading", tradingRoutes_default);
app.use("/api/copy-trading", copyTradingRoutes_default);
app.use("/api/watchlist", watchlistRoutes_default);
app.use("/api/alerts", alertRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api/market", marketRoutes_default);
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
