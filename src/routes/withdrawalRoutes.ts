import express from 'express';
import { requestWithdrawal, getWithdrawals } from '../controllers/withdrawalController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.post('/', requestWithdrawal);
router.get('/', getWithdrawals);

export default router;
