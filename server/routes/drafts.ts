import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';

export function createDraftsRouter() {
  const router = Router();

  router.get('/draft', requireAuth, async (req: any, res) => {
    try {
      const draft = await db.get(
        'SELECT * FROM listing_drafts WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
        [req.userId]
      ) as any;
      res.json(draft || null);
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/draft', requireAuth, async (req: any, res) => {
    try {
      const existing = await db.get(
        'SELECT id FROM listing_drafts WHERE user_id = $1',
        [req.userId]
      ) as any;

      if (existing) {
        await db.run(
          'UPDATE listing_drafts SET data = $1, updated_at = NOW() WHERE user_id = $2',
          [JSON.stringify(req.body), req.userId]
        );
      } else {
        await db.run(
          'INSERT INTO listing_drafts (user_id, data) VALUES ($1, $2)',
          [req.userId, JSON.stringify(req.body)]
        );
      }
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.delete('/draft', requireAuth, async (req: any, res) => {
    try {
      await db.run('DELETE FROM listing_drafts WHERE user_id = $1', [req.userId]);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
