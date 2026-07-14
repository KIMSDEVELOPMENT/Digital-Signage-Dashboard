import express from 'express';
import { getDepartments, createDepartment, deleteDepartment } from '../controllers/departmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/', authenticateToken, checkModulePermission('Department', 'read'), getDepartments);
router.post('/', authenticateToken, checkModulePermission('Department', 'create'), createDepartment);
router.delete('/:id', authenticateToken, checkModulePermission('Department', 'delete'), deleteDepartment);

export default router;
