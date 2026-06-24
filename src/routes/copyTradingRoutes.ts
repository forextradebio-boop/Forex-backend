import express from 'express';
import { becomeProvider, followProvider, getProviders } from '../controllers/copyTradingController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/providers', getProviders);
router.use(protect);
router.post('/become-provider', becomeProvider);
router.post('/follow', followProvider);

export default router;
