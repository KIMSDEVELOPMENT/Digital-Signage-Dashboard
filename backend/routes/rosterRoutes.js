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

// Manual UI routes
router.get('/date', authenticateToken, checkModulePermission('Duty Roster', 'read'), (req, res) => {
  // Can just reuse the controller but pass date from query
  import('../controllers/rosterController.js').then(c => c.getRosterByDate(req, res));
});

router.post('/manual', authenticateToken, checkModulePermission('Duty Roster', 'update'), (req, res) => {
  import('../controllers/rosterController.js').then(c => c.addManualRoster(req, res));
});

router.delete('/manual/:id', authenticateToken, checkModulePermission('Duty Roster', 'delete'), (req, res) => {
  import('../controllers/rosterController.js').then(c => c.deleteManualRoster(req, res));
});

export default router;
