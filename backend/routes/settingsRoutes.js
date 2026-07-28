import express from 'express';
import { getSsccVideoOrder, updateSsccVideoOrder } from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/sscc-video-order', authenticateToken, getSsccVideoOrder);
router.post('/sscc-video-order', authenticateToken, updateSsccVideoOrder);

export default router;
