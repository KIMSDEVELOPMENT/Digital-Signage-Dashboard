import express from 'express';
import { getLocations, getLocationById, createLocation, updateLocation, deleteLocation } from '../controllers/locationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/', authenticateToken, getLocations);
router.get('/:id', authenticateToken, getLocationById);
router.post('/', authenticateToken, checkModulePermission('Branch', 'create'), createLocation); // Linked to Branch permission
router.put('/:id', authenticateToken, checkModulePermission('Branch', 'update'), updateLocation);
router.delete('/:id', authenticateToken, checkModulePermission('Branch', 'delete'), deleteLocation);

export default router;
