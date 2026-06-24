import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { DepositModel } from '../models/Deposit';
import { WalletModel } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';
import { AuditLogModel } from '../models/AuditLog';
import { NotificationModel } from '../models/Notification';

export const getAllDeposits = async (req: Request, res: Response) => {
  try {
    const deposits = await DepositModel.find().sort({ createdAt: -1 }).populate('userId', 'fullName email');
    res.json({ success: true, deposits });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getDepositById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id).populate('userId', 'fullName email');
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    res.json({ success: true, deposit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveDeposit = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
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
    await deposit.save({ session });

    const wallet = await WalletModel.findOne({ userId: deposit.userId }).session(session);
    if (wallet) {
      wallet.balance += deposit.amount;
      wallet.equity = wallet.balance + wallet.pnl;
      wallet.freeMargin = wallet.equity - wallet.margin;
      await wallet.save({ session });

      await TransactionModel.create([{
        userId: deposit.userId,
        type: 'DEPOSIT',
        amount: deposit.amount,
        balanceAfter: wallet.balance,
        description: 'Deposit Approved by Admin'
      }], { session });
    }

    await AuditLogModel.create([{ adminId: (req as any).user.id, action: 'APPROVE_DEPOSIT', details: { depositId: id } }], { session });
    await NotificationModel.create([{ userId: deposit.userId, title: 'Deposit Approved', message: 'Your deposit has been approved.', type: 'SUCCESS' }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: 'Deposit approved successfully', deposit });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ success: false, error: error.message });
  }
};

export const rejectDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deposit = await DepositModel.findById(id);
    
    if (!deposit) return res.status(404).json({ success: false, error: 'Deposit not found' });
    
    if (deposit.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Deposit is already ${deposit.status}` });
    }
    
    deposit.status = 'REJECTED';
    await deposit.save();

    await AuditLogModel.create({ adminId: (req as any).user.id, action: 'REJECT_DEPOSIT', details: { depositId: id } });
    await NotificationModel.create({ userId: deposit.userId, title: 'Deposit Rejected', message: 'Your deposit has been rejected.', type: 'ERROR' });

    res.json({ success: true, message: 'Deposit rejected', deposit });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
