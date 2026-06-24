import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getTickers, 
  getTickerBySymbol, 
  getQuotes, 
  getTopGainers, 
  getTopLosers, 
  getForex, 
  getCrypto, 
  getMetals,
  getSymbols, 
  getChart 
} from '../controllers/marketController';

const router = express.Router();

// Required Endpoints (JWT Protected as per requirements)
router.get('/tickers', protect, getTickers);
router.get('/tickers/:symbol', protect, getTickerBySymbol);
router.get('/quotes/:symbol', protect, getQuotes);
router.get('/top-gainers', protect, getTopGainers);
router.get('/top-losers', protect, getTopLosers);
router.get('/forex', protect, getForex);
router.get('/crypto', protect, getCrypto);
router.get('/metals', protect, getMetals);

// Legacy/Existing endpoints (Optional protection depending on usage context)
router.get('/symbols', getSymbols);
router.get('/chart/:symbol', getChart);

export default router;
