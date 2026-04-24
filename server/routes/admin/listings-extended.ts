// server/routes/admin/listings-extended.ts
// Bulk actions + status lifecycle. Legacy /admin/listings (GET + approve +
// DELETE) stays in routes/admin.ts.

import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';

const ALLOWED_STATUSES = new Set(['active','paused','rejected','sold','archived','deleted']);

export function createListingsExtendedRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const status = String(req.query.status || '').trim();
      const modStatus = String(req.query.moderation_status || '').trim();
      const reportedOnly = req.query.reported_only === 'true';
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      let sql = `SELECT l.*, u.name AS author_name FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1`;
      const params: any[] = [];
      if (q) { sql += ` AND (l.title ILIKE ? OR CAST(l.id AS TEXT) = ?)`; params.push(`%${q}%`, q); }
      if (status) { sql += ` AND l.status = ?`; params.push(status); }
      if (modStatus) { sql += ` AND l.ai_moderation_status = ?`; params.push(modStatus); }
      if (reportedOnly) {
        sql += ` AND EXISTS (SELECT 1 FROM reports r WHERE r.listing_id = l.id AND r.status = 'pending')`;
      }
      sql += ` ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      res.json((await db.all(sql, params)) ?? []);
    } catch (error) {
      console.error('[admin/listings/search]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/status', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '').trim();
      if (!ALLOWED_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status' });

      const before = await db.get(`SELECT status FROM listings WHERE id = ?`, [id]);
      if (!before) return res.status(404).json({ error: 'Not found' });
      await db.run(`UPDATE listings SET status = ? WHERE id = ?`, [status, id]);
      await AuditLogService.log({
        adminId: req.userId, action: 'listing_status_change',
        targetType: 'listing', targetId: id, before, after: { status }, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/listings/:id/status]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/highlight', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      await db.run(`UPDATE listings SET is_highlighted = 1 WHERE id = ?`, [id]);
      await AuditLogService.log({ adminId: req.userId, action: 'listing_highlight', targetType: 'listing', targetId: id, req });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/listings/:id/highlight]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/unhighlight', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      await db.run(`UPDATE listings SET is_highlighted = 0 WHERE id = ?`, [id]);
      await AuditLogService.log({ adminId: req.userId, action: 'listing_unhighlight', targetType: 'listing', targetId: id, req });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/listings/:id/unhighlight]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/bulk', async (req: any, res) => {
    try {
      const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
      const action = String(req.body?.action || '').trim();
      if (ids.length === 0) return res.status(400).json({ error: 'No ids' });
      if (ids.length > 500) return res.status(400).json({ error: 'Too many ids (max 500)' });

      let targetStatus: string;
      if (action === 'archive') targetStatus = 'archived';
      else if (action === 'delete') targetStatus = 'deleted';
      else if (action === 'unpublish' || action === 'pause') targetStatus = 'paused';
      else return res.status(400).json({ error: 'Invalid action' });

      const placeholders = ids.map(() => '?').join(', ');
      await db.run(`UPDATE listings SET status = ? WHERE id IN (${placeholders})`, [targetStatus, ...ids]);

      await AuditLogService.log({
        adminId: req.userId, action: `listing_bulk_${action}`, targetType: 'listing_batch',
        targetId: ids.length, after: { ids, targetStatus }, req,
      });
      res.json({ ok: true, count: ids.length });
    } catch (error) {
      console.error('[admin/listings/bulk]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
