/**
 * modules/auth/auth.routes.js
 *
 * Re-exports auth routes using module-relative imports.
 * The original authRoutes.js is preserved and just re-pointed here.
 */
import express from 'express';
import { login, getMe, changePassword } from './auth.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const BASE_PATH = 'auth';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, changePassword);

export default router;
