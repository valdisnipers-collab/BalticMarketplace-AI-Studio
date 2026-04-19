import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./server/pg";
import { GoogleGenAI } from "@google/genai";
import twilio from "twilio";
import fs from "fs";
import Stripe from "stripe";
import { sendEmail, emailTemplates } from './server/services/email';
import { cached, invalidate, invalidatePattern, TTL, checkRateLimit } from './server/services/redis';
import { sendPushToUser, vapidPublicKey } from './server/services/push';
import { initSearchIndex, syncListing, removeListing, searchListings } from './server/services/search';
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import { corsMiddleware, helmetMiddleware, generalLimiter, authLimiter, uploadLimiter } from './server/middleware/security';
import { validateBody, registerSchema, loginSchema, listingSchema } from './server/middleware/validate';
import { createAuthRouter } from './server/routes/auth';
import { createUploadsRouter } from './server/routes/uploads';
import { createListingsRouter } from './server/routes/listings';
import { createUsersRouter } from './server/routes/users';
import { createMessagesRouter } from './server/routes/messages';

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-key-change-in-production";


async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!location) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location + ', Latvia')}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BalticMarket/1.0' } });
    const data = await res.json() as any[];
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {}
  return null;
}

const BADGE_DEFINITIONS: Record<string, { label: string; description: string; icon: string; color: string }> = {
  verified_seller:  { label: 'Verificēts',        description: 'Smart-ID identitāte apstiprināta',  icon: '🛡️', color: 'blue' },
  trusted_seller:   { label: 'Uzticams pārdevējs', description: '10+ pārdošanas, vērtējums ≥ 4.5',   icon: '⭐', color: 'amber' },
  fast_responder:   { label: 'Ātrs atbildētājs',   description: 'Vidēji atbild < 2 stundās',          icon: '⚡', color: 'yellow' },
  top_seller_2026:  { label: 'Top pārdevējs',      description: '50+ veiksmīgi darījumi',              icon: '🏆', color: 'gold' },
  eco_warrior:      { label: 'Eko pārdevējs',       description: '20+ bezmaksas sludinājumi',           icon: '🌱', color: 'green' },
  auction_master:   { label: 'Izsoles meistars',    description: '10+ veiksmīgas izsoles',              icon: '🔨', color: 'purple' },
};

async function awardBadgeIfEarned(userId: number, badgeId: string) {
  try {
    await db.run(
      'INSERT INTO user_achievements (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, badgeId]
    );
  } catch (e) {}
}

async function checkAndAwardBadges(userId: number) {
  const user = await db.get('SELECT * FROM users WHERE id = $1', [userId]) as any;
  if (!user) return;

  if (user.is_verified) await awardBadgeIfEarned(userId, 'verified_seller');

  const orderRow = await db.get("SELECT COUNT(*) as c FROM orders WHERE seller_id = $1 AND status = 'completed'", [userId]) as any;
  const orderCount = Number(orderRow?.c ?? 0);
  const ratingRow = await db.get('SELECT AVG(rating) as r FROM reviews WHERE seller_id = $1', [userId]) as any;
  const avgRating = Number(ratingRow?.r ?? 0);
  if (orderCount >= 10 && avgRating >= 4.5) await awardBadgeIfEarned(userId, 'trusted_seller');
  if (orderCount >= 50) await awardBadgeIfEarned(userId, 'top_seller_2026');

  const giveawayRow = await db.get("SELECT COUNT(*) as c FROM listings WHERE user_id = $1 AND listing_type = 'giveaway' AND status = 'sold'", [userId]) as any;
  const giveawayCount = Number(giveawayRow?.c ?? 0);
  if (giveawayCount >= 20) await awardBadgeIfEarned(userId, 'eco_warrior');

  const auctionRow = await db.get("SELECT COUNT(*) as c FROM orders WHERE seller_id = $1 AND status = 'completed' AND listing_id IN (SELECT id FROM listings WHERE is_auction = true)", [userId]) as any;
  const auctionCount = Number(auctionRow?.c ?? 0);
  if (auctionCount >= 10) await awardBadgeIfEarned(userId, 'auction_master');
}

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key, { apiVersion: '2026-03-25.dahlia' as any });
  }
  return stripeClient;
}

