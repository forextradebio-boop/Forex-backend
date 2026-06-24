import { Request, Response } from 'express';
import { MarketDataService } from '../services/marketDataService';

export const getTickers = async (req: Request, res: Response) => {
  try {
    const tickers = await MarketDataService.getTickers();
    res.json(tickers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTickerBySymbol = async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    const ticker = await MarketDataService.getTicker(symbol);
    if (!ticker) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    res.json(ticker);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTopGainers = async (req: Request, res: Response) => {
  try {
    const gainers = await MarketDataService.getTopGainers();
    res.json(gainers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTopLosers = async (req: Request, res: Response) => {
  try {
    const losers = await MarketDataService.getTopLosers();
    res.json(losers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getForex = async (req: Request, res: Response) => {
  try {
    const forex = await MarketDataService.getByCategory('FOREX');
    res.json(forex);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCrypto = async (req: Request, res: Response) => {
  try {
    const crypto = await MarketDataService.getByCategory('CRYPTO');
    res.json(crypto);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMetals = async (req: Request, res: Response) => {
  try {
    const metals = await MarketDataService.getByCategory('METALS');
    res.json(metals);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// Legacy Endpoints
export const getQuotes = async (req: Request, res: Response) => {
  try {
    const symbolParam = req.params.symbol || (req.query.symbols as string);
    const symbols = symbolParam?.split(',') || ['BTCUSD', 'ETHUSD', 'AAPL', 'TSLA'];
    const quotes = await MarketDataService.getQuotes(symbols);
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSymbols = async (req: Request, res: Response) => {
  res.json({
    symbols: [
      { symbol: 'BTCUSD', name: 'Bitcoin', category: 'CRYPTO' },
      { symbol: 'ETHUSD', name: 'Ethereum', category: 'CRYPTO' },
      { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCKS' },
      { symbol: 'TSLA', name: 'Tesla', category: 'STOCKS' },
      { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'FOREX' },
    ]
  });
};

export const getChart = async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    const chart = await MarketDataService.getChart(symbol);
    res.json(chart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
