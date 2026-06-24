import { Request, Response } from 'express';
import { WalletModel } from '../models/Wallet';

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
