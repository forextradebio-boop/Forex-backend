import { Router } from 'express';
import { submitKyc, getKyc } from '../controllers/kycController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.post('/', submitKyc);
router.get('/', getKyc);

export default router;
