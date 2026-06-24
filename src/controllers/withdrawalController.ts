import { Request, Response } from 'express';
import { WithdrawalModel } from '../models/Withdrawal';
import { WalletModel } from '../models/Wallet';
import { AuditLogModel } from '../models/AuditLog';
import { TransactionModel } from '../models/Transaction';

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const wallet = await WalletModel.findOne({ userId });
    if (!wallet || amount > wallet.freeMargin) {
      return res.status(400).json({ error: 'Insufficient free margin' });
    }

    const withdrawal = await WithdrawalModel.create({
      userId,
      amount,
      bankDetails,
      status: 'PENDING'
    });

    // Reduce balance and equity immediately (locked funds)
    wallet.balance -= amount;
    wallet.equity -= amount;
    await wallet.save();

    await TransactionModel.create({
      userId,
      type: 'WITHDRAW',
      amount,
      status: 'PENDING',
      referenceId: withdrawal._id.toString(),
      description: `Withdrawal request of $${amount}`
    });

    await AuditLogModel.create({
      userId,
      action: 'WITHDRAWAL_REQUESTED',
      details: { amount, bankDetails }
    });

    res.json(withdrawal);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWithdrawals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const withdrawals = await WithdrawalModel.find({ userId });
    res.json(withdrawals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
