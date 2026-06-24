import { Request, Response } from 'express';
import { AlertModel } from '../models/Alert';

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const alerts = await AlertModel.find({ userId, status: 'ACTIVE' });
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createAlert = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { symbol, condition, targetPrice } = req.body;
    
    // Check for duplicate active alerts
    const existingAlert = await AlertModel.findOne({ userId, symbol, condition, targetPrice, status: 'ACTIVE' });
    if (existingAlert) {
      return res.status(409).json({ error: 'An active alert with these exact conditions already exists.' });
    }

    const alert = await AlertModel.create({
      userId, symbol, condition, targetPrice, status: 'ACTIVE'
    });
    
    res.status(201).json(alert);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { symbol, condition, targetPrice } = req.body;
    
    const updated = await AlertModel.findOneAndUpdate(
      { _id: id, userId },
      { symbol, condition, targetPrice },
      { new: true }
    );
    
    if (!updated) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
export const deleteAlert = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    await AlertModel.findOneAndDelete({ _id: id, userId });
    res.json({ message: 'Alert deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
