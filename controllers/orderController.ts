import { Request, Response } from 'express';
import { OrderModel } from '../models/Order';

// @desc    Get all orders for the current user
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const orders = await OrderModel.find({ userId });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const order = await OrderModel.findOne({ _id: req.params.id, userId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { symbol, type, volume, price, targetPrice, status } = req.body;
    // Basic protection: ensure wallet exists and isn't frozen before creating immediate orders
    const { WalletModel } = await import('../models/Wallet');
    const wallet = await WalletModel.findOne({ userId });
    if (wallet && wallet.status === 'FROZEN') {
      return res.status(403).json({ error: 'Trading disabled: wallet frozen' });
    }

    const order = await OrderModel.create({
      userId,
      symbol,
      type,
      volume,
      price,
      targetPrice: targetPrice || price || 0,
      status: status || 'PENDING'
    });

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update an order
// @route   PATCH /api/orders/:id
// @access  Private
export const updateOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const order = await OrderModel.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }
    
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete an order
// @route   DELETE /api/orders/:id
// @access  Private
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const order = await OrderModel.findOneAndDelete({ _id: req.params.id, userId });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }
    
    res.json({ message: 'Order successfully deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
