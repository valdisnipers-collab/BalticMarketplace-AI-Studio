import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';

export function createStoresRouter() {
  const router = Router();

  router.get('/my', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const store = await db.get('SELECT * FROM stores WHERE user_id = ?', [userId]);
      res.json(store || null);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/by-user/:userId', async (req, res) => {
    try {
      const store = await db.get('SELECT * FROM stores WHERE user_id = ?', [req.params.userId]);
      if (!store) return res.status(404).json({ error: 'Nav veikala' });
      res.json(store);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/:slug', async (req, res) => {
    try {
      const store = await db.get(`
        SELECT s.*, u.name, u.company_name, u.company_reg_number, u.company_vat,
               (SELECT AVG(r.rating) FROM reviews r WHERE r.seller_id = u.id) as avg_rating,
               (SELECT COUNT(*) FROM reviews r WHERE r.seller_id = u.id) as review_count,
               (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'active') as active_listings_count
        FROM stores s JOIN users u ON s.user_id = u.id
        WHERE s.slug = ?
      `, [req.params.slug]) as any;
      if (!store) return res.status(404).json({ error: 'Veikals nav atrasts' });
      const listings = await db.all(`SELECT * FROM listings WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 50`, [store.user_id]);
      res.json({ ...store, listings });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]) as any;
      if (user.user_type !== 'b2b') return res.status(403).json({ error: 'Tikai B2B konti var izveidot veikalu' });
      const { slug, banner_url, logo_url, tagline, description, website, phone, working_hours } = req.body;
      if (!slug || !/^[a-z0-9-]{3,50}$/.test(slug)) {
        return res.status(400).json({ error: 'Slug: 3-50 simboli, tikai mazie burti, cipari un defises' });
      }
      const existing = await db.get('SELECT id FROM stores WHERE user_id = ?', [userId]);
      if (existing) {
        await db.run(`UPDATE stores SET slug=?, banner_url=?, logo_url=?, tagline=?, description=?, website=?, phone=?, working_hours=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`,
          [slug, banner_url || null, logo_url || null, tagline || null, description || null, website || null, phone || null, working_hours || null, userId]);
      } else {
        await db.run(`INSERT INTO stores (user_id, slug, banner_url, logo_url, tagline, description, website, phone, working_hours) VALUES (?,?,?,?,?,?,?,?,?)`,
          [userId, slug, banner_url || null, logo_url || null, tagline || null, description || null, website || null, phone || null, working_hours || null]);
      }
      const store = await db.get('SELECT * FROM stores WHERE user_id = ?', [userId]);
      res.json(store);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Šis slug jau ir aizņemts' });
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
