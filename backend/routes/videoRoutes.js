import express from 'express';
import { uploadVideo as uploadVideoController, getVideos, deleteVideo } from '../controllers/videoController.js';
import { uploadVideo } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
// We don't have a specific 'Video' module in permissions yet, so we will just use authenticateToken
// and handle authorization in the controller based on their branch/location access.

const router = express.Router();

router.get('/', authenticateToken, getVideos);
router.post('/upload', authenticateToken, uploadVideo.single('video'), uploadVideoController);
router.delete('/:id', authenticateToken, deleteVideo);

export default router;
