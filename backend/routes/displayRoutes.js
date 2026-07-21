import express from 'express';
import { getScreenPlaylist } from '../controllers/displayController.js';
import { sseStream } from '../utils/sse.js';

const router = express.Router();

router.get('/stream', sseStream);
router.get('/:branchSlug/:locationSlug', getScreenPlaylist);

export default router;
