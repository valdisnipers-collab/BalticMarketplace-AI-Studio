// server/routes/admin/audit.ts — audit log viewer.
import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';
import db from '../../pg';

export function createAuditRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const entries = await AuditLogService.listAuditEntries({
        adminId: req.query.admin_id ? Number(req.query.admin_id) : undefined,
        action: req.query.action ? String(req.query.action) : undefined,
        targetType: req.query.target_type ? String(req.query.target_type) : undefined,
        targetId: req.query.target_id ? String(req.query.target_id) : undefined,
        from: req.query.from ? String(req.query.from) : undefined,
        to: req.query.to ? String(req.query.to) : undefined,
        limit: Number(req.query.limit) || 50,
        offset: Number(req.query.offset) || 0,
      });
      // Attach admin names so the UI doesn't need a second round-trip.
      const adminIds = Array.from(new Set(entries.map(e => e.admin_id).filter(Boolean))) as number[];
      const admins = adminIds.length
        ? await db.all<{ id: number; name: string }>(
            `SELECT id, name FROM users WHERE id = ANY($1::bigint[])`,
            [adminIds],
          )
        : [];
      const nameMap = new Map((admins ?? []).map(a => [a.id, a.name]));
      res.json(entries.map(e => ({ ...e, admin_name: e.admin_id ? nameMap.get(e.admin_id) ?? null : null })));
    } catch (error) {
      console.error('[admin/audit] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/actions', async (_req, res) => {
    try {
      res.json(await AuditLogService.listDistinctActions());
    } catch (error) {
      console.error('[admin/audit/actions]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
