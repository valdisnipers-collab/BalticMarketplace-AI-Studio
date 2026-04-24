// server/routes/admin/content.ts — homepage / banner / footer content CRUD.
// Public read endpoint is in server/routes/content.ts (mounted at /api/content).

import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';

export function createContentRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const rows = await db.all(
        `SELECT key, value, updated_by, updated_at FROM platform_content ORDER BY key`,
      );
      res.json(rows ?? []);
    } catch (error) {
      console.error('[admin/content] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/:key', async (req: any, res) => {
    try {
      const key = req.params.key;
      const value = req.body?.value;
      if (value === undefined) return res.status(400).json({ error: 'value required' });

      const before = await db.get<{ value: any }>(
        `SELECT value FROM platform_content WHERE key = ?`, [key],
      );
      await db.run(
        `INSERT INTO platform_content (key, value, updated_by, updated_at)
         VALUES (?, ?::jsonb, ?, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
        [key, JSON.stringify(value), req.userId],
      );

      await AuditLogService.log({
        adminId: req.userId, action: 'content_update',
        targetType: 'content', targetId: key,
        before: before?.value, after: value, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/content/:key] PUT', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
