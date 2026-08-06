import express from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getDepartmentDesignations, updateDepartmentDesignations, getDoctorsOrder, updateDoctorsOrder } from '../controllers/departmentController.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/', authenticateToken, getDepartments);
router.post('/', authenticateToken, checkModulePermission('Department', 'create'), createDepartment);
router.put('/:id', authenticateToken, checkModulePermission('Department', 'update'), updateDepartment);
router.delete('/:id', authenticateToken, checkModulePermission('Department', 'delete'), deleteDepartment);

// Designation sorting routes
router.get('/:id/designations', authenticateToken, getDepartmentDesignations);
router.put('/:id/designations', authenticateToken, updateDepartmentDesignations);

// Doctor priority ordering routes
router.get('/:id/doctors-order', authenticateToken, getDoctorsOrder);
router.put('/:id/doctors-order', authenticateToken, updateDoctorsOrder);

export default router;
