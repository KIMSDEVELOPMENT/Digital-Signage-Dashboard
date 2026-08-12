import express from 'express';
import { getSsccVideoOrder, updateSsccVideoOrder } from './settings.controller.js';
import { authenticateToken } from '../../middleware/auth.js';

export const BASE_PATH = 'settings';

const router = express.Router();

router.get('/sscc-video-order', authenticateToken, getSsccVideoOrder);
router.post('/sscc-video-order', authenticateToken, updateSsccVideoOrder);

export default router;
