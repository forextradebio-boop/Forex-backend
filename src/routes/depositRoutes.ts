import { Router } from 'express';
import { createDeposit, getDeposits } from '../controllers/depositController';
import { protect } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();
router.use(protect);
router.post('/', upload.single('screenshot'), createDeposit);
router.get('/', getDeposits);
router.get('/history', getDeposits); // Map history as well for compatibility

export default router;
