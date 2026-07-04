import { Router } from 'express';
import {
    register,
    login,
    getProfile,
} from '../controllers/authController';

import { protect } from '../middleware/authMiddleware';

console.log('✅ authRoutes loaded');

const router = Router();

/**
 * TEST ROUTE
 */
router.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Auth route working'
    });
});

/**
 * AUTH ROUTES
 */
router.post('/register', register);
router.post('/login', login);

/**
 * PROFILE ROUTE
 */
router.get('/me', protect, getProfile);

export default router;