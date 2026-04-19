import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';

export function createDashboardRouter() {
  const router = Router();

  router.get('/dashboard', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId;

      const user = await db.get(
        'SELECT user_type, role FROM users WHERE id = $1',
        [userId]
      ) as any;
      if (!user || (user.user_type !== 'b2b' && user.role !== 'admin')) {
        return res.status(403).json({ error: 'Tikai B2B pārdevēji var piekļūt šim panelim' });
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const listingsRow = await db.get(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM listings WHERE user_id = $1",
        [userId]
      ) as any;

      const salesRow = await db.get(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
         FROM orders
         WHERE seller_id = $1 AND status = 'completed' AND created_at > $2`,
        [userId, thirtyDaysAgo]
      ) as any;

      const offersRow = await db.get(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN o.status = 'accepted' THEN 1 ELSE 0 END) as accepted
         FROM offers o
         JOIN listings l ON o.listing_id = l.id
         WHERE l.user_id = $1 AND o.created_at > $2`,
        [userId, thirtyDaysAgo]
      ) as any;

      const reviewsRow = await db.get(
        `SELECT COUNT(*) as count, COALESCE(AVG(rating), 0) as avg_rating
         FROM reviews WHERE seller_id = $1`,
        [userId]
      ) as any;

      const salesByDay = await db.all(
        `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(amount) as revenue
         FROM orders
         WHERE seller_id = $1 AND status = 'completed' AND created_at > $2
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [userId, thirtyDaysAgo]
      ) as any[];

      const topListings = await db.all(
        `SELECT l.id, l.title, l.price, l.image_url, l.status,
                COUNT(f.user_id) as favorites_count,
                COUNT(o.id) as offers_count
         FROM listings l
         LEFT JOIN favorites f ON f.listing_id = l.id
         LEFT JOIN offers o ON o.listing_id = l.id
         WHERE l.user_id = $1
         GROUP BY l.id
         ORDER BY favorites_count DESC
         LIMIT 5`,
        [userId]
      ) as any[];

      const disputesRow = await db.get(
        `SELECT COUNT(*) as count FROM disputes d
         JOIN orders o ON d.order_id = o.id
         WHERE o.seller_id = $1 AND d.status = 'open'`,
        [userId]
      ) as any;

      res.json({
        listings: {
          total: Number(listingsRow?.total ?? 0),
          active: Number(listingsRow?.active ?? 0),
        },
        sales: {
          count: Number(salesRow?.count ?? 0),
          revenue: Number(salesRow?.revenue ?? 0),
        },
        offers: {
          total: Number(offersRow?.total ?? 0),
          pending: Number(offersRow?.pending ?? 0),
          accepted: Number(offersRow?.accepted ?? 0),
        },
        reviews: {
          count: Number(reviewsRow?.count ?? 0),
          avg_rating: Number(reviewsRow?.avg_rating ?? 0).toFixed(1),
        },
        disputes: {
          open: Number(disputesRow?.count ?? 0),
        },
        sales_by_day: salesByDay,
        top_listings: topListings,
      });
    } catch (e) {
      console.error('[DASHBOARD ERROR]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
