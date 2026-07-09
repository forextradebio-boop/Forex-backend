import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { DepositModel } from '../models/Deposit';
import { KycModel } from '../models/Kyc';
import { WalletModel } from '../models/Wallet';
import { WithdrawalModel } from '../models/Withdrawal';
import { TransactionModel } from '../models/Transaction';
import { AuditLogModel } from '../models/AuditLog';
import { PositionModel } from '../models/Position';
import { NotificationModel } from '../models/Notification';
import { SymbolModel } from '../models/Symbol';
import { NewsModel } from '../models/News';
import bcrypt from 'bcryptjs';
import { MarginEngine } from '../services/marginEngine';

const logAdminAction = async (adminId: any, action: string, details: any) => {
  await AuditLogModel.create({ adminId, action, details });
};

const sendNotification = async (userId: any, title: string, message: string, type: string) => {
  await NotificationModel.create({ userId, title, message, type });
};

export const getAdminDashboardData = async (req: Request, res: Response) => {
  try {
    const adminUser = await UserModel.findById((req as any).user.id);
    if (!adminUser || adminUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const users = await UserModel.find().select('-password -passwordHash');
    const deposits = await DepositModel.find().populate('userId', 'fullName email');
    const kycRequests = await KycModel.find().populate('userId', 'fullName email kycStatus');
    const wallets = await WalletModel.find().populate('userId', 'fullName email');
    const withdrawals = await WithdrawalModel.find().populate('userId', 'fullName email');

    // Analytics
    const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const depositsToday = await DepositModel.find({ createdAt: { $gte: startOfDay } });
    const withdrawalsToday = await WithdrawalModel.find({ createdAt: { $gte: startOfDay } });
    const openPositions = await PositionModel.find({ status: 'OPEN' });
    const closedPositions = await PositionModel.find({ status: 'CLOSED' });

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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Legacy deposits handlers were moved to adminDepositController.ts

export const approveKyc = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kyc = await KycModel.findById(id);
    if (!kyc) return res.status(404).json({ error: 'KYC not found' });

    kyc.status = 'APPROVED';
    await kyc.save();

    await UserModel.findByIdAndUpdate(kyc.userId, { kycStatus: 'APPROVED' });
    await logAdminAction((req as any).user.id, 'APPROVE_KYC', { kycId: id });
    await sendNotification(kyc.userId, 'KYC Approved', 'Your KYC has been approved.', 'SUCCESS');

    res.json(kyc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectKyc = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const kyc = await KycModel.findById(id);
    if (!kyc) return res.status(404).json({ error: 'KYC not found' });

    kyc.status = 'REJECTED';
    await kyc.save();

    await UserModel.findByIdAndUpdate(kyc.userId, { kycStatus: 'REJECTED' });
    await logAdminAction((req as any).user.id, 'REJECT_KYC', { kycId: id, reason: req.body.reason });
    await sendNotification(kyc.userId, 'KYC Rejected', `Your KYC was rejected. Reason: ${req.body.reason}`, 'ERROR');

    res.json(kyc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const approveWithdrawal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalModel.findById(id);
    if (!withdrawal) return res.status(404).json({ error: 'Not found' });

    withdrawal.status = 'APPROVED';
    await withdrawal.save();

    const wallet = await WalletModel.findOne({ userId: withdrawal.userId });
    if (wallet) {
      await TransactionModel.create({
        userId: withdrawal.userId,
        type: 'WITHDRAWAL',
        amount: withdrawal.amount,
        balanceAfter: wallet.balance,
        description: 'Withdrawal Approved'
      });
    }

    await logAdminAction((req as any).user.id, 'APPROVE_WITHDRAWAL', { withdrawalId: id });
    await sendNotification(withdrawal.userId, 'Withdrawal Approved', 'Your withdrawal has been processed.', 'SUCCESS');

    res.json(withdrawal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectWithdrawal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const withdrawal = await WithdrawalModel.findById(id);
    if (!withdrawal) return res.status(404).json({ error: 'Not found' });

    withdrawal.status = 'REJECTED';
    await withdrawal.save();

    const wallet = await WalletModel.findOne({ userId: withdrawal.userId });
    if (wallet) {
      wallet.balance += withdrawal.amount; // refund
      await wallet.save();
      // Recalculate wallet metrics
      const openPositions = await PositionModel.find({ userId: withdrawal.userId, status: 'OPEN' });
      await MarginEngine.calculateMargin(withdrawal.userId.toString(), openPositions, {});
    }

    await logAdminAction((req as any).user.id, 'REJECT_WITHDRAWAL', { withdrawalId: id });
    await sendNotification(withdrawal.userId, 'Withdrawal Rejected', 'Your withdrawal request was rejected.', 'ERROR');

    res.json(withdrawal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const adminWalletControl = async (req: Request, res: Response) => {
  try {
    const { userId, action, amount } = req.body; // action: CREDIT, DEBIT, FREEZE, UNFREEZE
    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

    if (action === 'CREDIT') {
      wallet.balance += amount;
      await TransactionModel.create({ userId, type: 'ADMIN_ADJUSTMENT', amount, balanceAfter: wallet.balance, description: 'Admin Credit' });
    } else if (action === 'DEBIT') {
      wallet.balance -= amount;
      await TransactionModel.create({ userId, type: 'ADMIN_ADJUSTMENT', amount: -amount, balanceAfter: wallet.balance, description: 'Admin Debit' });
    } else if (action === 'FREEZE') {
      wallet.status = 'FROZEN';
    } else if (action === 'UNFREEZE') {
      wallet.status = 'ACTIVE';
    }

    await wallet.save();
    // Recalculate wallet after admin changes
    const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
    await MarginEngine.calculateMargin(userId, openPositions, {});
    await logAdminAction((req as any).user.id, 'WALLET_CONTROL', { userId, action, amount });
    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const adminUserControl = async (req: Request, res: Response) => {
  try {
    const { userId, action, newPassword } = req.body; // action: DISABLE, ENABLE, BLOCK_TRADING, RESET_PASSWORD
    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (action === 'DISABLE') user.status = 'DISABLED';
    if (action === 'ENABLE') user.status = 'ACTIVE';
    if (action === 'BLOCK_TRADING') user.status = 'TRADING_BLOCKED';
    if (action === 'RESET_PASSWORD' && newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    await logAdminAction((req as any).user.id, 'USER_CONTROL', { userId, action });
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await UserModel.find().select('-password -passwordHash');
    res.json({ users });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getKycRequests = async (req: Request, res: Response) => {
  try {
    const kycRequests = await KycModel.find().populate('userId', 'fullName email username kycStatus');
    res.json({ kycRequests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await WithdrawalModel.find().populate('userId', 'fullName email username');
    res.json({ withdrawals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSymbols = async (req: Request, res: Response) => {
  try {
    const symbols = await SymbolModel.find().sort({ symbol: 1 });
    res.json({ symbols });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSymbol = async (req: Request, res: Response) => {
  try {
    const { symbol, name, category, price, leverageLimit, spread } = req.body;
    if (!symbol || !name || price === undefined || leverageLimit === undefined || spread === undefined) {
      return res.status(400).json({ error: 'Missing required symbol data' });
    }

    const normalized = String(symbol).toUpperCase().trim();
    const existing = await SymbolModel.findOne({ symbol: normalized });
    if (existing) {
      return res.status(400).json({ error: 'Symbol already exists' });
    }

    const newSymbol = await SymbolModel.create({
      symbol: normalized,
      name,
      category,
      price: Number(price),
      leverageLimit: Number(leverageLimit),
      spread: Number(spread),
      isActive: true,
    });

    await logAdminAction((req as any).user.id, 'CREATE_SYMBOL', { symbol: normalized });
    res.status(201).json(newSymbol);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const toggleSymbol = async (req: Request, res: Response) => {
  try {
    const symbolCode = String(req.params.symbol || '').toUpperCase();
    const symbol = await SymbolModel.findOne({ symbol: symbolCode });
    if (!symbol) return res.status(404).json({ error: 'Symbol not found' });

    symbol.isActive = !symbol.isActive;
    await symbol.save();
    await logAdminAction((req as any).user.id, 'TOGGLE_SYMBOL', { symbol: symbolCode, isActive: symbol.isActive });
    res.json(symbol);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const modifySymbol = async (req: Request, res: Response) => {
  try {
    const symbolCode = String(req.params.symbol || '').toUpperCase();
    const { leverageLimit, spread, minLot, maxLot, lotStep } = req.body;
    
    const symbol = await SymbolModel.findOne({ symbol: symbolCode });
    if (!symbol) return res.status(404).json({ error: 'Symbol not found' });

    if (leverageLimit !== undefined) symbol.leverageLimit = Number(leverageLimit);
    if (spread !== undefined) symbol.spread = Number(spread);
    if (minLot !== undefined) symbol.minLot = Number(minLot);
    if (maxLot !== undefined) symbol.maxLot = Number(maxLot);
    if (lotStep !== undefined) symbol.lotStep = Number(lotStep);
    
    await symbol.save();
    await logAdminAction((req as any).user.id, 'MODIFY_SYMBOL', { symbol: symbolCode, updates: req.body });
    res.json(symbol);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createNews = async (req: Request, res: Response) => {
  try {
    const { title, summary, content, category, source } = req.body;
    if (!title || !summary || !content || !category || !source) {
      return res.status(400).json({ error: 'Missing required news fields' });
    }

    const news = await NewsModel.create({
      title,
      summary,
      content,
      category,
      source,
      authorId: (req as any).user.id
    });

    await logAdminAction((req as any).user.id, 'CREATE_NEWS', { newsId: news._id });
    res.status(201).json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const dispatchNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Missing notification title or content' });
    }

    if (userId === 'ALL' || !userId) {
      const users = await UserModel.find().select('_id');
      const notifications = users.map((user) => ({ userId: user._id, title, message: content, type: 'INFO' }));
      await NotificationModel.insertMany(notifications);
      await logAdminAction((req as any).user.id, 'DISPATCH_NOTIFICATION', { target: 'ALL' });
      return res.json({ success: true, sent: users.length });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notification = await NotificationModel.create({ userId, title, message: content, type: 'INFO' });
    await logAdminAction((req as any).user.id, 'DISPATCH_NOTIFICATION', { userId, notificationId: notification._id });
    res.json(notification);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const forceCloseTrade = async (req: Request, res: Response) => {
  try {
    const { posId } = req.params;
    const position = await PositionModel.findById(posId);
    if (!position) return res.status(404).json({ error: 'Position not found' });

    if (position.status === 'CLOSED') {
      return res.status(400).json({ error: 'Position already closed' });
    }

    const { MarketService } = await import('../services/market.service');
    const { TradeUtils } = await import('../services/tradeUtils');
    const quote = await MarketService.getQuote(position.symbol);
    if (!quote) return res.status(503).json({ error: 'Market data unavailable' });

    position.status = 'CLOSED';
    position.closePrice = position.type === 'BUY' ? quote.bid : quote.ask;
    
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
      const openPositions = await PositionModel.find({ userId: position.userId, status: 'OPEN' });
      await MarginEngine.calculateMargin(position.userId.toString(), openPositions, {});
    }

    await logAdminAction((req as any).user.id, 'FORCE_CLOSE_POSITION', { positionId: posId });
    res.json(position);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
