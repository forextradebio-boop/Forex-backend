import { Router } from 'express';
import { getPositions, getClosedPositions, createPosition, closePosition, getOrders, createOrder, cancelOrder, modifyOrder, modifyPosition, partialClosePosition } from '../controllers/tradingController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);

router.get('/positions', getPositions);
router.get('/closed-positions', getClosedPositions);
router.get('/positions/closed', getClosedPositions);
router.post('/positions', createPosition);
router.post('/positions/:id/close', closePosition);

router.get('/orders', getOrders);
router.post('/orders', createOrder);
router.post('/orders/:id/cancel', cancelOrder);
router.post('/orders/:id/modify', modifyOrder);

router.post('/positions/:id/modify', modifyPosition);
router.post('/positions/:id/partial-close', partialClosePosition);

export default router;
