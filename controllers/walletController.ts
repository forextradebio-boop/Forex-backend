import { Request, Response } from 'express';
import { WalletModel } from '../models/Wallet';
import { TransactionModel } from '../models/Transaction';
import { SocketServer } from '../services/socketServer';

export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let wallet = await WalletModel.findOne({ userId });
    
    if (!wallet) {
      wallet = await WalletModel.create({ userId });
    }
    
    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const fundWallet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) {
      wallet = await WalletModel.create({ userId, balance: amount, freeMargin: amount, equity: amount });
    } else {
      wallet.balance += amount;
      wallet.freeMargin += amount;
      wallet.equity += amount;
      await wallet.save();
    }
    
    await TransactionModel.create({
      userId,
      type: 'DEPOSIT',
      amount,
      balanceAfter: wallet.balance,
      status: 'APPROVED',
      description: 'Instant Funding (Testing)'
    });
    
    SocketServer.broadcastTransactionUpdate(userId.toString());
    
    res.json(wallet);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
