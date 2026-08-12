import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { searchDoctors, saveSitting } from './doctorSettings.controller.js';

export const BASE_PATH = 'sittings';

const router = express.Router();

router.get('/search', authenticateToken, searchDoctors);
router.post('/', authenticateToken, saveSitting);

export default router;
