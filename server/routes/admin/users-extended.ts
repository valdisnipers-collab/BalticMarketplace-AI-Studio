// server/routes/admin/users-extended.ts
//
// Extends the legacy /admin/users endpoints in admin.ts with everything the
// Admin → Users tab needs beyond read + role + delete:
//   - GET /   — paginated list with filters + search
//   - GET /:id — single user with counts + notes
//   - POST /:id/ban / unban / suspend
//   - POST /:id/verify
//   - GET /:id/notes and POST /:id/notes

import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';

export function createUsersExtendedRouter(_deps: { io: SocketIOServer }) {
  const router = Router();
  router.use(requireAdmin);

  // List — enhanced /admin/users/search (legacy /admin/users stays in admin.ts
  // so existing frontend keeps working; this richer endpoint is opt-in.)
  router.get('/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const role = String(req.query.role || '').trim();
      const status = String(req.query.status || '').trim(); // active | suspended | banned
      const verified = String(req.query.verified || '').trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      let sql = `
        SELECT id, email, name, phone, role, is_verified, is_banned,
               suspension_until, created_at, balance, trust_score
        FROM users WHERE 1=1`;
      const params: any[] = [];
      if (q) {
        sql += ` AND (name ILIKE ? OR email ILIKE ? OR CAST(id AS TEXT) = ?)`;
        params.push(`%${q}%`, `%${q}%`, q);
      }
      if (role) { sql += ` AND role = ?`; params.push(role); }
      if (status === 'banned') sql += ` AND is_banned = true`;
      else if (status === 'suspended') sql += ` AND suspension_until IS NOT NULL AND suspension_until > NOW()`;
      else if (status === 'active') sql += ` AND is_banned = false AND (suspension_until IS NULL OR suspension_until <= NOW())`;
      if (verified === 'true') sql += ` AND is_verified = 1`;
      else if (verified === 'false') sql += ` AND (is_verified IS NULL OR is_verified = 0)`;
      sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const users = await db.all(sql, params);
      res.json(users ?? []);
    } catch (error) {
      console.error('[admin/users/search]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/:id/detail', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = await db.get(
        `SELECT id, email, name, phone, role, is_verified, is_banned, banned_at,
                banned_reason, suspension_until, user_type, company_name,
                trust_score, balance, points, created_at
         FROM users WHERE id = ?`,
        [id],
      );
      if (!user) return res.status(404).json({ error: 'Not found' });

      const counts = await db.get<any>(
        `SELECT
           (SELECT COUNT(*) FROM listings WHERE user_id = $1)::int AS listings_count,
           (SELECT COUNT(*) FROM orders WHERE buyer_id = $1 OR seller_id = $1)::int AS orders_count,
           (SELECT COUNT(*) FROM reports WHERE user_id = $1)::int AS reports_count,
           (SELECT COUNT(*) FROM admin_user_notes WHERE user_id = $1)::int AS notes_count`,
        [id],
      );

      res.json({ ...user, counts });
    } catch (error) {
      console.error('[admin/users/:id/detail]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/ban', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
      const before = await db.get(`SELECT is_banned, banned_reason FROM users WHERE id = ?`, [id]);
      if (!before) return res.status(404).json({ error: 'Not found' });
      await db.run(
        `UPDATE users SET is_banned = true, banned_at = NOW(), banned_reason = ? WHERE id = ?`,
        [reason, id],
      );
      await AuditLogService.log({
        adminId: req.userId,
        action: 'user_ban',
        targetType: 'user',
        targetId: id,
        before,
        after: { is_banned: true, banned_reason: reason },
        reason,
        req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/users/:id/ban]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/unban', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const before = await db.get(`SELECT is_banned, banned_reason FROM users WHERE id = ?`, [id]);
      if (!before) return res.status(404).json({ error: 'Not found' });
      await db.run(
        `UPDATE users SET is_banned = false, banned_at = NULL, banned_reason = NULL WHERE id = ?`,
        [id],
      );
      await AuditLogService.log({
        adminId: req.userId,
        action: 'user_unban',
        targetType: 'user',
        targetId: id,
        before,
        after: { is_banned: false },
        req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/users/:id/unban]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/suspend', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const until = req.body?.until ? new Date(String(req.body.until)) : null;
      if (!until || !Number.isFinite(until.getTime())) {
        return res.status(400).json({ error: 'Invalid suspension `until` date' });
      }
      if (until.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Suspension `until` must be in the future' });
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;
      const before = await db.get(`SELECT suspension_until FROM users WHERE id = ?`, [id]);
      if (!before) return res.status(404).json({ error: 'Not found' });
      await db.run(
        `UPDATE users SET suspension_until = ?, banned_reason = COALESCE(?, banned_reason) WHERE id = ?`,
        [until.toISOString(), reason, id],
      );
      await AuditLogService.log({
        adminId: req.userId,
        action: 'user_suspend',
        targetType: 'user',
        targetId: id,
        before,
        after: { suspension_until: until.toISOString() },
        reason,
        req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/users/:id/suspend]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/verify', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const before = await db.get(`SELECT is_verified FROM users WHERE id = ?`, [id]);
      if (!before) return res.status(404).json({ error: 'Not found' });
      await db.run(`UPDATE users SET is_verified = 1 WHERE id = ?`, [id]);
      await AuditLogService.log({
        adminId: req.userId,
        action: 'user_verify',
        targetType: 'user',
        targetId: id,
        before,
        after: { is_verified: 1 },
        req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/users/:id/verify]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/:id/notes', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const notes = await db.all(
        `SELECT n.id, n.user_id, n.admin_id, n.note, n.created_at, a.name AS admin_name
         FROM admin_user_notes n
         LEFT JOIN users a ON n.admin_id = a.id
         WHERE n.user_id = ?
         ORDER BY n.created_at DESC
         LIMIT 200`,
        [id],
      );
      res.json(notes ?? []);
    } catch (error) {
      console.error('[admin/users/:id/notes] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/notes', async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
      if (!note) return res.status(400).json({ error: 'Note is empty' });
      if (note.length > 5000) return res.status(400).json({ error: 'Note too long' });
      const result = await db.run(
        `INSERT INTO admin_user_notes (user_id, admin_id, note) VALUES (?, ?, ?)`,
        [id, req.userId, note],
      );
      await AuditLogService.log({
        adminId: req.userId,
        action: 'user_note_add',
        targetType: 'user',
        targetId: id,
        after: { note },
        req,
      });
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error('[admin/users/:id/notes] POST', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
