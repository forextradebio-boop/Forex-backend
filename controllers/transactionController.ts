import { Request, Response } from 'express';
import { TransactionModel } from '../models/Transaction';

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const transactions = await TransactionModel.find({ userId }).sort({ createdAt: -1 });
    
    // Map to required format
    const formatted = transactions.map(t => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      status: t.status,
      description: t.description || '',
      createdAt: t.createdAt
    }));
    
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
