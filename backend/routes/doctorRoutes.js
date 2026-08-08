import express from 'express';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor, downloadDoctorTemplate, uploadBulkDoctors, getDoctorsForShuffling } from '../controllers/doctorController.js';
import { uploadPhoto, uploadExcel } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

// Specific routes must come before parameterised / wildcard routes
router.get('/for-shuffling', authenticateToken, checkModulePermission('Duty Roster', 'read'), getDoctorsForShuffling);
router.get('/', authenticateToken, checkModulePermission('Doctor', 'read'), getDoctors);
router.get('/template', downloadDoctorTemplate);
router.post('/upload-bulk', authenticateToken, uploadExcel.single('file'), uploadBulkDoctors);
router.post('/', authenticateToken, checkModulePermission('Doctor', 'create'), uploadPhoto.single('photo'), createDoctor);
router.put('/:id', authenticateToken, checkModulePermission('Doctor', 'update'), uploadPhoto.single('photo'), updateDoctor);
router.delete('/:id', authenticateToken, checkModulePermission('Doctor', 'delete'), deleteDoctor);

export default router;
