import express from 'express';
import { getCurrentExchangeRate, updateExchangeRate, getExchangeRateHistory } from '../controllers/exchangeRateController';
import { protect, admin } from '../middleware/authMiddleware';

const router = express.Router();

// Public / User routes
router.get('/current', getCurrentExchangeRate);

// Admin routes
router.post('/', protect, admin, updateExchangeRate);
router.get('/history', protect, admin, getExchangeRateHistory);

export default router;
