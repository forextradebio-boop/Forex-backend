import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DepositModel } from '../models/Deposit';
import { WalletModel } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';
import { AuditLogModel } from '../models/AuditLog';
import { NotificationModel } from '../models/Notification';
import { SocketServer } from '../services/socketServer';
import { ExchangeRateModel } from '../models/ExchangeRate';

export const getAllDeposits = async (req: Request, res: Response) => {
  try {
    const deposits = await DepositModel.find().sort({ createdAt: -1 }).populate('userId', 'fullName username email');
    res.json({ success: true, deposits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDepositById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id).populate('userId', 'fullName username email');
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    res.json({ success: true, deposit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveDeposit = async (req: Request, res: Response) => {
  let retries = 3;
  while (retries > 0) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const { id } = req.params;
      const { remarks, customExchangeRate } = req.body;
      const adminId = (req as any).user.id;
      
      const deposit = await DepositModel.findById(id).session(session);
      
      if (!deposit) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, error: 'Deposit not found' });
      }
      
      if (deposit.status === 'APPROVED') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, error: 'Deposit is already approved' });
      }

      if (deposit.status === 'REJECTED') {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, error: 'Deposit is already rejected' });
      }

      deposit.status = 'APPROVED';
      deposit.remarks = remarks || deposit.remarks;
      deposit.approvedBy = adminId;
      deposit.approvedAt = new Date();
      await deposit.save({ session });

      const wallet = await WalletModel.findOne({ userId: deposit.userId }).session(session);
      if (wallet) {
        const exchangeRateDoc = await ExchangeRateModel.findOne({ isActive: true }).session(session);
        const rate = customExchangeRate ? Number(customExchangeRate) : (exchangeRateDoc ? exchangeRateDoc.currentRate : 85);
        const amountInUSD = deposit.amount / rate;

        deposit.exchangeRate = rate;
        deposit.creditedUSD = amountInUSD;
        await deposit.save({ session });

        wallet.balance += amountInUSD;
        wallet.equity = wallet.balance + (wallet.pnl || 0);
        wallet.freeMargin = wallet.equity - (wallet.margin || 0);
        await wallet.save({ session });

        await TransactionModel.create([{
          userId: deposit.userId,
          type: 'DEPOSIT',
          amount: amountInUSD,
          balanceAfter: wallet.balance,
          status: 'APPROVED',
          referenceId: (deposit as any)._id.toString(),
          description: `Deposit Approved by Admin${remarks ? ' - ' + remarks : ''}`
        }], { session });
      }

      await AuditLogModel.create([{ adminId, action: 'APPROVE_DEPOSIT', details: { depositId: id, remarks } }], { session });
      await NotificationModel.create([{ userId: deposit.userId, title: 'Deposit Approved', message: `Your deposit of ${deposit.currency} ${deposit.amount} has been approved.`, type: 'SUCCESS' }], { session });

      await session.commitTransaction();
      session.endSession();
      
      // Broadcast transaction event to update UI
      SocketServer.broadcastTransactionUpdate(deposit.userId.toString());

      return res.json({ success: true, message: 'Deposit approved successfully', deposit });
    } catch (error: any) {
      await session.abortTransaction();
      session.endSession();
      if (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError') && retries > 1) {
        retries--;
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};

export const rejectDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;
    const adminId = (req as any).user.id;
    
    const deposit = await DepositModel.findById(id);
    
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    
    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Deposit is already ${deposit.status}` });
    }
    
    deposit.status = 'REJECTED';
    deposit.remarks = reason || remarks || 'Rejected by Admin';
    await deposit.save();

    await TransactionModel.create({
      userId: deposit.userId,
      type: 'DEPOSIT',
      amount: deposit.amount,
      status: 'REJECTED',
      referenceId: (deposit as any)._id.toString(),
      description: `Deposit Rejected - ${deposit.remarks}`
    });

    await AuditLogModel.create({ adminId, action: 'REJECT_DEPOSIT', details: { depositId: id, reason: deposit.remarks } });
    await NotificationModel.create({ userId: deposit.userId, title: 'Deposit Rejected', message: `Your deposit request was rejected. Reason: ${deposit.remarks}`, type: 'ERROR' });

    res.json({ success: true, message: 'Deposit rejected', deposit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id);
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    
    await DepositModel.findByIdAndDelete(id);
    await AuditLogModel.create({ adminId: (req as any).user.id, action: 'DELETE_DEPOSIT', details: { depositId: id } });
    
    res.json({ success: true, message: 'Deposit deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const blockDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, remarks } = req.body;
    const adminId = (req as any).user.id;
    
    const deposit = await DepositModel.findById(id);
    
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    
    if (deposit.status !== 'PENDING' && deposit.status !== 'REJECTED') {
      return res.status(400).json({ success: false, error: `Cannot block deposit that is ${deposit.status}` });
    }
    
    deposit.status = 'BLOCKED';
    deposit.remarks = reason || remarks || 'Blocked by Admin for security reasons';
    await deposit.save();

    await TransactionModel.create({
      userId: deposit.userId,
      type: 'DEPOSIT',
      amount: deposit.amount,
      status: 'BLOCKED',
      referenceId: (deposit as any)._id.toString(),
      description: `Deposit Blocked - ${deposit.remarks}`
    });

    await AuditLogModel.create({ adminId, action: 'BLOCK_DEPOSIT', details: { depositId: id, reason: deposit.remarks } });
    await NotificationModel.create({ userId: deposit.userId, title: 'Deposit Blocked', message: `Your deposit request was blocked. Reason: ${deposit.remarks}`, type: 'ERROR' });

    res.json({ success: true, message: 'Deposit blocked', deposit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

