import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';
import { vapidPublicKey } from '../services/push';

export function createPushRouter() {
  const router = Router();

  router.get('/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  router.post('/subscribe', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }
      await db.run(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [userId, endpoint, keys.p256dh, keys.auth]
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/unsubscribe', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { endpoint } = req.body;
      await db.run(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
        [userId, endpoint]
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
