import express from 'express';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor, getDoctorsForShuffling } from './doctor.controller.js';
import { downloadDoctorTemplate, uploadBulkDoctors } from './bulk-upload/bulkUpload.controller.js';
import { uploadPhoto, uploadExcel } from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';
import { checkModulePermission } from '../../middleware/permission.js';

export const BASE_PATH = 'doctors';

const router = express.Router();

// Specific routes before parameterised ones
router.get('/for-shuffling', authenticateToken, checkModulePermission('Duty Roster', 'read'), getDoctorsForShuffling);
router.get('/template', downloadDoctorTemplate);
router.post('/upload-bulk', authenticateToken, uploadExcel.single('file'), uploadBulkDoctors);

router.get('/', authenticateToken, checkModulePermission('Doctor', 'read'), getDoctors);
router.post('/', authenticateToken, checkModulePermission('Doctor', 'create'), uploadPhoto.single('photo'), createDoctor);
router.put('/:id', authenticateToken, checkModulePermission('Doctor', 'update'), uploadPhoto.single('photo'), updateDoctor);
router.delete('/:id', authenticateToken, checkModulePermission('Doctor', 'delete'), deleteDoctor);

export default router;
