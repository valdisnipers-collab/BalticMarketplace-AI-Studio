import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { isAdmin, JWT_SECRET } from '../utils/auth';
import { sendEmail, emailTemplates } from '../services/email';
import { cached, TTL } from '../services/redis';
import type { Server as SocketIOServer } from 'socket.io';

export function createAdminRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // Admin Stats
  router.get('/admin/stats', isAdmin, async (req, res) => {
    try {
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users', []) as { count: number | string };
      const totalListings = await db.get('SELECT COUNT(*) as count FROM listings', []) as { count: number | string };
      const pendingReports = await db.get('SELECT COUNT(*) as count FROM reports WHERE status = ?', ['pending']) as { count: number | string };

      let totalRevenueResult: { total: number | null } = { total: 0 };
      try {
        totalRevenueResult = await db.get('SELECT SUM(balance) as total FROM users', []) as { total: number | null };
      } catch (e) {
        // Ignore if error
      }

      res.json({
        totalUsers: Number(totalUsers.count),
        totalListings: Number(totalListings.count),
        pendingReports: Number(pendingReports.count),
        totalRevenue: totalRevenueResult.total || 0
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: 'Server error fetching stats' });
    }
  });

  // Admin Users
  router.get('/admin/users', isAdmin, async (req, res) => {
    try {
      const users = await db.all('SELECT id, email, name, role, created_at, balance FROM users ORDER BY created_at DESC', []);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Server error fetching users' });
    }
  });

  router.put('/admin/users/:id/role', isAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!['user', 'b2b', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
      res.json({ message: 'User role updated successfully' });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: 'Server error updating user role' });
    }
  });

  router.delete('/admin/users/:id', isAdmin, async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: 'Server error deleting user' });
    }
  });

  // Admin Listings
  router.get('/admin/listings', isAdmin, async (req, res) => {
    try {
      const listings = await db.all(`
        SELECT listings.*, users.name as author_name, users.email as author_email
        FROM listings
        JOIN users ON listings.user_id = users.id
        ORDER BY listings.created_at DESC
      `, []);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  router.delete('/admin/listings/:id', isAdmin, async (req, res) => {
    try {
      await db.run('DELETE FROM listings WHERE id = ?', [req.params.id]);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error deleting listing' });
    }
  });

  // Reports
  router.post('/reports', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const reporterId = decoded.userId;
      const { listingId, userId, reason } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Reason is required' });
      }

      const info = await db.run('INSERT INTO reports (reporter_id, listing_id, user_id, reason) VALUES (?, ?, ?, ?)', [reporterId, listingId || null, userId || null, reason]);

      res.json({ id: info.lastInsertRowid, message: 'Report submitted successfully' });
    } catch (error) {
      console.error("Error submitting report:", error);
      res.status(500).json({ error: 'Server error submitting report' });
    }
  });

  router.get('/admin/reports', isAdmin, async (req, res) => {
    try {
      const reports = await db.all(`
        SELECT r.*,
               u1.name as reporter_name,
               u2.name as reported_user_name,
               l.title as reported_listing_title
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.user_id = u2.id
        LEFT JOIN listings l ON r.listing_id = l.id
        ORDER BY r.created_at DESC
      `, []);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: 'Server error fetching reports' });
    }
  });

  router.put('/admin/reports/:id', isAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!['resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      await db.run('UPDATE reports SET status = ? WHERE id = ?', [status, req.params.id]);
      res.json({ message: 'Report updated successfully' });
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: 'Server error updating report' });
    }
  });

  // Admin Disputes
  router.get('/admin/disputes', isAdmin, async (req, res) => {
    try {
      const disputes = await db.all(`
        SELECT d.*, o.amount, o.status as order_status, l.title as listing_title, u.name as buyer_name, s.name as seller_name
        FROM disputes d
        JOIN orders o ON d.order_id = o.id
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON o.buyer_id = u.id
        JOIN users s ON o.seller_id = s.id
        ORDER BY d.created_at DESC
      `, []);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching admin disputes:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/admin/disputes/:id/resolve', isAdmin, async (req, res) => {
    try {
      const disputeId = req.params.id;
      const { action, adminNotes } = req.body; // action: 'refund' or 'release'

      const dispute = await db.get('SELECT * FROM disputes WHERE id = ?', [disputeId]) as any;
      if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
      if (dispute.status !== 'open') return res.status(400).json({ error: 'Dispute already resolved' });

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [dispute.order_id]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });

      await db.transaction(async (client) => {
        if (action === 'refund') {
          await db.clientRun(client, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['refunded', order.id]);
          await db.clientRun(client, 'UPDATE disputes SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['resolved_refunded', adminNotes, disputeId]);

          await db.clientRun(client, `
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, 'system', 'Strīds atrisināts: Nauda atgriezta', ?, ?)
          `, [order.buyer_id, `Jūsu strīds par pasūtījumu #${order.id} ir atrisināts. Nauda tiks atgriezta.`, `/profile?tab=orders`]);
        } else if (action === 'release') {
          await db.clientRun(client, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', order.id]);
          await db.clientRun(client, 'UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);
          await db.clientRun(client, 'UPDATE disputes SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['resolved_released', adminNotes, disputeId]);

          await db.clientRun(client, `
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, 'system', 'Strīds atrisināts: Nauda izmaksāta', ?, ?)
          `, [order.seller_id, `Strīds par pasūtījumu #${order.id} ir atrisināts par labu jums. Nauda ir ieskaitīta jūsu kontā.`, `/profile?tab=orders`]);
        }
      });

      // Send email to affected user
      const affectedUserId = action === 'refund' ? order.buyer_id : order.seller_id;
      const affectedUser = await db.get<{ email: string; name: string; username: string }>(
        'SELECT email, name, username FROM users WHERE id = ?',
        [affectedUserId]
      );
      if (affectedUser) {
        const tmpl = emailTemplates.disputeResolved(
          affectedUser.name || affectedUser.username,
          action === 'refund' ? 'refund' : 'release',
          order.id
        );
        sendEmail(affectedUser.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
      }

      res.json({ message: 'Dispute resolved successfully' });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Shipping
  router.get('/shipping/omniva-locations', async (req, res) => {
    try {
      const city = req.query.city as string | undefined;

      const allLocations = await cached('omniva:all', TTL.omnivaLocations, async () => {
        const response = await fetch('https://omniva.lv/locations.json');
        const data = await response.json() as any[];
        return data
          .filter((loc: any) => loc.A0_NAME === 'LV')
          .map((loc: any) => ({
            id: loc.ZIP,
            name: loc.NAME,
            address: loc.A2_NAME + (loc.A3_NAME ? ', ' + loc.A3_NAME : '') + ', ' + loc.A1_NAME,
            city: loc.A1_NAME,
          }));
      });

      const locations = city
        ? allLocations.filter((l: any) => l.city.toLowerCase().includes(city.toLowerCase()))
        : allLocations.slice(0, 100);

      res.json(locations);
    } catch (e) {
      res.status(503).json({ error: 'Nevar ielādēt Omniva lokācijas' });
    }
  });

  // Ads
  router.get('/admin/ads', isAdmin, async (req, res) => {
    try {
      const ads = await db.all(`
        SELECT ads.*, users.name as user_name
        FROM ads
        LEFT JOIN users ON ads.user_id = users.id
        ORDER BY ads.created_at DESC
      `, []);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  router.post('/admin/ads', isAdmin, async (req, res) => {
    const { title, image_url, link_url, size, start_date, end_date, is_active, category } = req.body;
    try {
      const info = await db.run('INSERT INTO ads (title, image_url, link_url, size, start_date, end_date, is_active, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, image_url, link_url, size, start_date, end_date, is_active ? 1 : 0, category || null, 'approved']);
      res.json({ id: info.lastInsertRowid, message: 'Ad created successfully' });
    } catch (error) {
      console.error("Error creating ad:", error);
      res.status(500).json({ error: 'Server error creating ad' });
    }
  });

  router.put('/admin/ads/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, size, start_date, end_date, is_active, category, status } = req.body;
    try {
      await db.transaction(async (client) => {
        const currentAd = await db.get('SELECT status, user_id, price_points FROM ads WHERE id = ?', [id]) as {status: string, user_id: number | null, price_points: number | null};

        if (currentAd && currentAd.status === 'pending' && status === 'rejected' && currentAd.user_id && currentAd.price_points) {
          // Refund points
          await db.clientRun(client, 'UPDATE users SET points = points + ? WHERE id = ?', [currentAd.price_points, currentAd.user_id]);
          // Record transaction
          await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [currentAd.user_id, currentAd.price_points, `Reklāmas noraidīšana: ${title}`]);
        }

        await db.clientRun(client, 'UPDATE ads SET title = ?, image_url = ?, link_url = ?, size = ?, start_date = ?, end_date = ?, is_active = ?, category = ?, status = ? WHERE id = ?', [title, image_url, link_url, size, start_date, end_date, is_active ? 1 : 0, category || null, status || 'approved', id]);
      });

      res.json({ message: 'Ad updated successfully' });
    } catch (error) {
      console.error("Error updating ad:", error);
      res.status(500).json({ error: 'Server error updating ad' });
    }
  });

  router.delete('/admin/ads/:id', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await db.transaction(async (client) => {
        const currentAd = await db.get('SELECT status, user_id, price_points, title FROM ads WHERE id = ?', [id]) as {status: string, user_id: number | null, price_points: number | null, title: string};

        if (currentAd && currentAd.status === 'pending' && currentAd.user_id && currentAd.price_points) {
          // Refund points
          await db.clientRun(client, 'UPDATE users SET points = points + ? WHERE id = ?', [currentAd.price_points, currentAd.user_id]);
          // Record transaction
          await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [currentAd.user_id, currentAd.price_points, `Reklāmas dzēšana: ${currentAd.title}`]);
        }

        await db.clientRun(client, 'DELETE FROM ads WHERE id = ?', [id]);
      });

      res.json({ message: 'Ad deleted successfully' });
    } catch (error) {
      console.error("Error deleting ad:", error);
      res.status(500).json({ error: 'Server error deleting ad' });
    }
  });

  router.get('/admin/ads/:id/stats', isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const stats = await db.all('SELECT date, views, clicks FROM ad_stats WHERE ad_id = ? ORDER BY date ASC', [id]);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching ad stats:", error);
      res.status(500).json({ error: 'Server error fetching ad stats' });
    }
  });

  // Public Ads Endpoints
  router.get('/ads', async (req, res) => {
    try {
      const now = new Date().toISOString();
      const ads = await db.all(`
        SELECT id, title, image_url, link_url, size, category
        FROM ads
        WHERE is_active = 1
          AND status = 'approved'
          AND start_date <= ?
          AND end_date >= ?
        ORDER BY RANDOM()
      `, [now, now]);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching active ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  router.post('/ads/:id/view', async (req, res) => {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      await db.run('UPDATE ads SET views = views + 1 WHERE id = ?', [id]);
      await db.run(`
        INSERT INTO ad_stats (ad_id, date, views, clicks)
        VALUES (?, ?, 1, 0)
        ON CONFLICT(ad_id, date) DO UPDATE SET views = views + 1
      `, [id, today]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  router.post('/ads/:id/click', async (req, res) => {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      await db.run('UPDATE ads SET clicks = clicks + 1 WHERE id = ?', [id]);
      await db.run(`
        INSERT INTO ad_stats (ad_id, date, views, clicks)
        VALUES (?, ?, 0, 1)
        ON CONFLICT(ad_id, date) DO UPDATE SET clicks = clicks + 1
      `, [id, today]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  return router;
}
