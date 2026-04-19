import { Router } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import { upload, videoUpload } from '../utils/upload';
import { JWT_SECRET } from '../utils/auth';
import { uploadImage, uploadVideo, uploadChatImage } from '../services/cloudinary';
import jwt from 'jsonwebtoken';

export function createUploadsRouter(deps: {
  uploadLimiter: RateLimitRequestHandler;
}): Router {
  const { uploadLimiter } = deps;
  const router = Router();

  // POST /api/upload — single image upload to Cloudinary
  router.post('/', uploadLimiter, upload.single('image'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadImage(req.file.buffer, { folder: 'listings' });
      res.json({ url: result.url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // POST /api/upload/chat-image — chat image upload
  router.post('/chat-image', upload.single('image'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadChatImage(req.file.buffer);
      res.json({ url: result.url });
    } catch (error) {
      console.error('Chat upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // POST /api/upload/multiple — multiple images
  router.post('/multiple', upload.array('images', 10), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploads = await Promise.all(
        req.files.map(file => uploadImage(file.buffer, { folder: 'listings' }))
      );
      res.json({ urls: uploads.map(u => u.url) });
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // POST /api/upload/video — video upload
  router.post('/video', uploadLimiter, videoUpload.single('video'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadVideo(req.file.buffer, { folder: 'videos' });
      res.json({ videoUrl: result.url });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  return router;
}
