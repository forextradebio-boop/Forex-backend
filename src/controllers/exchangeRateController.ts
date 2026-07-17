import { Request, Response } from 'express';
import { ExchangeRateModel } from '../models/ExchangeRate';

// Initialize default rate if none exists
const initDefaultRate = async () => {
  const count = await ExchangeRateModel.countDocuments();
  if (count === 0) {
    await ExchangeRateModel.create({
      currentRate: 85.00,
      baseCurrency: 'USD',
      quoteCurrency: 'INR',
      provider: 'MANUAL',
      isActive: true
    });
  }
};
initDefaultRate();

export const getCurrentExchangeRate = async (req: Request, res: Response) => {
  try {
    const rate = await ExchangeRateModel.findOne({ isActive: true }).sort({ createdAt: -1 });
    if (!rate) {
      return res.json({ success: true, currentRate: 85.00 });
    }
    res.json({ success: true, rate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateExchangeRate = async (req: Request, res: Response) => {
  try {
    const { currentRate, provider } = req.body;
    const userId = (req as any).user.id; // Admin ID

    if (!currentRate || currentRate <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid exchange rate' });
    }

    // Deactivate all previous rates
    await ExchangeRateModel.updateMany({ isActive: true }, { $set: { isActive: false } });

    // Create new rate
    const newRate = await ExchangeRateModel.create({
      currentRate,
      baseCurrency: 'USD',
      quoteCurrency: 'INR',
      provider: provider || 'MANUAL',
      isActive: true,
      updatedBy: userId
    });

    res.json({ success: true, rate: newRate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getExchangeRateHistory = async (req: Request, res: Response) => {
  try {
    const history = await ExchangeRateModel.find()
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'fullName username email')
      .limit(50);
    res.json({ success: true, history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
