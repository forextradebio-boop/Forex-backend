import { Router } from 'express';
import { getPositions, createPosition, closePosition, getOrders, createOrder, cancelOrder } from '../controllers/tradingController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

router.get('/positions', getPositions);
router.post('/positions', createPosition);
router.post('/positions/:id/close', closePosition);

router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.post('/orders/:id/cancel', cancelOrder);

export default router;
