import express from 'express';
import { getAdmins, createAdmin, deleteAdmin, resetPassword, getAdminPermissions, updateAdminPermissions } from './admin.controller.js';
import { getSsccVideoOrder, updateSsccVideoOrder } from './settings.controller.js';
import { authenticateToken, authorizeRoles } from '../../middleware/auth.js';

export const BASE_PATH = 'admins';

const router = express.Router();

// Admin management (super_admin only)
router.get('/', authenticateToken, authorizeRoles('super_admin'), getAdmins);
router.post('/', authenticateToken, authorizeRoles('super_admin'), createAdmin);
router.delete('/:id', authenticateToken, authorizeRoles('super_admin'), deleteAdmin);
router.post('/:id/reset-password', authenticateToken, authorizeRoles('super_admin'), resetPassword);
router.get('/:id/permissions', authenticateToken, authorizeRoles('super_admin'), getAdminPermissions);
router.put('/:id/permissions', authenticateToken, authorizeRoles('super_admin'), updateAdminPermissions);

export default router;
