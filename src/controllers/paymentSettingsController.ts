import { Request, Response } from 'express';
import { PaymentSettingsModel } from '../models/PaymentSettings';

export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create({});
    }
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updatePaymentSettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    let settings = await PaymentSettingsModel.findOne();
    if (!settings) {
      settings = await PaymentSettingsModel.create(updates);
    } else {
      Object.assign(settings, updates);
      await settings.save();
    }
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
