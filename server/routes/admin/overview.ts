// server/routes/admin/overview.ts — extended stats + trend charts for the
// Admin Overview tab. Legacy /api/admin/stats stays in routes/admin.ts.

import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';

export function createOverviewRouter() {
  const router = Router();

  router.use(requireAdmin);

  router.get('/stats', async (_req, res) => {
    try {
      const rows = await db.all<{ metric: string; value: number }>(`
        SELECT 'users_total'            AS metric, COUNT(*)::int AS value FROM users
        UNION ALL SELECT 'users_new_today',     COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '1 day'
        UNION ALL SELECT 'users_new_week',      COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
        UNION ALL SELECT 'users_banned',        COUNT(*)::int FROM users WHERE is_banned = true
        UNION ALL SELECT 'listings_active',     COUNT(*)::int FROM listings WHERE status = 'active'
        UNION ALL SELECT 'listings_pending',    COUNT(*)::int FROM listings WHERE ai_moderation_status = 'pending'
        UNION ALL SELECT 'listings_sold',       COUNT(*)::int FROM listings WHERE status = 'sold'
        UNION ALL SELECT 'offers_total',        COUNT(*)::int FROM offers
        UNION ALL SELECT 'offers_pending',      COUNT(*)::int FROM offers WHERE status = 'pending'
        UNION ALL SELECT 'orders_total',        COUNT(*)::int FROM orders
        UNION ALL SELECT 'disputes_open',       COUNT(*)::int FROM disputes WHERE status = 'open'
        UNION ALL SELECT 'ads_active',          COUNT(*)::int FROM ads WHERE is_active = 1 AND status = 'approved'
        UNION ALL SELECT 'reports_pending',     COUNT(*)::int FROM reports WHERE status = 'pending'
      `);
      const out: Record<string, number> = {};
      for (const r of rows ?? []) out[r.metric] = Number(r.value);
      res.json(out);
    } catch (error) {
      console.error('[admin/overview/stats]', error);
      res.status(500).json({ error: 'Server error fetching stats' });
    }
  });

  router.get('/trends', async (req, res) => {
    try {
      const metric = String(req.query.metric || 'listings');
      const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 180);

      const tableByMetric: Record<string, string> = {
        listings: 'listings',
        users: 'users',
        orders: 'orders',
      };
      const table = tableByMetric[metric];
      if (!table) return res.status(400).json({ error: 'Unknown metric' });

      const rows = await db.all<{ day: string; count: number }>(
        `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
                COUNT(*)::int AS count
         FROM ${table}
         WHERE created_at >= NOW() - ($1::int || ' days')::interval
         GROUP BY 1
         ORDER BY 1 ASC`,
        [days],
      );
      res.json(rows ?? []);
    } catch (error) {
      console.error('[admin/overview/trends]', error);
      res.status(500).json({ error: 'Server error fetching trends' });
    }
  });

  router.get('/top-categories', async (_req, res) => {
    try {
      const rows = await db.all<{ category: string; count: number }>(
        `SELECT category, COUNT(*)::int AS count
         FROM listings
         WHERE status = 'active'
         GROUP BY category
         ORDER BY count DESC
         LIMIT 10`,
      );
      res.json(rows ?? []);
    } catch (error) {
      console.error('[admin/overview/top-categories]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
