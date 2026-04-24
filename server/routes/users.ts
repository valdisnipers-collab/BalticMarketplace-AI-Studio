import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET, requireAuth } from '../utils/auth';
import { checkAndAwardBadges, BADGE_DEFINITIONS, recalculateTrustScore } from '../utils/badges';
import { hasEarlyAccess } from '../utils/earlyAccess';
import type { Server as SocketIOServer } from 'socket.io';

function generateReferralCode(userId: number): string {
  const base = userId.toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `BM${base}${rand}`.substring(0, 10);
}

export function createUsersRouter(deps: { io: SocketIOServer }) {
  const router = Router();

  // GET /api/users/me/analytics
  router.get('/me/analytics', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      const viewsResult = await db.get('SELECT SUM(view_count) as total_views FROM listings WHERE user_id = ?', [decoded.userId]) as { total_views: number | null };

      const favoritesResult = await db.get(`
        SELECT COUNT(*) as total_favorites
        FROM favorites f
        JOIN listings l ON f.listing_id = l.id
        WHERE l.user_id = ?
      `, [decoded.userId]) as { total_favorites: number };

      const messagesResult = await db.get(`
        SELECT COUNT(*) as total_messages
        FROM messages m
        JOIN listings l ON m.listing_id = l.id
        WHERE l.user_id = ? AND m.receiver_id = ?
      `, [decoded.userId, decoded.userId]) as { total_messages: number };

      res.json({
        total_views: viewsResult.total_views || 0,
        total_favorites: Number(favoritesResult.total_favorites) || 0,
        total_messages: Number(messagesResult.total_messages) || 0
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ error: 'Server error fetching analytics' });
    }
  });

  // POST /api/users/:id/follow
  router.post('/:id/follow', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const followingId = req.params.id;

      if (decoded.userId.toString() === followingId) {
        return res.status(400).json({ error: 'You cannot follow yourself' });
      }

      await db.run('INSERT INTO followers (follower_id, following_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [decoded.userId, followingId]);
      res.json({ message: 'Successfully followed user' });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /api/users/:id/follow
  router.delete('/:id/follow', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const followingId = req.params.id;

      await db.run('DELETE FROM followers WHERE follower_id = ? AND following_id = ?', [decoded.userId, followingId]);
      res.json({ message: 'Successfully unfollowed user' });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/:id/follow-status
  router.get('/:id/follow-status', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ isFollowing: false });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const followingId = req.params.id;

      const result = await db.get('SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?', [decoded.userId, followingId]);
      res.json({ isFollowing: !!result });
    } catch (error) {
      res.json({ isFollowing: false });
    }
  });

  // GET /api/users/me/following/listings
  router.get('/me/following/listings', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { hasAccess, userId } = await hasEarlyAccess(req);

      let sql = `
        SELECT listings.*, users.name as author_name
        FROM listings
        JOIN users ON listings.user_id = users.id
        JOIN followers ON followers.following_id = users.id
        WHERE followers.follower_id = ?
      `;
      const params: any[] = [decoded.userId];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      sql += ` ORDER BY listings.created_at DESC LIMIT 50`;

      const listings = await db.all(sql, params);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching following listings:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/orders/bought
  router.get('/me/orders/bought', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orders = await db.all(`
        SELECT o.*, l.title as listing_title, l.image_url as listing_image, u.name as seller_name
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON o.seller_id = u.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
      `, [decoded.userId]);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/orders/sold
  router.get('/me/orders/sold', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orders = await db.all(`
        SELECT o.*, l.title as listing_title, l.image_url as listing_image, u.name as buyer_name
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = ?
        ORDER BY o.created_at DESC
      `, [decoded.userId]);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/listings
  router.get('/me/listings', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listings = await db.all(`
        SELECT * FROM listings
        WHERE user_id = ?
        ORDER BY is_highlighted DESC, created_at DESC
      `, [decoded.userId]);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // GET /api/users/me/favorites
  router.get('/me/favorites', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { hasAccess, userId } = await hasEarlyAccess(req);

      let sql = `
        SELECT listings.*, users.name as author_name
        FROM favorites
        JOIN listings ON favorites.listing_id = listings.id
        JOIN users ON listings.user_id = users.id
        WHERE favorites.user_id = ?
      `;
      const params: any[] = [decoded.userId];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      sql += ` ORDER BY listings.is_highlighted DESC, favorites.created_at DESC`;

      const favorites = await db.all(sql, params);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // POST /api/users/me/favorites/:id  (was /api/favorites/:id)
  router.post('/me/favorites/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      await db.run('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [decoded.userId, listingId]);
      res.json({ message: 'Added to favorites' });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /api/users/me/favorites/:id  (was /api/favorites/:id)
  router.delete('/me/favorites/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      await db.run('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?', [decoded.userId, listingId]);
      res.json({ message: 'Removed from favorites' });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/saved-searches
  router.get('/me/saved-searches', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const searches = await db.all('SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(searches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // POST /api/users/me/saved-searches
  router.post('/me/saved-searches', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { query, category, subcategory, min_price, max_price, attributes } = req.body;

      const result = await db.run(`
        INSERT INTO saved_searches (user_id, query, category, subcategory, min_price, max_price, attributes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        decoded.userId,
        query || null,
        category || null,
        subcategory || null,
        min_price || null,
        max_price || null,
        attributes ? JSON.stringify(attributes) : null
      ]);

      res.json({ id: result.lastInsertRowid, message: 'Search saved' });
    } catch (error) {
      console.error("Error saving search:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // DELETE /api/users/me/saved-searches/:id
  router.delete('/me/saved-searches/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      await db.run('DELETE FROM saved_searches WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
      res.json({ message: 'Saved search deleted' });
    } catch (error) {
      console.error("Error deleting saved search:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/users/me/saved-searches/:id — update an existing saved search
  router.put('/me/saved-searches/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const searchId = req.params.id;
      const { query, category, subcategory, min_price, max_price, attributes, notification_enabled } = req.body;

      const result = await db.run(
        `UPDATE saved_searches
         SET query = ?, category = ?, subcategory = ?, min_price = ?, max_price = ?,
             attributes = ?, notification_enabled = COALESCE(?, notification_enabled),
             updated_at = NOW()
         WHERE id = ? AND user_id = ?`,
        [
          query ?? null,
          category ?? null,
          subcategory ?? null,
          min_price ?? null,
          max_price ?? null,
          attributes ? JSON.stringify(attributes) : null,
          typeof notification_enabled === 'boolean' ? notification_enabled : null,
          searchId,
          userId,
        ]
      );

      if (!result.changes) {
        return res.status(404).json({ error: 'Saved search not found' });
      }
      res.json({ message: 'Saved search updated' });
    } catch (error) {
      console.error('Error updating saved search:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/users/me/saved-searches/:id/toggle-notifications
  router.post('/me/saved-searches/:id/toggle-notifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const searchId = req.params.id;

      const row = await db.get(
        'SELECT notification_enabled FROM saved_searches WHERE id = ? AND user_id = ?',
        [searchId, userId]
      ) as { notification_enabled: boolean | null } | null;
      if (!row) return res.status(404).json({ error: 'Saved search not found' });

      const next = !row.notification_enabled;
      await db.run(
        'UPDATE saved_searches SET notification_enabled = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [next, searchId, userId]
      );
      res.json({ notification_enabled: next });
    } catch (error) {
      console.error('Error toggling notifications:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/company — current user's company profile
  router.get('/me/company', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const row = await db.get(
        `SELECT user_type, company_name, company_reg_number, company_vat, company_address
         FROM users WHERE id = ?`,
        [userId]
      );
      if (!row) return res.status(404).json({ error: 'User not found' });
      res.json(row);
    } catch (error) {
      console.error('Error fetching company profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/users/me/company — update company profile fields
  router.put('/me/company', requireAuth, async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const { company_name, company_reg_number, company_vat, company_address, user_type } = req.body ?? {};

      // Simple length bounds; don't silently truncate.
      const tooLong = [company_name, company_reg_number, company_vat, company_address]
        .some(v => typeof v === 'string' && v.length > 200);
      if (tooLong) return res.status(400).json({ error: 'Lauks pārāk garš (max 200)' });

      const nextUserType = user_type === 'b2b' || user_type === 'c2c' ? user_type : null;

      await db.run(
        `UPDATE users
         SET company_name = COALESCE(?, company_name),
             company_reg_number = COALESCE(?, company_reg_number),
             company_vat = COALESCE(?, company_vat),
             company_address = COALESCE(?, company_address),
             user_type = COALESCE(?, user_type)
         WHERE id = ?`,
        [
          company_name ?? null,
          company_reg_number ?? null,
          company_vat ?? null,
          company_address ?? null,
          nextUserType,
          userId,
        ]
      );

      const row = await db.get(
        `SELECT user_type, company_name, company_reg_number, company_vat, company_address
         FROM users WHERE id = ?`,
        [userId]
      );
      res.json(row);
    } catch (error) {
      console.error('Error updating company profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/notifications
  router.get('/me/notifications', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [decoded.userId]);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // PUT /api/users/me/notifications/:id/read
  router.put('/me/notifications/:id/read', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/ads
  router.get('/me/ads', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const ads = await db.all('SELECT * FROM ads WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching user ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  // GET /api/users/me/ads/:id/stats
  router.get('/me/ads/:id/stats', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const adId = req.params.id;
      const ad = await db.get('SELECT id FROM ads WHERE id = ? AND user_id = ?', [adId, decoded.userId]);
      if (!ad) return res.status(404).json({ error: 'Ad not found' });

      const stats = await db.all(`
        SELECT date, views, clicks
        FROM ad_stats
        WHERE ad_id = ?
        ORDER BY date ASC
      `, [adId]);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching ad stats:", error);
      res.status(500).json({ error: 'Server error fetching ad stats' });
    }
  });

  // POST /api/users/me/ads
  router.post('/me/ads', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, image_url, link_url, size, start_date, end_date, category } = req.body;

      const settings = await db.all('SELECT key, value FROM settings', []) as {key: string, value: string}[];
      const settingsMap = settings.reduce((acc, s) => ({...acc, [s.key]: s.value}), {} as Record<string, string>);
      const adPrice = parseInt(settingsMap['ad_price_points'] || '500', 10);

      let adId: number | bigint | undefined;
      await db.transaction(async (client) => {
        const user = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as {points: number};
        if (!user || user.points < adPrice) {
          throw new Error('INSUFFICIENT_POINTS');
        }

        await db.clientRun(client, 'UPDATE users SET points = points - ? WHERE id = ?', [adPrice, decoded.userId]);
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -adPrice, `Reklāmas izveide: ${title}`]);

        const info = await db.clientRun(client, 'INSERT INTO ads (title, image_url, link_url, size, start_date, end_date, is_active, category, user_id, status, price_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, image_url, link_url, size, start_date, end_date, 0, category || null, decoded.userId, 'pending', adPrice]);
        adId = info.lastInsertRowid;
      });

      res.json({ id: adId, message: 'Ad submitted for review' });
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_POINTS') {
        return res.status(400).json({ error: 'Nepietiekams punktu atlikums' });
      }
      console.error("Error creating user ad:", error);
      res.status(500).json({ error: 'Server error creating ad' });
    }
  });

  // GET /api/users/:id  — must come after all /me/* routes
  router.get('/:id', async (req, res) => {
    try {
      const user = await db.get('SELECT id, name, created_at FROM users WHERE id = ?', [req.params.id]) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/:id/reviews
  router.get('/:id/reviews', async (req, res) => {
    try {
      const sellerId = req.params.id;
      const reviews = await db.all(`
        SELECT reviews.*, users.name as reviewer_name
        FROM reviews
        JOIN users ON reviews.reviewer_id = users.id
        WHERE seller_id = ?
        ORDER BY reviews.created_at DESC
      `, [sellerId]);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/users/:id/reviews
  router.post('/:id/reviews', requireAuth, async (req: any, res) => {
    try {
      const reviewerId = req.userId as number;
      const sellerId = req.params.id;
      const { rating, comment, orderId } = req.body;

      if (reviewerId.toString() === sellerId) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      const numericRating = Number(rating);
      if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required to leave a review' });
      }

      const safeComment = typeof comment === 'string' ? comment.slice(0, 2000) : '';

      const order = await db.get('SELECT * FROM orders WHERE id = ? AND buyer_id = ? AND seller_id = ? AND status = ?', [orderId, reviewerId, sellerId, 'completed']);

      if (!order) {
        return res.status(403).json({ error: 'You can only review sellers after a completed purchase' });
      }

      const existingReview = await db.get('SELECT id FROM reviews WHERE order_id = ?', [orderId]);
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this order' });
      }

      const info = await db.run('INSERT INTO reviews (reviewer_id, seller_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [reviewerId, sellerId, orderId, numericRating, safeComment]);

      recalculateTrustScore(Number(req.params.id)).catch(() => {});

      res.json({ id: info.lastInsertRowid, message: 'Review added successfully' });
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/referral — get or create referral code
  router.get('/me/referral', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;
      let row = await db.get('SELECT code, uses FROM referral_codes WHERE user_id = $1', [userId]) as any;
      if (!row) {
        const code = generateReferralCode(userId);
        await db.run('INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, code]);
        row = { code, uses: 0 };
      }
      res.json(row);
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // POST /api/users/me/referral/apply — apply a referral code (called during/after registration)
  router.post('/me/referral/apply', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      const me = await db.get('SELECT referred_by FROM users WHERE id = $1', [userId]) as any;
      if (me?.referred_by) return res.status(400).json({ error: 'Referral already applied' });

      const ref = await db.get('SELECT user_id FROM referral_codes WHERE code = $1', [code]) as any;
      if (!ref) return res.status(404).json({ error: 'Invalid referral code' });
      if (ref.user_id === userId) return res.status(400).json({ error: 'Cannot use own code' });

      await db.run('UPDATE users SET referred_by = $1 WHERE id = $2', [ref.user_id, userId]);
      await db.run('UPDATE referral_codes SET uses = uses + 1 WHERE user_id = $1', [ref.user_id]);

      // +50 points to both
      await db.run('UPDATE users SET points = points + 50 WHERE id = $1', [userId]);
      await db.run('UPDATE users SET points = points + 50 WHERE id = $1', [ref.user_id]);
      await db.run("INSERT INTO points_history (user_id, points, reason) VALUES ($1, 50, 'Referral bonuss — jauns lietotājs')", [userId]);
      await db.run("INSERT INTO points_history (user_id, points, reason) VALUES ($1, 50, 'Referral bonuss — uzaicināts lietotājs')", [ref.user_id]);

      res.json({ ok: true });
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // GET /api/users/:id/badges
  router.get('/:id/badges', async (req, res) => {
    try {
      const badges = await db.all('SELECT badge_id, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC', [req.params.id]) as any[];
      res.json(badges.map(b => ({ ...b, ...(BADGE_DEFINITIONS[b.badge_id] || {}) })));
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
