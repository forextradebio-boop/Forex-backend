import { Request, Response } from 'express';
import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { WalletModel } from '../models/Wallet';

export const getPositions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const positions = await PositionModel.find({ userId, status: 'OPEN' });
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getClosedPositions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const closedPositions = await PositionModel.find({ userId, status: 'CLOSED' }).sort({ updatedAt: -1 });
    const history = closedPositions.map((position) => ({
      ...position.toObject(),
      id: position._id.toString(),
    }));
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createPosition = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { symbol, type, volume, openPrice, sl, tp } = req.body;
    
    const position = await PositionModel.create({
      userId, symbol, type, volume, openPrice, currentPrice: openPrice, sl, tp, status: 'OPEN', pnl: 0
    });
    
    res.status(201).json(position);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const closePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const position = await PositionModel.findOne({ _id: id, userId });
    if (!position) return res.status(404).json({ error: 'Position not found' });
    
    position.status = 'CLOSED';
    position.closePrice = req.body.closePrice || position.currentPrice;
    await position.save();

    // update wallet pnl
    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.pnl -= position.pnl;
      wallet.equity = wallet.balance + wallet.pnl;
      await wallet.save();
    }
    
    res.json(position);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orders = await OrderModel.find({ userId, status: 'PENDING' });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { symbol, type, volume, targetPrice, sl, tp } = req.body;
    
    const order = await OrderModel.create({
      userId, symbol, type, volume, targetPrice, sl, tp, status: 'PENDING'
    });
    
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const order = await OrderModel.findOne({ _id: id, userId });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    order.status = 'CANCELLED';
    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
