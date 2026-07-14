import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getTickers, 
  getTickerBySymbol, 
  getQuotes, 
  getChart,
  getForex,
  getCrypto,
  getStocks,
  getSearch,
  getQuote,
  getWatch,
  getSymbolDetail,
  getCrudeOil,
  getCrudeOilChart
} from '../controllers/market.controller';

const router = express.Router();

router.get('/tickers', getTickers);
router.get('/tickers/:symbol', getTickerBySymbol);
router.get('/watch', getWatch);
router.get('/symbol/:symbol', getSymbolDetail);
router.get('/quotes/:symbol', getQuotes);
router.get('/chart/:symbol', getChart);

// Market categories
router.get('/forex', getForex);
router.get('/crypto', getCrypto);
router.get('/stocks', getStocks);
router.get('/search', getSearch);
router.get('/quote', getQuote);

// Crude Oil
router.get('/crude-oil', getCrudeOil);
router.get('/crude-oil-chart', getCrudeOilChart);

export default router;
