import express from 'express';
import { previewRoster, importRoster, getTodayRoster, downloadTemplate } from '../controllers/rosterController.js';
import { uploadExcel } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/template', authenticateToken, checkModulePermission('Duty Roster', 'read'), downloadTemplate);
router.post('/preview', authenticateToken, checkModulePermission('Duty Roster', 'read'), uploadExcel.single('file'), previewRoster);
router.post('/import', authenticateToken, checkModulePermission('Duty Roster', 'create'), importRoster);

// Today's roster - public for display screen (no auth needed)
router.get('/today', getTodayRoster);

export default router;
