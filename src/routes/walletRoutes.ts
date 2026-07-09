import { Router } from 'express';
import { getWallet, fundWallet } from '../controllers/walletController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getWallet);
router.post('/fund', fundWallet);

export default router;
