import { Request, Response } from 'express';
import { DepositModel } from '../models/Deposit';
import { TransactionModel } from '../models/Transaction';

export const createDeposit = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, utr, screenshot } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }
    if (!utr) {
      return res.status(400).json({ error: 'UTR is required' });
    }

    const deposit = await DepositModel.create({
      userId,
      amount,
      utr,
      screenshot,
      status: 'PENDING'
    });
    
    await TransactionModel.create({
      userId,
      type: 'DEPOSIT',
      amount,
      status: 'PENDING',
      referenceId: deposit._id.toString(),
      description: `Deposit request of $${amount} via UTR ${utr}`
    });
    
    res.status(201).json(deposit);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getDeposits = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const deposits = await DepositModel.find({ userId }).sort({ createdAt: -1 });
    res.json(deposits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
