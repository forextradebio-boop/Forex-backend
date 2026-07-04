import { Router } from 'express';
import { getPaymentSettings, updatePaymentSettings } from '../controllers/paymentSettingsController';
import { protect, admin } from '../middleware/authMiddleware';

const router = Router();
router.get('/', getPaymentSettings);
router.patch('/', protect, admin, updatePaymentSettings);

export default router;
