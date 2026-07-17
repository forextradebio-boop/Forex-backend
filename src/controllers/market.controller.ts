import { Request, Response } from 'express';
import { MarketService } from '../services/market.service';
import { SymbolMapper } from '../providers/symbolMapper';

export const getTickers = async (req: Request, res: Response) => {
  try {
    const symbols = await MarketService.getWatchSymbols();
    const quotes = await MarketService.getQuotes(symbols);
    res.json(Object.values(quotes));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTickerBySymbol = async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getWatch = async (req: Request, res: Response) => {
  try {
    const quotes = await MarketService.getWatchQuotes();
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSymbolDetail = async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }

    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: `Symbol ${symbol} not found` });
    }

    res.json({
      ...quote,
      displaySymbol: SymbolMapper.getDisplaySymbol(symbol),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getQuotes = async (req: Request, res: Response) => {
  try {
    const symbolParam = req.params.symbol || (req.query.symbols as string);
    const symbols = (symbolParam?.split(',').filter(Boolean) || ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURJPY', 'EURGBP', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD']);
    const quotes = await MarketService.getQuotes(symbols);
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getChart = async (req: Request, res: Response) => {
  try {
    const symbol = req.params.symbol;
    const interval = (req.query.interval as string) || 'D1';
    const chart = await MarketService.getHistoricalCandles(symbol, interval);
    res.json(chart);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getMovers = async (req: Request, res: Response) => {
  try {
    const exchange = (req.query.exchange as string) || 'US';
    const name = (req.query.name as string) || 'volume_gainers';
    const locale = (req.query.locale as string) || 'en';

    const movers = await MarketService.getMovers({ exchange, name, locale });
    res.json(movers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getForex = async (req: Request, res: Response) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory('FOREX');
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCrypto = async (req: Request, res: Response) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory('CRYPTO');
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getStocks = async (req: Request, res: Response) => {
  try {
    const quotes = await MarketService.getSymbolsByCategory('INDICES');
    res.json(quotes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSearch = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const results = await MarketService.searchSymbols(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getQuote = async (req: Request, res: Response) => {
  try {
    const symbol = req.query.symbol as string;
    if (!symbol) {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    const quote = await MarketService.getQuote(symbol);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCrudeOil = async (req: Request, res: Response) => {
  try {
    // Fetch crude oil data - CL=F is the Crude Oil (WTI) symbol
    const quote = await MarketService.getQuote('CL=F');
    if (!quote) {
      return res.status(404).json({ error: 'Crude oil data not found' });
    }
    res.json(quote);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getCrudeOilChart = async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string) || 'CL=F';
    const interval = (req.query.interval as string) || '1d';
    const range = (req.query.range as string) || 'ytd';
    
    // Fetch directly from Yahoo Finance to avoid RapidAPI rate limits/errors
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Yahoo Finance API returned ${response.status}` 
      });
    }

    const data = await response.json();
    // The frontend expects the response to be wrapped in { status, data }
    res.json({ status: 200, data: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
