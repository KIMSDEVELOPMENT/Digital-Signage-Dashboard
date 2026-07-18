import express from 'express';
import { getScreenPlaylist } from '../controllers/displayController.js';

const router = express.Router();

router.get('/:branchSlug/:locationSlug', getScreenPlaylist);

export default router;
