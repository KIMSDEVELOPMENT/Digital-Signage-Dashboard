import express from 'express';
import { uploadVideo as uploadVideoController, getVideos, deleteVideo, updateVideo } from './video.controller.js';
import { uploadVideo } from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';

export const BASE_PATH = 'videos';

const router = express.Router();

router.get('/', authenticateToken, getVideos);
router.post('/upload', authenticateToken, uploadVideo.single('video'), uploadVideoController);
router.put('/:id', authenticateToken, uploadVideo.single('video'), updateVideo);
router.delete('/:id', authenticateToken, deleteVideo);

export default router;