// Configure Multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Security middleware — applied first so every request is protected
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(generalLimiter);

  // Auth guard — defined early so all routes below can reference it
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      (req as any).userId = decoded.userId;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const PORT = 3000;
  const httpServer = http.createServer(app);
  
  const SOCKET_ORIGINS = process.env.NODE_ENV === 'production'
    ? ['https://balticmarket.net', 'https://www.balticmarket.net']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: SOCKET_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    }
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    socket.on("join", (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Initialize Meilisearch
  if (process.env.MEILISEARCH_HOST) {
    initSearchIndex().catch(e => console.error('[SEARCH INIT ERROR]', e));
  }

  // Stripe Webhook (must be before express.json())
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req: any, res: any) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhooks will not work.');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const type = session.metadata?.type;
      const amount = parseInt(session.metadata?.amount || '0', 10);

      if (type === 'escrow_purchase') {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          try {
            await db.run('UPDATE orders SET status = ?, stripe_session_id = ? WHERE id = ?', ['paid', session.id, orderId]);
            console.log(`Successfully processed escrow payment for order ${orderId}`);
          } catch (dbError) {
            console.error('Database error processing escrow webhook:', dbError);
          }
        }
      } else if (userId && amount > 0) {
        try {
          if (type === 'points') {
            // Add points
            await db.run('UPDATE users SET points = points + ? WHERE id = ?', [amount, userId]);

            await db.run(`
              INSERT INTO points_history (user_id, points, reason)
              VALUES (?, ?, 'Punktu pirkums')
            `, [userId, amount]);
          } else {
            // Add funds (EUR)
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);

            // Reward bonus points for purchase (10 points per 1 EUR)
            const bonusPoints = Math.floor(amount * 10);
            if (bonusPoints > 0) {
              await db.run('UPDATE users SET points = points + ? WHERE id = ?', [bonusPoints, userId]);
              await db.run(`
                INSERT INTO points_history (user_id, points, reason)
                VALUES (?, ?, 'Bonuss par maka papildināšanu')
              `, [userId, bonusPoints]);
            }
          }
          console.log(`Successfully processed payment for user ${userId}: ${amount} ${type}`);
        } catch (dbError) {
          console.error('Database error processing webhook:', dbError);
        }
      }
    }

    res.json({received: true});
  });

  // Rate limiting middleware
  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path === '/api/health' || !req.path.startsWith('/api/')) return next();

    const identifier = req.ip ?? 'unknown';
    const isAuthEndpoint = req.path.startsWith('/api/auth/');
    const limit = isAuthEndpoint ? 10 : 200;
    const window = 60;

    const { allowed, remaining, resetIn } = await checkRateLimit(
      `${identifier}:${isAuthEndpoint ? 'auth' : 'api'}`,
      limit,
      window
    );

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetIn);

    if (!allowed) {
      return res.status(429).json({
        error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.',
        resetIn,
      });
    }
    next();
  });

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Upload Routes
  app.use('/api/upload', createUploadsRouter({ uploadLimiter }));

  // API routes FIRST
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Auth Routes
  app.use('/api/auth', createAuthRouter({ authLimiter }));
  app.use('/api/listings', createListingsRouter({ io }));

  // User Routes
  app.use('/api/users', createUsersRouter({ io }));

  // Messages Routes
  app.use('/api/messages', createMessagesRouter({ io }));

  app.post("/api/orders/:id/ship", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.seller_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (order.status !== 'paid') return res.status(400).json({ error: 'Order is not in paid status' });

      await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['shipped', orderId]);

      const listing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      io.to(`user_${order.buyer_id}`).emit('order_shipped', {
        id: orderId,
        listing_title: listing?.title || 'Prece'
      });

      sendPushToUser(order.buyer_id, {
        title: 'Pasūtījums nosūtīts',
        body: `"${listing?.title ?? 'Prece'}" ir ceļā uz jums`,
        url: `/profile?tab=orders`,
      }).catch(e => console.error('Push error:', e));

      const buyer = await db.get('SELECT email, name FROM users WHERE id = ?', [order.buyer_id]) as any;
      if (buyer?.email) {
        const tmpl = emailTemplates.orderShipped(buyer.name || buyer.username, listing?.title ?? 'Prece', Number(orderId));
        sendEmail(buyer.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
      }

      res.json({ message: 'Order marked as shipped' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/orders/:id/confirm", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyer_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (order.status !== 'shipped') return res.status(400).json({ error: 'Order is not shipped yet' });

      // Begin transaction
      await db.transaction(async (client) => {
        // Mark order as completed
        await db.clientRun(client, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', orderId]);

        // Transfer funds to seller
        await db.clientRun(client, 'UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);
      });

      const listing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      io.to(`user_${order.seller_id}`).emit('order_completed', {
        id: orderId,
        listing_title: listing?.title || 'Prece',
        amount: order.amount
      });

      sendPushToUser(order.seller_id, {
        title: 'Nauda ieskaitīta',
        body: `€${order.amount} par "${listing?.title ?? 'Prece'}"`,
        url: `/profile?tab=wallet`,
      }).catch(e => console.error('Push error:', e));

      await checkAndAwardBadges(order.seller_id);

      const seller = await db.get('SELECT email, name FROM users WHERE id = ?', [order.seller_id]) as any;
      const completedListing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      if (seller?.email) {
        const tmpl = emailTemplates.orderCompleted(seller.name || seller.username, completedListing?.title ?? 'Prece', order.amount);
        sendEmail(seller.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
      }

      res.json({ message: 'Order confirmed and funds transferred' });
    } catch (error) {
      console.error("Error confirming order:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/orders/:id/dispute", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;
      const { reason, description } = req.body;

      if (!reason) return res.status(400).json({ error: 'Reason is required' });

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyer_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });

      if (!['paid', 'shipped'].includes(order.status)) {
        return res.status(400).json({ error: 'Order status does not allow dispute' });
      }

      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['disputed', orderId]);
        await db.clientRun(client, 'INSERT INTO disputes (order_id, user_id, reason, description) VALUES (?, ?, ?, ?)', [orderId, decoded.userId, reason, description]);

        await db.clientRun(client, `
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES (?, 'system', 'Strīds pieteikts', ?, ?)
        `, [order.seller_id, `Pircējs ir pieteicis strīdu pasūtījumam #${orderId}.`, `/profile?tab=orders`]);
      });

      res.json({ message: 'Dispute opened successfully' });
    } catch (error) {
      console.error("Error opening dispute:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });


  // Wallet API
  app.get("/api/wallet/points-history", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const history = await db.all('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(history);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ error: 'Server error fetching points history' });
    }
  });

  app.get("/api/wallet/balance", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number } | undefined;

      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ balance: user.balance || 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: 'Server error fetching balance' });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await db.all('SELECT key, value FROM settings', []) as { key: string, value: string }[];
      const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: 'Server error fetching settings' });
    }
  });

  app.put("/api/settings", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT role FROM users WHERE id = ?', [decoded.userId]) as { role: string };
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const settings = req.body; // Record<string, string>
      await db.transaction(async (client) => {
        for (const [key, value] of Object.entries(settings)) {
          await db.clientRun(client, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, String(value)]);
        }
      });
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: 'Server error updating settings' });
    }
  });

  app.post("/api/wallet/buy-early-access", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      // Fetch settings
      const priceSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['early_access_price']) as any;
      const durationSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['early_access_duration_hours']) as any;

      const price = priceSetting ? parseInt(priceSetting.value, 10) : 150;
      const durationHours = durationSetting ? parseInt(durationSetting.value, 10) : 24;

      // Check points
      const user = await db.get('SELECT points, early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;
      if (!user || user.points < price) {
        return res.status(400).json({ error: `Nepietiekams punktu skaits (nepieciešami ${price} punkti)` });
      }

      // Calculate new early access until
      let newEarlyAccessUntil = new Date();
      if (user.early_access_until) {
        const currentEarlyAccess = new Date(user.early_access_until);
        if (currentEarlyAccess > newEarlyAccessUntil) {
          newEarlyAccessUntil = currentEarlyAccess;
        }
      }
      // Add duration
      newEarlyAccessUntil.setHours(newEarlyAccessUntil.getHours() + durationHours);

      // Deduct points and update early access
      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE users SET points = points - ?, early_access_until = ? WHERE id = ?', [price, newEarlyAccessUntil.toISOString(), decoded.userId]);
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -price, `Agrā piekļuve (${durationHours}h)`]);
      });

      // Fetch updated user to return new points balance and early access
      const updatedUser = await db.get('SELECT points, early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;

      res.json({ 
        message: 'Agrā piekļuve veiksmīgi iegādāta', 
        points: updatedUser.points,
        early_access_until: updatedUser.early_access_until
      });
    } catch (error) {
      console.error("Error buying early access:", error);
      res.status(500).json({ error: 'Server error buying early access' });
    }
  });

  app.post("/api/wallet/deduct", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, reason } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number } | undefined;

      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, decoded.userId]);

      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number };
      res.json({ message: 'Funds deducted successfully', balance: updatedUser.balance });
    } catch (error) {
      console.error("Error deducting funds:", error);
      res.status(500).json({ error: 'Server error deducting funds' });
    }
  });

  // Admin API

  // Push notification endpoints
  app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidPublicKey });
  });

  app.post('/api/push/subscribe', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }
      await db.run(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?)
         ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [userId, endpoint, keys.p256dh, keys.auth]
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete('/api/push/unsubscribe', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const { endpoint } = req.body;
      await db.run(
        'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
        [userId, endpoint]
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT role FROM users WHERE id = ?', [decoded.userId]) as { role: string } | null;

      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users', []) as { count: number | string };
      const totalListings = await db.get('SELECT COUNT(*) as count FROM listings', []) as { count: number | string };
      const pendingReports = await db.get('SELECT COUNT(*) as count FROM reports WHERE status = ?', ['pending']) as { count: number | string };

      // Calculate total revenue from transactions (assuming we have a transactions table, or we can sum up wallet balances for now, or sum up ad payments)
      // For now, let's just sum up the balances of all users as a proxy for money in the system.
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

  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await db.all('SELECT id, email, name, role, created_at, balance FROM users ORDER BY created_at DESC', []);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Server error fetching users' });
    }
  });

  app.put("/api/admin/users/:id/role", isAdmin, async (req, res) => {
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

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: 'Server error deleting user' });
    }
  });

  app.get("/api/admin/listings", isAdmin, async (req, res) => {
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

  app.delete("/api/admin/listings/:id", isAdmin, async (req, res) => {
    try {
      await db.run('DELETE FROM listings WHERE id = ?', [req.params.id]);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error deleting listing' });
    }
  });

  // Reporting API
  app.post("/api/reports", async (req, res) => {
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

  app.get("/api/admin/reports", isAdmin, async (req, res) => {
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

  app.get("/api/admin/disputes", isAdmin, async (req, res) => {
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

  app.post("/api/admin/disputes/:id/resolve", isAdmin, async (req, res) => {
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

  // Omniva Shipping
  app.get('/api/shipping/omniva-locations', async (req, res) => {
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

  // B2B Stores Endpoints
  app.get('/api/stores/my', requireAuth, async (req, res) => {
    try {
      const userId = (req as any).userId;
      const store = await db.get('SELECT * FROM stores WHERE user_id = ?', [userId]);
      res.json(store || null);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get('/api/stores/:slug', async (req, res) => {
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

  app.get('/api/stores/by-user/:userId', async (req, res) => {
    try {
      const store = await db.get('SELECT * FROM stores WHERE user_id = ?', [req.params.userId]);
      if (!store) return res.status(404).json({ error: 'Nav veikala' });
      res.json(store);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post('/api/stores', requireAuth, async (req, res) => {
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

  // Ads Endpoints
  app.get("/api/admin/ads", isAdmin, async (req, res) => {
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

  app.post("/api/admin/ads", isAdmin, async (req, res) => {
    const { title, image_url, link_url, size, start_date, end_date, is_active, category } = req.body;
    try {
      const info = await db.run('INSERT INTO ads (title, image_url, link_url, size, start_date, end_date, is_active, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [title, image_url, link_url, size, start_date, end_date, is_active ? 1 : 0, category || null, 'approved']);
      res.json({ id: info.lastInsertRowid, message: 'Ad created successfully' });
    } catch (error) {
      console.error("Error creating ad:", error);
      res.status(500).json({ error: 'Server error creating ad' });
    }
  });

  app.put("/api/admin/ads/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, size, start_date, end_date, is_active, category, status } = req.body;
    try {
      await db.transaction(async (client) => {
        // Check if status changed to rejected
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

  app.delete("/api/admin/ads/:id", isAdmin, async (req, res) => {
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

  app.get("/api/admin/ads/:id/stats", isAdmin, async (req, res) => {
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
  app.get("/api/ads", async (req, res) => {
    try {
      const now = new Date().toISOString();
      // Fetch all active, approved ads that are within date range.
      // We'll shuffle them randomly on the backend.
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

  app.post("/api/ads/:id/view", async (req, res) => {
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

  app.post("/api/ads/:id/click", async (req, res) => {
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

  app.put("/api/admin/reports/:id", isAdmin, async (req, res) => {
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

  // Stripe Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
      const { amount, currency = 'eur' } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: 'Server error creating payment intent' });
    }
  });

  // Stripe Checkout Session
  app.post("/api/checkout/escrow", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { listingId, shippingMethod, shippingAddress } = req.body;

      const listing = await db.get('SELECT * FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id === decoded.userId) return res.status(400).json({ error: 'Cannot buy your own listing' });

      let finalPrice = listing.price;
      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};

      if (attributes.saleType === 'auction') {
        if (!attributes.auctionEndDate || new Date(attributes.auctionEndDate) > new Date()) {
          return res.status(400).json({ error: 'Auction has not ended yet' });
        }
        const highestBid = await db.get('SELECT user_id, amount FROM bids WHERE listing_id = ? ORDER BY amount DESC LIMIT 1', [listingId]) as any;
        if (!highestBid) {
          return res.status(400).json({ error: 'No bids on this auction' });
        }
        if (highestBid.user_id !== decoded.userId) {
          return res.status(403).json({ error: 'You are not the winner of this auction' });
        }
        finalPrice = highestBid.amount;
      }

      // Create order in pending state
      const result = await db.run(`
        INSERT INTO orders (listing_id, buyer_id, seller_id, amount, shipping_method, shipping_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [listingId, decoded.userId, listing.user_id, finalPrice, shippingMethod, shippingAddress]);
      
      const orderId = result.lastInsertRowid;

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Drošs pirkums: ${listing.title}`,
                description: `Piegāde: ${shippingMethod}`,
              },
              unit_amount: Math.round(finalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/profile?tab=orders&success=true&orderId=${orderId}`,
        cancel_url: `${process.env.APP_URL}/listing/${listingId}?canceled=true`,
        client_reference_id: decoded.userId.toString(),
        metadata: {
          type: 'escrow_purchase',
          orderId: String(orderId)
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating escrow checkout session:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/create-checkout-session", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, type = 'funds', planId, pointsAmount } = req.body;

      const stripe = getStripe();
      
      if (type === 'subscription') {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price: planId, // This should be a Stripe Price ID
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.APP_URL}/profile?success=true&type=subscription`,
          cancel_url: `${process.env.APP_URL}/profile?canceled=true`,
          client_reference_id: decoded.userId.toString(),
        });
        return res.json({ url: session.url });
      }

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: type === 'funds' ? 'Konta papildināšana' : 'Punktu iegāde',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/profile?success=true&amount=${amount}&type=${type}`,
        cancel_url: `${process.env.APP_URL}/profile?canceled=true`,
        client_reference_id: decoded.userId.toString(),
        metadata: {
          type: String(type),
          amount: String(type === 'points' ? pointsAmount : amount)
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: 'Server error creating checkout session' });
    }
  });

  // Notifications API
  app.get("/api/notifications", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      await db.run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, decoded.userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.put("/api/notifications/read-all", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      await db.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [decoded.userId]);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notifications:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is starting...`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start background task for auctions
    setInterval(checkEndedAuctions, 60 * 1000); // Check every minute
    checkEndedAuctions(); // Run once on startup
  });

  async function checkEndedAuctions() {
    try {
      // Find all active listings
      const activeListings = await db.all("SELECT id, user_id, title, attributes FROM listings WHERE status = 'active'", []) as any[];

      const now = new Date();

      for (const listing of activeListings) {
        if (!listing.attributes) continue;

        try {
          const attributes = JSON.parse(listing.attributes);
          if (attributes.saleType === 'auction' && attributes.auctionEndDate) {
            const endDate = new Date(attributes.auctionEndDate);

            if (endDate <= now) {
              // Auction has ended
              console.log(`Auction ${listing.id} has ended. Processing...`);

              // Get highest bid
              const highestBid = await db.get(`
                SELECT b.id, b.user_id, b.amount, u.name as bidder_name
                FROM bids b
                JOIN users u ON b.user_id = u.id
                WHERE b.listing_id = ?
                ORDER BY b.amount DESC LIMIT 1
              `, [listing.id]) as any;

              if (highestBid) {
                // Update listing status to sold
                await db.run("UPDATE listings SET status = 'sold' WHERE id = ?", [listing.id]);

                // Notify winner
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_won', 'Apsveicam! Jūs uzvarējāt izsolē', ?, ?)
                `, [
                  highestBid.user_id,
                  `Jūs uzvarējāt izsolē "${listing.title}" ar solījumu €${highestBid.amount}.`,
                  `/listing/${listing.id}`
                ]);

                // Notify seller
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_ended', 'Jūsu izsole ir noslēgusies', ?, ?)
                `, [
                  listing.user_id,
                  `Izsole "${listing.title}" ir noslēgusies. Uzvarētājs: ${highestBid.bidder_name} ar solījumu €${highestBid.amount}.`,
                  `/listing/${listing.id}`
                ]);

                // Emit real-time update
                io.emit('auction_ended', {
                  listingId: listing.id,
                  winnerId: highestBid.user_id,
                  amount: highestBid.amount
                });

              } else {
                // Update listing status to expired
                await db.run("UPDATE listings SET status = 'expired' WHERE id = ?", [listing.id]);

                // Notify seller
                await db.run(`
                  INSERT INTO notifications (user_id, type, title, message, link)
                  VALUES (?, 'auction_ended', 'Jūsu izsole ir noslēgusies bez solījumiem', ?, ?)
                `, [
                  listing.user_id,
                  `Izsole "${listing.title}" ir noslēgusies, bet neviens neveica solījumus.`,
                  `/listing/${listing.id}`
                ]);

                // Emit real-time update
                io.emit('auction_ended', {
                  listingId: listing.id,
                  winnerId: null,
                  amount: null
                });
              }
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    } catch (error) {
      console.error('Error checking ended auctions:', error);
    }
  }
}

console.log("Initializing server...");
startServer().catch(err => {
  console.error("Failed to start server:", err);
});
