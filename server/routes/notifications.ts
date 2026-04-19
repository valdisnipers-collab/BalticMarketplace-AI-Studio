import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';

export function createNotificationsRouter() {
  const router = Router();

  router.get('/', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/read-all', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [decoded.userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/:id/read', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
