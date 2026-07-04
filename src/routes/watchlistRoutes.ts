import { Router } from 'express';
import { getWatchlist, updateWatchlist } from '../controllers/watchlistController';
import { protect } from '../middleware/authMiddleware';

const router = Router();
router.use(protect);
router.get('/', getWatchlist);
router.put('/', updateWatchlist);

export default router;
