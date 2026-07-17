import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { 
  getTickers, 
  getTickerBySymbol, 
  getQuotes, 
  getChart,
  getMovers,
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
router.get('/platform-status', async (req, res) => {
  try {
    const { MarketSettingsModel } = await import('../models/MarketSettings');
    let settings = await MarketSettingsModel.findOne();
    if (!settings) {
      settings = await MarketSettingsModel.create({});
    }
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.get('/tickers/:symbol', getTickerBySymbol);
router.get('/watch', getWatch);
router.get('/symbol/:symbol', getSymbolDetail);
router.get('/quotes/:symbol', getQuotes);
router.get('/chart/:symbol', getChart);
router.get('/get-movers', getMovers);

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
