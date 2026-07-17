import { Request, Response } from 'express';
import { PositionModel } from '../models/Position';
import { OrderModel } from '../models/Order';
import { WalletModel } from '../models/Wallet';
import { UserModel } from '../models/User';
import { SymbolModel } from '../models/Symbol';
import { MarketService } from '../services/market.service';
import { MarginEngine } from '../services/marginEngine';
import { TradeUtils } from '../services/tradeUtils';
import { TradingEngine } from '../engine/TradingEngine';
import { PriceService } from '../engine/PriceService';
import { SymbolSpecification } from '../engine/SymbolSpecification';
import { MarginCalculator } from '../engine/MarginCalculator';
import { ProfitCalculator } from '../engine/ProfitCalculator';
import { PositionManager } from '../engine/PositionManager';

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

    const parsedVolume = Number(volume);
    const parsedPrice = openPrice ? Number(openPrice) : 0;

    const user = await UserModel.findById(userId);
    if (!user || user.status !== 'ACTIVE') return res.status(403).json({ error: 'User not allowed to trade' });

    const currentOpenPositions = await PositionModel.find({ userId, status: 'OPEN' });
    let wallet = await WalletModel.findOne({ userId });
    if (!wallet) return res.status(402).json({ error: 'Insufficient funds: wallet not found' });
    if (wallet.status !== 'ACTIVE') return res.status(403).json({ error: 'Wallet is not active' });



    // 1. Calculate live wallet state to get accurate free margin
    const allPrices: Record<string, any> = {}; 
    const walletState = TradingEngine.evaluateWallet(wallet.balance, currentOpenPositions, allPrices);
    
    const spec = await SymbolSpecification.get(symbol);
    if (!spec || spec.status !== 'OPEN' || !spec.tradingEnabled) return res.status(400).json({ error: 'Trading is disabled or market closed for this symbol' });

    const quote = await MarketService.getQuote(symbol);
    if (!quote) return res.status(503).json({ error: 'Market data unavailable' });
    if (quote.marketStatus === 'CLOSED') return res.status(400).json({ error: 'Market closed' });

    // 2. Get Execution Price via MT5 rule (BUY at ASK, SELL at BID)
    let priceToUse = parsedPrice > 0 ? parsedPrice : PriceService.getExecutionPrice(symbol, type, spec.spread, spec.digits);

    if (!priceToUse || priceToUse <= 0) return res.status(400).json({ error: 'Invalid price' });

    // Calculate usdRate
    let usdRate = 1;
    const sym = spec.symbol.toUpperCase();
    if (!sym.endsWith('USD') && !sym.startsWith('USD')) {
      const quoteCurrency = sym.substring(3);
      if (quoteCurrency === 'JPY') {
        const crossQuote = await MarketService.getQuote('USDJPY');
        if (crossQuote && crossQuote.price > 0) usdRate = 1 / crossQuote.price;
      } else if (quoteCurrency === 'GBP') {
        const crossQuote = await MarketService.getQuote('GBPUSD');
        if (crossQuote && crossQuote.price > 0) usdRate = crossQuote.price;
      }
    } else if (sym.startsWith('USD') && sym !== 'USDUSD') {
      const currentMid = priceToUse;
      usdRate = currentMid > 0 ? 1 / currentMid : 1;
    }

    // 3. Pre-trade checks
    const marginRequired = MarginCalculator.calculate(symbol, parsedVolume, priceToUse, spec.leverageLimit || 100, usdRate);

    try {
      TradingEngine.validateOrder(
        symbol, type, parsedVolume, walletState.freeMargin, marginRequired, sl, tp, priceToUse, true
      );
    } catch (err: any) {
      return res.status(402).json({ error: err.message });
    }

    // 4. Execute Trade
    const position = await PositionModel.create({
      userId, symbol: spec.symbol, type, volume: parsedVolume, openPrice: priceToUse, currentPrice: priceToUse, sl, tp, status: 'OPEN', pnl: 0, marginUsed: marginRequired
    });

    // 5. Recalculate Margin
    const updatedPositions = await PositionModel.find({ userId, status: 'OPEN' });
    await MarginEngine.calculateMargin(userId, updatedPositions, {});

    res.status(201).json(position);
  } catch (error: any) {
    console.error(`Error in createPosition:`, error);
    res.status(500).json({ error: error.message });
  }
};

