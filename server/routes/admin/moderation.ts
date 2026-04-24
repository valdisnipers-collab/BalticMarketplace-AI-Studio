// server/routes/admin/moderation.ts
//
// Unified moderation queue + action endpoint. Moderators and admins can
// reach this router; dangerous consequences (deletion) still require admin.

import { Router } from 'express';
import db from '../../pg';
import { requireModerator } from '../../middleware/requireModerator';
import * as AuditLogService from '../../services/AuditLogService';

export function createModerationRouter() {
  const router = Router();
  router.use(requireModerator);

  router.get('/queue', async (_req, res) => {
    try {
      // Listings pending AI review + AI-flagged listings
      const listings = await db.all(
        `SELECT 'listing' AS type, l.id, l.title AS subject,
                l.ai_moderation_status, l.ai_moderation_reason,
                l.created_at, u.name AS actor_name
         FROM listings l
         LEFT JOIN users u ON l.user_id = u.id
         WHERE l.ai_moderation_status IN ('pending','flagged')
            OR l.status = 'pending'
         ORDER BY l.created_at DESC
         LIMIT 100`,
      );

      // Open reports
      const reports = await db.all(
        `SELECT 'report' AS type, r.id, COALESCE(l.title, 'User report') AS subject,
                r.reason AS ai_moderation_reason, r.created_at,
                ru.name AS actor_name
         FROM reports r
         LEFT JOIN listings l ON r.listing_id = l.id
         LEFT JOIN users ru ON r.reporter_id = ru.id
         WHERE r.status = 'pending'
         ORDER BY r.created_at DESC
         LIMIT 100`,
      );

      // Suspicious messages
      const messages = await db.all(
        `SELECT 'message' AS type, m.id,
                COALESCE(l.title, 'Chat message') AS subject,
                m.system_warning AS ai_moderation_reason, m.created_at,
                u.name AS actor_name
         FROM messages m
         LEFT JOIN listings l ON m.listing_id = l.id
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.is_phishing_warning = true
         ORDER BY m.created_at DESC
         LIMIT 100`,
      );

      // Open disputes
      const disputes = await db.all(
        `SELECT 'dispute' AS type, d.id,
                COALESCE(l.title, 'Order dispute') AS subject,
                d.reason AS ai_moderation_reason, d.created_at,
                u.name AS actor_name
         FROM disputes d
         LEFT JOIN orders o ON d.order_id = o.id
         LEFT JOIN listings l ON o.listing_id = l.id
         LEFT JOIN users u ON d.user_id = u.id
         WHERE d.status = 'open'
         ORDER BY d.created_at DESC
         LIMIT 100`,
      );

      res.json([...(listings ?? []), ...(reports ?? []), ...(messages ?? []), ...(disputes ?? [])]);
    } catch (error) {
      console.error('[admin/moderation/queue]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Must exactly match the CHECK constraint in migration 011 or the
  // INSERT below will 500 at runtime.
  const VALID_ACTIONS = new Set([
    'approve','reject','flag','hide','unhide',
    'suspend','ban','unban','warn',
    'delete','restore','request_changes',
    'resolve','dismiss','escalate','note',
  ]);

  router.post('/:type/:id/action', async (req: any, res) => {
    try {
      const type = String(req.params.type);
      const id = Number(req.params.id);
      const action = String(req.body?.action || '').trim();
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 500) : null;

      const validTypes = new Set(['listing','report','message','dispute','store','user']);
      if (!validTypes.has(type)) return res.status(400).json({ error: 'Invalid type' });
      if (!action) return res.status(400).json({ error: 'Action required' });
      if (!VALID_ACTIONS.has(action)) return res.status(400).json({ error: 'Invalid action' });
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid target id' });

      // Apply the action based on type
      if (type === 'listing') {
        if (action === 'approve') {
          await db.run(`UPDATE listings SET ai_moderation_status = 'approved', status = 'active' WHERE id = ?`, [id]);
        } else if (action === 'reject') {
          await db.run(`UPDATE listings SET ai_moderation_status = 'rejected', status = 'rejected' WHERE id = ?`, [id]);
        } else if (action === 'hide') {
          await db.run(`UPDATE listings SET status = 'paused' WHERE id = ?`, [id]);
        }
      } else if (type === 'report') {
        if (action === 'resolve') {
          await db.run(`UPDATE reports SET status = 'resolved' WHERE id = ?`, [id]);
        } else if (action === 'dismiss') {
          await db.run(`UPDATE reports SET status = 'dismissed' WHERE id = ?`, [id]);
        }
      }
      // Messages and disputes get note-only handling here; full dispute
      // resolution still lives in the legacy /admin/disputes/:id/resolve.

      await db.run(
        `INSERT INTO moderation_actions (admin_id, target_type, target_id, action, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [req.userId, type, id, action, reason],
      );
      await AuditLogService.log({
        adminId: req.userId, action: `moderation_${action}`,
        targetType: type, targetId: id, reason, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/moderation/:type/:id/action]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
