import { Request, Response } from 'express';
import { WatchlistModel } from '../models/Watchlist';

export const getWatchlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let watchlist = await WatchlistModel.findOne({ userId });
    
    if (!watchlist) {
      watchlist = await WatchlistModel.create({ userId, symbols: ['EURUSD', 'GBPUSD', 'BTCUSD', 'XAUUSD'] });
    }
    res.json(watchlist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateWatchlist = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { symbols } = req.body;
    
    let watchlist = await WatchlistModel.findOne({ userId });
    if (!watchlist) {
      watchlist = new WatchlistModel({ userId, symbols });
    } else {
      watchlist.symbols = symbols;
    }
    await watchlist.save();
    res.json(watchlist);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
