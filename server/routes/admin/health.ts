// server/routes/admin/health.ts — admin-only system health snapshot.
import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import { collectHealth } from '../../utils/health';
import * as SystemEventLogger from '../../services/SystemEventLogger';

export function createHealthRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      res.json(await collectHealth());
    } catch (error) {
      console.error('[admin/health] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/events', async (req, res) => {
    try {
      const level = req.query.level ? (String(req.query.level) as any) : undefined;
      const limit = Number(req.query.limit) || 100;
      res.json(await SystemEventLogger.listRecent({ level, limit }));
    } catch (error) {
      console.error('[admin/health/events]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
