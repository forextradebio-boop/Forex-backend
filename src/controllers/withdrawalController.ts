import { Request, Response } from 'express';
import { WithdrawalModel } from '../models/Withdrawal';
import { WalletModel } from '../models/Wallet';
import { AuditLogModel } from '../models/AuditLog';
import { TransactionModel } from '../models/Transaction';
import { KycModel } from '../models/Kyc';

export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, currency = 'USD', bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    const wallet = await WalletModel.findOne({ userId });
    if (!wallet || amount > wallet.freeMargin) {
      return res.status(400).json({ error: 'Insufficient free margin' });
    }

    let payoutDetails = bankDetails;
    if (!payoutDetails || Object.keys(payoutDetails).length === 0) {
      const kyc = await KycModel.findOne({ userId });
      if (!kyc || !kyc.accountNumber || !kyc.ifscCode || !kyc.bankName || !kyc.accountHolderName) {
        return res.status(400).json({ error: 'Saved bank payout details are unavailable. Complete KYC first.' });
      }
      payoutDetails = {
        accountHolderName: kyc.accountHolderName,
        bankName: kyc.bankName,
        accountNumber: kyc.accountNumber,
        ifscCode: kyc.ifscCode,
      };
    }

    const withdrawal = await WithdrawalModel.create({
      userId,
      amount,
      currency,
      bankDetails: payoutDetails,
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
      description: `Withdrawal request of ${amount} ${currency}`
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
