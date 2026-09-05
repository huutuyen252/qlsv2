import { Router, Request, Response } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login endpoint
 */
router.post('/login', authController.login);

/**
 * POST /api/auth/logout
 * Logout endpoint
 */
router.post('/logout', authController.logout);

/**
 * POST /api/auth/refresh
 * Refresh token endpoint
 */
router.post('/refresh', authController.refreshToken);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authController.getCurrentUser);

export default router;
