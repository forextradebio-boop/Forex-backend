import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrder, deleteOrder } from '../controllers/orderController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Apply JWT authentication to all order routes
router.use(protect);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id')
  .get(getOrderById)
  .patch(updateOrder)
  .delete(deleteOrder);

export default router;
