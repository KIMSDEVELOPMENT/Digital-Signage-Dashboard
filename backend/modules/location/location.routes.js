import express from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/auth.js';
import { getLocations, createLocation, updateLocation, deleteLocation } from './location.controller.js';

export const BASE_PATH = 'locations';

const router = express.Router();

router.use(authenticateToken);
router.get('/', getLocations);
router.post('/', authorizeRoles('super_admin'), createLocation);
router.put('/:id', authorizeRoles('super_admin'), updateLocation);
router.delete('/:id', authorizeRoles('super_admin'), deleteLocation);

export default router;
