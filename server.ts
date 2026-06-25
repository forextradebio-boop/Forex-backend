import dotenv from 'dotenv';
// Load environment variables before anything else!
dotenv.config({ path: './.env' }); // Since this is now in the backend folder, the path is './.env'

import express from 'express';
import cors from 'cors';
import { connectDatabase } from './src/config/database';
import authRoutes from './src/routes/authRoutes';
import healthRoutes from './src/routes/healthRoutes';
import { errorHandler } from './src/middleware/errorHandler';
import http from 'http';
import { SocketServer } from './src/services/socketServer';
import { PriceEngine } from './src/services/priceEngine';
import walletRoutes from './src/routes/walletRoutes';
import depositRoutes from './src/routes/depositRoutes';
import withdrawalRoutes from './src/routes/withdrawalRoutes';
import kycRoutes from './src/routes/kycRoutes';
import tradingRoutes from './src/routes/tradingRoutes';
import copyTradingRoutes from './src/routes/copyTradingRoutes';
import watchlistRoutes from './src/routes/watchlistRoutes';
import alertRoutes from './src/routes/alertRoutes';
import adminRoutes from './src/routes/adminRoutes';
import marketRoutes from './src/routes/marketRoutes';
import newsRoutes from './src/routes/newsRoutes';
import economicCalendarRoutes from './src/routes/economicCalendarRoutes';
import orderRoutes from './src/routes/orderRoutes';
import profileRoutes from './src/routes/profileRoutes';
import transactionRoutes from './src/routes/transactionRoutes';

console.log("MONGO URI =", process.env.MONGODB_URI);

const app = express();
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: true, // Allow all origins for now to prevent CORS errors
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/copy-trading', copyTradingRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/economic-calendar', economicCalendarRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/profile', profileRoutes);

// Central error handling
app.use(errorHandler);

const server = http.createServer(app);
SocketServer.init(server);

const start = async () => {
  await connectDatabase();
  const PORT = Number(process.env.PORT) || 8000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    PriceEngine.start();
  });
};

start();
