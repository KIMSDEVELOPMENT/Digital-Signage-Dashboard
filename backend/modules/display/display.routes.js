import express from 'express';
import { getScreenPlaylist } from './display.controller.js';
import { sseStream } from '../../utils/sse.js';

export const BASE_PATH = 'display';

const router = express.Router();

router.get('/stream', sseStream);
router.get('/:branchSlug/:locationSlug', getScreenPlaylist);

export default router;
