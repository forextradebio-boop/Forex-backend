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
import bcrypt from 'bcryptjs';

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

    const users = await UserModel.find().select('-password');
    const deposits = await DepositModel.find().populate('userId', 'fullName email');
    const kycRequests = await KycModel.find().populate('userId', 'fullName email kycStatus');
    const wallets = await WalletModel.find().populate('userId', 'fullName email');
    const withdrawals = await WithdrawalModel.find().populate('userId', 'fullName email');
    
    // Analytics
    const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
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
    if (action === 'BLOCK_TRADING') user.status = 'TRADING_BLOCKED'; // Ensure User Schema supports this or map it
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
