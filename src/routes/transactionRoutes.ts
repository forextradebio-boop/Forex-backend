import { Router } from 'express';
import { getTransactions } from '../controllers/transactionController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/', protect, getTransactions);

export default router;
