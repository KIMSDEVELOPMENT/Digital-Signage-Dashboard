import express from 'express';
import { getDoctors, createDoctor, updateDoctor, deleteDoctor, downloadDoctorTemplate, uploadBulkDoctors } from '../controllers/doctorController.js';
import { uploadPhoto } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/', authenticateToken, checkModulePermission('Doctor', 'read'), getDoctors);
router.get('/template', downloadDoctorTemplate);
router.post('/upload-bulk', authenticateToken, uploadPhoto.single('file'), uploadBulkDoctors);
router.post('/', authenticateToken, checkModulePermission('Doctor', 'create'), uploadPhoto.single('photo'), createDoctor);
router.put('/:id', authenticateToken, checkModulePermission('Doctor', 'update'), uploadPhoto.single('photo'), updateDoctor);
router.delete('/:id', authenticateToken, checkModulePermission('Doctor', 'delete'), deleteDoctor);

export default router;
