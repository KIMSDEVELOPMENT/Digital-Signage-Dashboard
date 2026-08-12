import express from 'express';
import { previewRoster, importRoster, getTodayRoster, downloadTemplate, getRosterByDate, addManualRoster, updateManualRoster, deleteManualRoster } from './roster.controller.js';
import { uploadExcel } from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';
import { checkModulePermission } from '../../middleware/permission.js';

export const BASE_PATH = 'roster';

const router = express.Router();

router.get('/template', authenticateToken, checkModulePermission('Duty Roster', 'read'), downloadTemplate);
router.post('/preview', authenticateToken, checkModulePermission('Duty Roster', 'read'), uploadExcel.single('file'), previewRoster);
router.post('/import', authenticateToken, checkModulePermission('Duty Roster', 'create'), importRoster);

// Public — for display screen (no auth)
router.get('/today', getTodayRoster);

// Manual UI routes
router.get('/date', authenticateToken, checkModulePermission('Duty Roster', 'read'), getRosterByDate);
router.post('/manual', authenticateToken, checkModulePermission('Duty Roster', 'create'), addManualRoster);
router.put('/manual/:id', authenticateToken, checkModulePermission('Duty Roster', 'update'), updateManualRoster);
router.delete('/manual/:id', authenticateToken, checkModulePermission('Duty Roster', 'delete'), deleteManualRoster);

export default router;
