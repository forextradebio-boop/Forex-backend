import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, database: 'connected' });
});

export default router;