export const closePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const position = await PositionModel.findOne({ _id: id, userId, status: 'OPEN' });
    if (!position) return res.status(404).json({ error: 'Position not found or already closed' });
    


    const spec = await SymbolSpecification.get(position.symbol);

    let closePrice = req.body.closePrice;
    if (!closePrice) {
      // Closing a position executes an opposite order
      // BUY -> closed by SELL (at BID)
      // SELL -> closed by BUY (at ASK)
      closePrice = PriceService.getExecutionPrice(position.symbol, position.type === 'BUY' ? 'SELL' : 'BUY', spec.spread, spec.digits);
    }
    
    position.status = 'CLOSED';
    position.closePrice = closePrice;
    
    // We pass closePrice to both currentBid and currentAsk because it's a fixed execution price
    position.pnl = ProfitCalculator.calculate(
      position.type, 
      position.openPrice, 
      closePrice,
      closePrice,
      position.volume, 
      position.symbol
    );

    await position.save();

    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += position.pnl;
      wallet.equity = wallet.balance;
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

export const modifyOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { targetPrice, sl, tp } = req.body;
    
    const order = await OrderModel.findOne({ _id: id, userId, status: 'PENDING' });
    if (!order) return res.status(404).json({ error: 'Order not found or not pending' });
    
    if (targetPrice !== undefined) order.targetPrice = targetPrice;
    if (sl !== undefined) order.sl = sl;
    if (tp !== undefined) order.tp = tp;
    
    await order.save();
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const modifyPosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { sl, tp } = req.body;
    
    const position = await PositionModel.findOne({ _id: id, userId, status: 'OPEN' });
    if (!position) return res.status(404).json({ error: 'Position not found or already closed' });
    
    if (sl !== undefined) position.sl = sl;
    if (tp !== undefined) position.tp = tp;
    
    await position.save();
    res.json(position);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const partialClosePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { volume } = req.body;
    
    const closeVol = Number(volume);
    if (isNaN(closeVol) || closeVol <= 0) return res.status(400).json({ error: 'Invalid volume to close' });

    const position = await PositionModel.findOne({ _id: id, userId, status: 'OPEN' });
    if (!position) return res.status(404).json({ error: 'Position not found' });
    
    if (closeVol >= position.volume) {
      req.body.closePrice = undefined;
      return closePosition(req, res);
    }
    


    const spec = await SymbolSpecification.get(position.symbol);

    let closePrice = req.body.closePrice;
    if (!closePrice) {
      closePrice = PriceService.getExecutionPrice(position.symbol, position.type === 'BUY' ? 'SELL' : 'BUY', spec.spread, spec.digits);
    }
    
    const fullPnl = ProfitCalculator.calculate(
      position.type, 
      position.openPrice, 
      closePrice,
      closePrice,
      position.volume, 
      position.symbol
    );

    const { realizedPnl, remainingVolume } = PositionManager.calculatePartialClose(position, closeVol, fullPnl);

    await PositionModel.create({
      userId,
      symbol: position.symbol,
      type: position.type,
      volume: closeVol,
      openPrice: position.openPrice,
      currentPrice: closePrice,
      closePrice: closePrice,
      sl: position.sl,
      tp: position.tp,
      pnl: realizedPnl,
      commission: position.commission * (closeVol / position.volume),
      swap: position.swap * (closeVol / position.volume),
      marginUsed: 0,
      status: 'CLOSED'
    });

    position.volume = remainingVolume;
    position.commission -= position.commission * (closeVol / (position.volume + closeVol));
    position.swap -= position.swap * (closeVol / (position.volume + closeVol));
    await position.save();

    const wallet = await WalletModel.findOne({ userId });
    if (wallet) {
      wallet.balance += realizedPnl;
      wallet.equity = wallet.balance;
      await wallet.save();
      
      const openPositions = await PositionModel.find({ userId, status: 'OPEN' });
      await MarginEngine.calculateMargin(userId, openPositions, {});
    }
    
    res.json({ message: 'Position partially closed', remainingPosition: position });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
