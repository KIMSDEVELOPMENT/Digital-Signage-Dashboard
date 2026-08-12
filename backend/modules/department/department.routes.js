import express from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getDepartmentDesignations, updateDepartmentDesignations, getDoctorsOrder, updateDoctorsOrder } from './department.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { checkModulePermission } from '../../middleware/permission.js';

export const BASE_PATH = 'departments';

const router = express.Router();

router.get('/', authenticateToken, getDepartments);
router.post('/', authenticateToken, checkModulePermission('Department', 'create'), createDepartment);
router.put('/:id', authenticateToken, checkModulePermission('Department', 'update'), updateDepartment);
router.delete('/:id', authenticateToken, checkModulePermission('Department', 'delete'), deleteDepartment);
router.get('/:id/designations', authenticateToken, getDepartmentDesignations);
router.put('/:id/designations', authenticateToken, updateDepartmentDesignations);
router.get('/:id/doctors-order', authenticateToken, getDoctorsOrder);
router.put('/:id/doctors-order', authenticateToken, updateDoctorsOrder);

export default router;
