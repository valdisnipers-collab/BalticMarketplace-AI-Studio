// server/routes/admin/orders.ts — admin-side orders view.
import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';

export function createOrdersRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const status = String(req.query.status || '').trim();
      const buyerId = Number(req.query.buyer_id) || null;
      const sellerId = Number(req.query.seller_id) || null;
      const q = String(req.query.q || '').trim();
      const manualOnly = req.query.manual_review_only === 'true';
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      let sql = `
        SELECT o.*, l.title AS listing_title,
               b.name AS buyer_name, s.name AS seller_name
        FROM orders o
        LEFT JOIN listings l ON o.listing_id = l.id
        LEFT JOIN users b ON o.buyer_id = b.id
        LEFT JOIN users s ON o.seller_id = s.id
        WHERE 1=1`;
      const params: any[] = [];
      if (status) { sql += ` AND o.status = ?`; params.push(status); }
      if (buyerId) { sql += ` AND o.buyer_id = ?`; params.push(buyerId); }
      if (sellerId) { sql += ` AND o.seller_id = ?`; params.push(sellerId); }
      if (manualOnly) sql += ` AND o.manual_review = true`;
      if (q) {
        sql += ` AND (l.title ILIKE ? OR CAST(o.id AS TEXT) = ?)`;
        params.push(`%${q}%`, q);
      }
      sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      res.json((await db.all(sql, params)) ?? []);
    } catch (error) {
      console.error('[admin/orders] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const order = await db.get(
        `SELECT o.*, l.title AS listing_title, l.image_url,
                b.name AS buyer_name, b.email AS buyer_email,
                s.name AS seller_name, s.email AS seller_email
         FROM orders o
         LEFT JOIN listings l ON o.listing_id = l.id
         LEFT JOIN users b ON o.buyer_id = b.id
         LEFT JOIN users s ON o.seller_id = s.id
         WHERE o.id = ?`,
        [id],
      );
      if (!order) return res.status(404).json({ error: 'Not found' });
      const disputes = await db.all(`SELECT * FROM disputes WHERE order_id = ? ORDER BY created_at DESC`, [id]);
      res.json({ ...order, disputes });
    } catch (error) {
      console.error('[admin/orders/:id]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/manual-review', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const flag = req.body?.enabled !== false;
      await db.run(`UPDATE orders SET manual_review = ? WHERE id = ?`, [flag, id]);
      await AuditLogService.log({
        adminId: req.userId, action: 'order_manual_review_toggle',
        targetType: 'order', targetId: id, after: { manual_review: flag }, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/orders/:id/manual-review]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/notes', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 5000) : '';
      await db.run(`UPDATE orders SET admin_notes = ? WHERE id = ?`, [note, id]);
      await AuditLogService.log({
        adminId: req.userId, action: 'order_note_update',
        targetType: 'order', targetId: id, after: { admin_notes: note }, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/orders/:id/notes]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
