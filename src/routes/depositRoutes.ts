import { Router } from 'express';
import { createDeposit, getDeposits } from '../controllers/depositController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.post('/', createDeposit);
router.get('/', getDeposits);

export default router;
