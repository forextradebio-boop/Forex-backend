import { Router } from 'express';
import { getPaymentSettings, updatePaymentSettings, uploadQR, deleteQR } from '../controllers/paymentSettingsController';
import { protect, admin } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();
router.get('/', getPaymentSettings);
router.patch('/', protect, admin, updatePaymentSettings);
router.post('/upload-qr', protect, admin, upload.single('qrImage'), uploadQR);
router.delete('/qr', protect, admin, deleteQR);

export default router;
