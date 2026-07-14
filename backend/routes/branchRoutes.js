import express from 'express';
import { getBranches, getBranchById, createBranch, updateBranch, deleteBranch } from '../controllers/branchController.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkModulePermission } from '../middleware/permission.js';

const router = express.Router();

router.get('/', authenticateToken, getBranches);
router.get('/:id', authenticateToken, getBranchById);
router.post('/', authenticateToken, checkModulePermission('Branch', 'create'), createBranch);
router.put('/:id', authenticateToken, checkModulePermission('Branch', 'update'), updateBranch);
router.delete('/:id', authenticateToken, checkModulePermission('Branch', 'delete'), deleteBranch);

export default router;
