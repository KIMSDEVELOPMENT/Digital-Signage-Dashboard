import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { searchDoctors, saveSitting } from '../controllers/sittingController.js';

const router = express.Router();

router.get('/search', authenticateToken, searchDoctors);
router.post('/', authenticateToken, saveSitting);

export default router;
