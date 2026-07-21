import fs from 'fs';
import path from 'path';
import { getVideoDurationInSeconds } from 'get-video-duration';
import videoRepository from '../repositories/VideoRepository.js';
import branchRepository from '../repositories/BranchRepository.js';
import locationRepository from '../repositories/LocationRepository.js';
import userRepository from '../repositories/UserRepository.js';
import { notifyUpdate } from '../utils/sse.js';

export async function uploadVideo(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No video file uploaded.' });
  }

  const { branch_id, location_id, title } = req.body;

  if (!branch_id || !location_id) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Branch and Location selections are required.' });
  }

  if (!title) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ message: 'Video title is required.' });
  }

  try {
    // 1. Check if branch and location exist
    const branch = await branchRepository.findById(branch_id);
    const location = await locationRepository.findById(location_id);
    if (!branch || !location) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Invalid branch or location.' });
    }

    // 2. Validate permissions
    if (req.user && req.user.role === 'normal_admin') {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, branch.name, location.name);
      if (!hasAccess) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'You do not have permission to upload videos for this block.' });
      }
    }

    // 3. Validate video duration
    let duration;
    try {
      duration = await getVideoDurationInSeconds(req.file.path);
    } catch (err) {
      console.error('Error getting video duration:', err);
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Failed to process video duration. Ensure it is a valid video file.' });
    }

    if (duration > 300) { // 300 seconds = 5 minutes
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Video duration exceeds the 5-minute maximum limit.' });
    }

    // 4. Save to database
    const filePath = `/uploads/videos/${req.file.filename}`;
    const result = await videoRepository.upsertVideo({
      branch_id,
      location_id,
      title,
      file_path: filePath,
      original_name: req.file.originalname,
      file_size: req.file.size,
      duration: duration,
      uploaded_by: req.user.id
    });

    // 5. Delete old video if replaced
    if (result.oldFilePath) {
      const oldPath = path.join(process.cwd(), result.oldFilePath);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    notifyUpdate();

    return res.status(201).json({ message: 'Video uploaded successfully.', id: result.id });
  } catch (error) {
    console.error('Upload video error:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function getVideos(req, res) {
  try {
    let videos = await videoRepository.findAll();

    // If normal admin, filter by their allowed locations
    if (req.user && req.user.role === 'normal_admin') {
      const allowedLocs = await userRepository.getUserLocations(req.user.id);
      // allowedLocs is array of { branch, location } names
      videos = videos.filter(v => {
        return allowedLocs.some(al => 
          al.branch.toLowerCase() === v.branch_name.toLowerCase() && 
          al.location.toLowerCase() === v.location_name.toLowerCase()
        );
      });
    }

    return res.status(200).json(videos);
  } catch (error) {
    console.error('Get videos error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

export async function deleteVideo(req, res) {
  const { id } = req.params;
  
  try {
    const video = await videoRepository.findById(id);
    if (!video) {
      return res.status(404).json({ message: 'Video not found.' });
    }

    // Check permissions
    if (req.user && req.user.role === 'normal_admin') {
      const hasAccess = await userRepository.hasLocationAccess(req.user.id, video.branch_name, video.location_name);
      if (!hasAccess) {
        return res.status(403).json({ message: 'You do not have permission to delete this video.' });
      }
    }

    // Delete file
    const filePath = path.join(process.cwd(), video.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete record
    await videoRepository.deleteById(id);

    notifyUpdate();

    return res.status(200).json({ message: 'Video deleted successfully.' });
  } catch (error) {
    console.error('Delete video error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
