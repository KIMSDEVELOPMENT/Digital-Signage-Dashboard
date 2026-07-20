import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import { 
  getLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation 
} from '../controllers/locationController.js';

const router = express.Router();

// Only super admin can manage locations
router.use(authenticateToken);
router.use(authorizeRoles('super_admin'));

router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;
