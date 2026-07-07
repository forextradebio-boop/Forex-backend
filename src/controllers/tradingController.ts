import { Request, Response } from 'express';
import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { WalletModel } from '../models/Wallet';
import { UserModel } from '../models/User';
import { SymbolModel } from '../models/Symbol';
import { MarketService } from '../services/market.service';
import { MarginEngine } from '../services/marginEngine';

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
    // 1. Basic validations
    const user = await UserModel.findById(userId);
    if (!user || user.status !== 'ACTIVE') return res.status(403).json({ error: 'User not allowed to trade' });

    const wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(402).json({ error: 'Insufficient funds: wallet not found' });
    if (wallet.status !== 'ACTIVE') return res.status(403).json({ error: 'Wallet is not active' });

    // 2. Symbol and market checks
    const sym = await SymbolModel.findOne({ symbol: symbol.toUpperCase() });
    if (!sym || !sym.isActive) { console.error('400: Inactive or invalid symbol'); return res.status(400).json({ error: 'Inactive or invalid symbol' }); }

    const quote = await MarketService.getQuote(symbol);
    if (!quote) { console.error('503: Market data unavailable'); return res.status(503).json({ error: 'Market data unavailable' }); }
    if (quote.marketStatus === 'CLOSED') { console.error('400: Market closed'); return res.status(400).json({ error: 'Market closed' }); }

    const priceToUse = openPrice && Number(openPrice) > 0 ? Number(openPrice) : quote.price;
    if (!priceToUse || priceToUse <= 0) { console.error('400: Invalid price'); return res.status(400).json({ error: 'Invalid price' }); }

    // 3. Validate lot size and volume
    if (!volume || Number(volume) <= 0) { console.error('400: Invalid lot size'); return res.status(400).json({ error: 'Invalid lot size' }); }

    // 4. Margin validations
    const marginCheck = await MarginEngine.validateMarginForTrade(userId, sym.symbol, priceToUse, Number(volume));
    if (!marginCheck.ok) {
      const reason = marginCheck.reason || 'INSUFFICIENT_MARGIN';
      const map: any = {
        INSUFFICIENT_BALANCE: 'Insufficient balance',
        INSUFFICIENT_FREE_MARGIN: 'Insufficient free margin',
        REQUIRED_EXCEEDS_BALANCE: 'Required margin exceeds balance',
        WALLET_NOT_FOUND: 'Wallet not found',
        WALLET_INACTIVE: 'Wallet inactive'
      };
      return res.status(402).json({ error: map[reason] || 'Insufficient margin' });
    }

    // 5. All validations passed — create position
    const position = await PositionModel.create({
      userId, symbol: sym.symbol, type, volume: Number(volume), openPrice: priceToUse, currentPrice: priceToUse, sl, tp, status: 'OPEN', pnl: 0
    });

    const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
    await MarginEngine.calculateMargin(userId, openPositions, {});

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
      
      const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
      await MarginEngine.calculateMargin(userId, openPositions, {});
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
    // If the order is intended for immediate execution, ensure wallet is enabled
    const wallet = await WalletModel.findOne({ userId });
    if (wallet && wallet.status === 'FROZEN') {
      return res.status(403).json({ error: 'Trading disabled: wallet frozen' });
    }

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
