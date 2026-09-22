import { Request, Response } from 'express';
import { CopyTraderModel } from '../models/CopyTrader';
import { UserModel } from '../models/User';
import { NotificationModel } from '../models/Notification';

export const becomeProvider = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    // Assuming User model has a flag for isSignalProvider
    await UserModel.findByIdAndUpdate(userId, { isSignalProvider: true });
    res.json({ success: true, message: 'You are now a signal provider' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const followProvider = async (req: Request, res: Response) => {
  try {
    const followerId = (req as any).user.id;
    const { providerId, allocationRatio } = req.body;

    const copyTrader = await CopyTraderModel.create({
      providerId,
      followerId,
      allocationRatio,
      status: 'ACTIVE'
    });

    await NotificationModel.create({
      userId: providerId,
      title: 'New Follower',
      message: 'A new user has started copying your trades.',
      type: 'INFO'
    });

    res.json(copyTrader);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProviders = async (req: Request, res: Response) => {
  try {
    const providers = await UserModel.find({ isSignalProvider: true }).select('fullName email');
    res.json(providers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
