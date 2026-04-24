// server/routes/admin/stores.ts — B2B store verification + moderation.
import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';

export function createStoresRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const status = String(req.query.status || '').trim();
      const q = String(req.query.q || '').trim();
      let sql = `
        SELECT s.*, u.name AS owner_name, u.email AS owner_email
        FROM stores s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1`;
      const params: any[] = [];
      if (status) { sql += ` AND s.verification_status = ?`; params.push(status); }
      if (q) { sql += ` AND (s.slug ILIKE ? OR u.name ILIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
      sql += ` ORDER BY s.created_at DESC LIMIT 200`;
      res.json((await db.all(sql, params)) ?? []);
    } catch (error) {
      console.error('[admin/stores] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  async function setStatus(id: number, status: string, adminId: number, req: any) {
    const before = await db.get(`SELECT verification_status FROM stores WHERE id = ?`, [id]);
    if (!before) return { ok: false, code: 404 };
    const verifyFields = status === 'verified' ? `, verified_at = NOW(), verified_by = ?` : '';
    const params = status === 'verified' ? [status, adminId, id] : [status, id];
    await db.run(
      `UPDATE stores SET verification_status = ?${verifyFields} WHERE id = ?`,
      params,
    );
    await AuditLogService.log({
      adminId, action: `store_${status}`, targetType: 'store',
      targetId: id, before, after: { verification_status: status }, req,
    });
    return { ok: true };
  }

  router.post('/:id/verify', async (req: any, res) => {
    const r = await setStatus(Number(req.params.id), 'verified', req.userId, req);
    if (!r.ok) return res.status(r.code!).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  router.post('/:id/suspend', async (req: any, res) => {
    const r = await setStatus(Number(req.params.id), 'suspended', req.userId, req);
    if (!r.ok) return res.status(r.code!).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  router.post('/:id/reject', async (req: any, res) => {
    const r = await setStatus(Number(req.params.id), 'rejected', req.userId, req);
    if (!r.ok) return res.status(r.code!).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  router.post('/:id/reactivate', async (req: any, res) => {
    const r = await setStatus(Number(req.params.id), 'verified', req.userId, req);
    if (!r.ok) return res.status(r.code!).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return router;
}
