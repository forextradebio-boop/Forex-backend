import { Router } from 'express';
import { getAlerts, createAlert, updateAlert, deleteAlert } from '../controllers/alertController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getAlerts);
router.post('/', createAlert);
router.patch('/:id', updateAlert);
router.delete('/:id', deleteAlert);

export default router;
