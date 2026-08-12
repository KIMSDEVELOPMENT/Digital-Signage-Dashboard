import express from 'express';
import { getBranches, getBranchById, createBranch, updateBranch, deleteBranch, getBranchDesignationsMaster, updateBranchDesignationsMaster, getAllDesignationsMaster } from './branch.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { checkModulePermission } from '../../middleware/permission.js';

export const BASE_PATH = 'branches';

const router = express.Router();

router.get('/', authenticateToken, getBranches);
router.get('/all-designations', authenticateToken, getAllDesignationsMaster);
router.get('/:id', authenticateToken, getBranchById);
router.get('/:id/designation-master', authenticateToken, getBranchDesignationsMaster);
router.put('/:id/designation-master', authenticateToken, checkModulePermission('Branch', 'update'), updateBranchDesignationsMaster);
router.post('/', authenticateToken, checkModulePermission('Branch', 'create'), createBranch);
router.put('/:id', authenticateToken, checkModulePermission('Branch', 'update'), updateBranch);
router.delete('/:id', authenticateToken, checkModulePermission('Branch', 'delete'), deleteBranch);

export default router;
