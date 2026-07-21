import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../controllers/locationController.js';

const router = express.Router();

router.use(authenticateToken);

// Anyone authenticated can read locations
router.get('/', getLocations);

// Only super admin can create, update, delete
router.post('/', authorizeRoles('super_admin'), createLocation);
router.put('/:id', authorizeRoles('super_admin'), updateLocation);
router.delete('/:id', authorizeRoles('super_admin'), deleteLocation);

export default router;
