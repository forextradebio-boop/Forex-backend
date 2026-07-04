import { Router } from 'express';
import { getWallet } from '../controllers/walletController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getWallet);

export default router;
