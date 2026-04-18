import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./server/pg";
import { GoogleGenAI } from "@google/genai";
import twilio from "twilio";
import multer from "multer";
import fs from "fs";
import Stripe from "stripe";
import { uploadImage, uploadVideo, uploadChatImage } from './server/services/cloudinary';
import { sendEmail, emailTemplates } from './server/services/email';
import { cached, invalidate, invalidatePattern, TTL, checkRateLimit } from './server/services/redis';
import { sendPushToUser, vapidPublicKey } from './server/services/push';
import { initSearchIndex, syncListing, removeListing, searchListings } from './server/services/search';
import { Server as SocketIOServer } from "socket.io";
import http from "http";

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

const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;
  const httpServer = http.createServer(app);
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
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

  // File Upload Route
  app.post('/api/upload', upload.single('image'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadImage(req.file.buffer, { folder: 'listings' });
      res.json({ url: result.url });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/api/upload/chat-image', upload.single('image'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadChatImage(req.file.buffer);
      res.json({ url: result.url });
    } catch (error) {
      console.error('Chat upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  app.post('/api/upload/multiple', upload.array('images', 10), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploads = await Promise.all(
        req.files.map(file => uploadImage(file.buffer, { folder: 'listings' }))
      );
      res.json({ urls: uploads.map(u => u.url) });
    } catch (error) {
      console.error('Multiple upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  const videoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('video/')) cb(null, true);
      else cb(new Error('Only video files are allowed'));
    }
  });

  app.post('/api/upload/video', videoUpload.single('video'), async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No token' });
    try {
      jwt.verify(token, JWT_SECRET);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const result = await uploadVideo(req.file.buffer, { folder: 'videos' });
      res.json({ videoUrl: result.url });
    } catch (error) {
      console.error('Video upload error:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth Routes
  app.post("/api/auth/request-otp", async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
      console.warn("Twilio is not configured. Simulating OTP sent.");
      return res.json({ message: 'OTP sent (simulated)', simulated: true });
    }

    try {
      await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: 'sms' });
      res.json({ message: 'OTP sent successfully' });
    } catch (error: any) {
      console.error("Twilio error:", error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    const { phone, code, name, user_type } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code are required' });

    let isValid = false;

    if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
      // Development fallback
      isValid = code === '123456';
    } else {
      try {
        const verification = await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: phone, code });
        isValid = verification.status === 'approved';
      } catch (error) {
        console.error("Twilio verification error:", error);
        return res.status(500).json({ error: 'Failed to verify OTP' });
      }
    }

    if (!isValid) return res.status(400).json({ error: 'Invalid OTP code' });

    try {
      let user = await db.get('SELECT * FROM users WHERE phone = ?', [phone]) as any;

      if (!user) {
        // Create new user via phone
        const email = `${phone.replace(/\+/g, '')}@phone.local`; // Dummy email for schema
        const hash = await bcrypt.hash(Math.random().toString(36), 10); // Dummy password
        const role = (phone === '29469877' || phone === '+37129469877') ? 'admin' : 'user';
        const info = await db.run('INSERT INTO users (email, password_hash, name, phone, user_type, role) VALUES (?, ?, ?, ?, ?, ?)', [email, hash, name || 'User', phone, user_type || 'c2c', role]);
        user = { id: info.lastInsertRowid, email, name: name || 'User', phone, role, user_type: user_type || 'c2c', is_verified: 0, points: 0 };
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role, user_type: user.user_type, is_verified: user.is_verified, points: user.points } });
    } catch (error) {
      console.error("Error creating/logging in user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/auth/smart-id/register/init", async (req, res) => {
    const { personalCode, country, name, user_type, company_name, company_reg_number, company_vat } = req.body;
    if (!personalCode || !country || !name) return res.status(400).json({ error: 'Personal code, country and name required' });

    // Simulate Smart-ID registration initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    // Store registration data in a temporary map or just pass it back/forth (for simulation, we'll just trust the client in status)
    res.json({ sessionId, verificationCode, message: 'Registration initiated' });
  });

  app.post("/api/auth/smart-id/register/status", async (req, res) => {
    const { sessionId, personalCode, name, user_type, company_name, company_reg_number, company_vat } = req.body;
    if (!sessionId || !personalCode) return res.status(400).json({ error: 'Session ID and personal code required' });

    try {
      const email = `${personalCode}@smartid.local`;
      let user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as any;

      if (!user) {
        const hash = await bcrypt.hash(Math.random().toString(36), 10);
        const uType = user_type === 'b2b' ? 'b2b' : 'c2c';
        const info = await db.run('INSERT INTO users (email, password_hash, name, user_type, role, is_verified, company_name, company_reg_number, company_vat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [email, hash, name, uType, 'user', 1, company_name || null, company_reg_number || null, company_vat || null]);
        user = { id: info.lastInsertRowid, email, name, user_type: uType, role: 'user', is_verified: 1, points: 0, company_name, company_reg_number, company_vat };
      } else {
        // If user already exists, just log them in
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      checkAndAwardBadges(user.id as number).catch(e => console.error('[badges]', e));
      res.json({ status: 'OK', token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, user_type: user.user_type, role: user.role, points: user.points, early_access_until: user.early_access_until, company_name: user.company_name, company_reg_number: user.company_reg_number, company_vat: user.company_vat, is_verified: user.is_verified } });
    } catch (error) {
      console.error("Smart-ID register error:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/auth/smart-id/login/init", async (req, res) => {
    const { personalCode, country } = req.body;
    if (!personalCode || !country) return res.status(400).json({ error: 'Personal code and country required' });

    // Simulate Smart-ID login initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    res.json({ sessionId, verificationCode, message: 'Login initiated' });
  });

  app.post("/api/auth/smart-id/login/status", async (req, res) => {
    const { sessionId, personalCode } = req.body;
    if (!sessionId || !personalCode) return res.status(400).json({ error: 'Session ID and personal code required' });

    // Simulate successful Smart-ID login
    try {
      // Create a dummy email based on personal code if user doesn't exist
      const email = `${personalCode}@smartid.local`;
      let user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as any;

      if (!user) {
        const hash = await bcrypt.hash(Math.random().toString(36), 10);
        const info = await db.run('INSERT INTO users (email, password_hash, name, user_type, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)', [email, hash, `User ${personalCode}`, 'c2c', 'user', 1]);
        user = { id: info.lastInsertRowid, email, name: `User ${personalCode}`, user_type: 'c2c', role: 'user', is_verified: 1, points: 0 };
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ status: 'OK', token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, user_type: user.user_type, role: user.role, points: user.points, early_access_until: user.early_access_until, company_name: user.company_name, company_reg_number: user.company_reg_number, company_vat: user.company_vat, is_verified: user.is_verified } });
    } catch (error) {
      console.error("Smart-ID login error:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/auth/smart-id/init", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { personalCode, country } = req.body;
      
      if (!personalCode || !country) return res.status(400).json({ error: 'Personal code and country required' });

      // In a real scenario, we would call Dokobit/Smart-ID API here.
      // For this implementation, we simulate the asynchronous flow.
      const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
      const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code to show to user

      res.json({ sessionId, verificationCode, message: 'Verification initiated' });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post("/api/auth/smart-id/status", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { sessionId } = req.body;
      
      if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

      // Simulate polling result. In real life, check Dokobit API status.
      // We'll just approve it immediately for the MVP demo.
      
      // Update user as verified and add 300 points
      const user = await db.get('SELECT is_verified FROM users WHERE id = ?', [decoded.userId]) as any;

      if (!user.is_verified) {
        await db.run('UPDATE users SET is_verified = 1, points = points + 300 WHERE id = ?', [decoded.userId]);
        await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, 300, 'Smart-ID Verification']);
      }

      res.json({ status: 'OK', message: 'Successfully verified' });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name, phone, user_type, company_name, company_reg_number, company_vat } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const role = email === 'valdis.nipers@gmail.com' ? 'admin' : 'user';
      const uType = user_type === 'b2b' ? 'b2b' : 'c2c';
      const info = await db.run('INSERT INTO users (email, password_hash, name, phone, user_type, role, company_name, company_reg_number, company_vat, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [email, hash, name, phone || null, uType, role, company_name || null, company_reg_number || null, company_vat || null, 50]);

      const userId = info.lastInsertRowid;
      await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [userId, 50, 'Reģistrācijas bonuss']);

      const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: info.lastInsertRowid, email, name, phone, user_type: uType, role, points: 50, early_access_until: null, company_name, company_reg_number, company_vat, is_verified: 0 } });
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Server error' });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]) as any;
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, user_type: user.user_type, role: user.role, points: user.points, early_access_until: user.early_access_until, company_name: user.company_name, company_reg_number: user.company_reg_number, company_vat: user.company_vat, is_verified: user.is_verified } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat FROM users WHERE id = ?', [decoded.userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // User Profile Routes
  app.get("/api/users/me/analytics", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      // Get total views of user's listings
      const viewsResult = await db.get('SELECT SUM(views) as total_views FROM listings WHERE user_id = ?', [decoded.userId]) as { total_views: number | null };

      // Get total favorites
      const favoritesResult = await db.get(`
        SELECT COUNT(*) as total_favorites
        FROM favorites f
        JOIN listings l ON f.listing_id = l.id
        WHERE l.user_id = ?
      `, [decoded.userId]) as { total_favorites: number };

      // Get total messages received for their listings
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

  app.post("/api/users/:id/follow", async (req, res) => {
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

  app.delete("/api/users/:id/follow", async (req, res) => {
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

  app.get("/api/users/:id/follow-status", async (req, res) => {
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

  app.get("/api/users/me/following/listings", async (req, res) => {
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

  app.get("/api/users/me/orders/bought", async (req, res) => {
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

  app.get("/api/users/me/orders/sold", async (req, res) => {
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

  app.get("/api/users/me/listings", async (req, res) => {
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

  app.get("/api/users/me/favorites", async (req, res) => {
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

  // Favorites Routes
  app.post("/api/favorites/:id", async (req, res) => {
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

  app.delete("/api/favorites/:id", async (req, res) => {
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

  app.get("/api/users/me/saved-searches", async (req, res) => {
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

  app.post("/api/users/me/saved-searches", async (req, res) => {
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

  app.delete("/api/users/me/saved-searches/:id", async (req, res) => {
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

  app.get("/api/users/me/notifications", async (req, res) => {
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

  app.put("/api/users/me/notifications/:id/read", async (req, res) => {
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

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await db.get('SELECT id, name, created_at FROM users WHERE id = ?', [req.params.id]) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Reviews Routes
  app.get("/api/users/:id/reviews", async (req, res) => {
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

  app.post("/api/users/:id/reviews", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const sellerId = req.params.id;
      const { rating, comment, orderId } = req.body;

      if (decoded.userId.toString() === sellerId) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      if (!orderId) {
        return res.status(400).json({ error: 'Order ID is required to leave a review' });
      }

      // Verify that the user actually bought from this seller and the order is completed
      const order = await db.get('SELECT * FROM orders WHERE id = ? AND buyer_id = ? AND seller_id = ? AND status = ?', [orderId, decoded.userId, sellerId, 'completed']);

      if (!order) {
        return res.status(403).json({ error: 'You can only review sellers after a completed purchase' });
      }

      // Check if a review already exists for this order
      const existingReview = await db.get('SELECT id FROM reviews WHERE order_id = ?', [orderId]);
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this order' });
      }

      const info = await db.run('INSERT INTO reviews (reviewer_id, seller_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [decoded.userId, sellerId, orderId, rating, comment]);

      res.json({ id: info.lastInsertRowid, message: 'Review added successfully' });
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Listings Routes
  async function hasEarlyAccess(req: any): Promise<{ hasAccess: boolean, userId: number | null }> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return { hasAccess: false, userId: null };
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;
      if (user && user.early_access_until) {
        const earlyAccessUntil = new Date(user.early_access_until);
        if (earlyAccessUntil > new Date()) {
          return { hasAccess: true, userId: decoded.userId };
        }
      }
      return { hasAccess: false, userId: decoded.userId };
    } catch (e) {
      return { hasAccess: false, userId: null };
    }
  }

  app.get("/api/listings/search", async (req, res) => {
    try {
      const { q: query, category, subcategory, minPrice, maxPrice, sort, location, listingType } = req.query;
      if (!query) return res.json([]);

      const { hasAccess, userId } = await hasEarlyAccess(req);

      const filter: string[] = ['status = "active"'];
      if (category) filter.push(`category = "${(category as string).replace(/"/g, '\\"')}"`);
      if (subcategory) filter.push(`subcategory = "${(subcategory as string).replace(/"/g, '\\"')}"`);
      if (listingType && listingType !== 'all') filter.push(`listing_type = "${listingType}"`);
      if (minPrice) filter.push(`price >= ${Number(minPrice)}`);
      if (maxPrice) filter.push(`price <= ${Number(maxPrice)}`);

      const sortArr: string[] = [];
      if (sort === 'price_asc') sortArr.push('price:asc');
      else if (sort === 'price_desc') sortArr.push('price:desc');
      else sortArr.push('created_at:desc');

      let hits = await searchListings({ q: query as string, filter, sort: sortArr });

      // Early access filter: hide listings < 15 min old (except user's own)
      if (!hasAccess) {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        hits = hits.filter(h => {
          if (userId && h.user_id === userId) return true;
          return h.created_at <= fifteenMinAgo;
        });
      }

      // Location partial match (post-filter)
      if (location) {
        const loc = (location as string).toLowerCase();
        hits = hits.filter(h => h.location?.toLowerCase().includes(loc));
      }

      res.json(hits);
    } catch (error) {
      console.error("Error searching listings:", error);
      res.status(500).json({ error: 'Server error searching listings' });
    }
  });

  app.get("/api/listings", async (req, res) => {
    try {
      const { category, subcategory, minPrice, maxPrice, sort, location, listingType, lat, lng, radius, ...restQuery } = req.query;
      const { hasAccess, userId } = await hasEarlyAccess(req);

      let query = `
        SELECT listings.*, users.name as author_name 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (!hasAccess) {
        if (userId) {
          query += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          query += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }
      if (subcategory) {
        query += ` AND (attributes::json)->>'subcategory' = ?`;
        params.push(subcategory);
      }
      if (listingType && listingType !== 'all') {
        query += ` AND listing_type = ?`;
        params.push(listingType);
      }
      if (minPrice) {
        query += ` AND price >= ?`;
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        query += ` AND price <= ?`;
        params.push(Number(maxPrice));
      }
      if (location) {
        query += ` AND location ILIKE ?`;
        params.push(`%${location}%`);
      }
      if (lat && lng && radius) {
        const latF = parseFloat(lat as string);
        const lngF = parseFloat(lng as string);
        const radiusKm = parseFloat(radius as string);
        const latDelta = radiusKm / 111.0;
        const lngDelta = radiusKm / (111.0 * Math.cos(latF * Math.PI / 180));
        query += ` AND lat BETWEEN ${latF - latDelta} AND ${latF + latDelta}`;
        query += ` AND lng BETWEEN ${lngF - lngDelta} AND ${lngF + lngDelta}`;
      }

      // Handle dynamic attribute filters
      for (const [key, value] of Object.entries(restQuery)) {
        if (key.startsWith('attr_') && value) {
          const attrName = key.replace('attr_', '');
          query += ` AND (attributes::json)->>? = ?`;
          params.push(attrName, value);
        }
      }

      if (sort === 'price_asc') {
        query += ` ORDER BY listings.is_highlighted DESC, listings.price ASC`;
      } else if (sort === 'price_desc') {
        query += ` ORDER BY listings.is_highlighted DESC, listings.price DESC`;
      } else {
        query += ` ORDER BY listings.is_highlighted DESC, listings.created_at DESC`;
      }

      const listings = await db.all(query, params);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const { hasAccess, userId } = await hasEarlyAccess(req);
      
      let sql = `
        SELECT listings.*, users.name as author_name, users.email as author_email 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE listings.id = ?
      `;
      const params: any[] = [req.params.id];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      const listing = await db.get(sql, params);
      
      if (!listing) return res.status(404).json({ error: 'Listing not found or not available yet' });
      res.json(listing);
    } catch (error) {
      console.error("Error fetching listing:", error);
      res.status(500).json({ error: 'Server error fetching listing' });
    }
  });

  app.post("/api/generate-description", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      jwt.verify(token, JWT_SECRET); // just verify they are logged in
      const { category, title, ...attributes } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let attributesText = '';
      for (const [key, value] of Object.entries(attributes)) {
        if (value) {
          attributesText += `${key}: ${value}\n`;
        }
      }

      const prompt = `Izveido profesionālu, pievilcīgu un strukturētu pārdošanas aprakstu latviešu valodā šādam sludinājumam:
      Kategorija: ${category}
      Virsraksts: ${title || 'Nav norādīts'}
      
      Detaļas:
      ${attributesText || 'Nav norādītas papildus detaļas'}
      
      Aprakstam jābūt pārliecinošam, viegli lasāmam un jāizceļ preces priekšrocības. Nelieto pārāk garus ievadus, uzreiz ķeries pie lietas.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      res.json({ description: response.text });
    } catch (error) {
      console.error("Error generating description:", error);
      res.status(500).json({ error: 'Server error generating description' });
    }
  });

  app.post("/api/recommend-price", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const { category, title, attributes } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let attributesText = '';
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          if (value) {
            attributesText += `${key}: ${value}\n`;
          }
        }
      }

      const prompt = `Kā eksperts tirgus analītiķis, iesaki reālistisku pārdošanas cenu (eiro) šādam sludinājumam Latvijas tirgū.
      Kategorija: ${category}
      Virsraksts: ${title}
      Parametri:
      ${attributesText}
      
      Atgriez TIKAI skaitli (piemēram, 15000 vai 250). Nekādu papildu tekstu vai paskaidrojumu.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const recommendedPrice = parseInt(response.text?.replace(/[^0-9]/g, '') || '0', 10);
      
      res.json({ price: recommendedPrice });
    } catch (error) {
      console.error("Error recommending price:", error);
      res.status(500).json({ error: 'Server error recommending price' });
    }
  });

  app.post("/api/ai/generate-listing", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'No image URL provided' });
      }

      // Fetch the image from the local server or external URL
      let imageBuffer: Buffer;
      let mimeType = 'image/jpeg';
      
      if (imageUrl.startsWith('http')) {
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error('Failed to fetch image');
        const arrayBuffer = await imageRes.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
      } else {
        // Local file
        const filename = imageUrl.split('/').pop();
        const filePath = path.join(uploadsDir, filename);
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Image not found' });
        }
        imageBuffer = fs.readFileSync(filePath);
        mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString("base64"),
          mimeType: mimeType
        }
      };

      const prompt = `Analyze this image and generate a listing for a marketplace in Latvia.
      Return a JSON object with the following fields:
      - title: A catchy, descriptive title in Latvian.
      - description: A detailed description in Latvian.
      - category: One of the following categories: 'vehicles', 'real-estate', 'electronics', 'home', 'fashion', 'services', 'other'.
      - price: A realistic estimated price in EUR (number only).
      
      Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, imagePart],
      });

      let jsonText = response.text || "{}";
      if (jsonText.startsWith('\`\`\`json')) {
        jsonText = jsonText.replace(/\`\`\`json\n?/, '').replace(/\`\`\`$/, '');
      } else if (jsonText.startsWith('\`\`\`')) {
        jsonText = jsonText.replace(/\`\`\`\n?/, '').replace(/\`\`\`$/, '');
      }

      const listingData = JSON.parse(jsonText);
      res.json(listingData);
    } catch (error) {
      console.error("Error generating listing from image:", error);
      res.status(500).json({ error: 'Server error generating listing' });
    }
  });

  app.post("/api/ai/decode-vin", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const { vin } = req.body;
      if (!vin || vin.length !== 17) {
        return res.status(400).json({ error: 'Nepareizs VIN numurs (jābūt 17 simboliem)' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `You are an automotive expert. Decode this VIN number: ${vin}

Return ONLY a valid JSON object with these fields:
{
  "make": "car brand",
  "model": "car model",
  "year": 2020,
  "bodyType": "Sedans|Universāls|Apvidus (SUV)|Hečbeks|Kupeja|Minivens|Pikaps|Cits",
  "engine": "e.g. 2.0 TDI",
  "engineCc": 1968,
  "powerKw": 110,
  "fuelType": "Dīzelis|Benzīns|Elektriskais|Hibrīds (PHEV)|Hibrīds (HEV)|Gāze (LPG)|Gāze (CNG)",
  "transmission": "Automāts|Manuāla|Robots (DSG/CVT)",
  "drive": "Priekšas (FWD)|Aizmugures (RWD)|Pilnpiedziņa (4x4/AWD)",
  "doors": 4,
  "seats": 5,
  "equipment": ["list of standard and common optional equipment for this specific model/trim"],
  "confidence": "high|medium|low"
}

For equipment array, include all standard and typical optional features for this specific variant in Latvian. Use these exact names where applicable:
Safety: "ABS", "ESP (stabilitātes kontrole)", "Priekšējais gaisa spilvens", "Sānu gaisa spilveni", "Galvas gaisa spilveni", "Joslu maiņas brīdinājums", "Akls punkts (BSD)", "Aizmugures satiksmes brīdinājums", "Avārijas bremzēšana (AEB)", "Adaptīvais kruīza kontrols", "Joslas turēšanas asistents", "Noguruma brīdinājums", "Naktsvīzija", "Imobilaizers", "Centrālā slēdzene"
Comfort: "Gaisa kondicionēšana", "Klimata kontrole (1 zona)", "Klimata kontrole (2 zonas)", "Sēdekļu apsilde priekšā", "Sēdekļu apsilde aizmugurē", "Sēdekļu ventilācija", "Elektriski regulējami sēdekļi", "Masāžas sēdekļi", "Ādas sēdekļi", "Panorāmas jumts", "Elektrisks aizmugures bagāžnieks", "Bezkontakta atslēga (Keyless)", "Start/Stop sistēma", "Apkures apsilde (Webasto)", "Stūres apsilde", "Vējstikla apsilde", "Parkošanās sensori priekšā", "Parkošanās sensori aizmugurē", "Atpakaļgaitas kamera", "360° kamera", "Automātiskā stāvvieta", "Kruīza kontrols", "Adaptīvais kruīza kontrols", "Elektriski regulējami spoguļi", "Elektriski salocāmi spoguļi", "Augstuma regulēšana (pnevmatiskā)", "Pievares kontrole"
Multimedia: "AM/FM Radio", "CD/DVD atskaņotājs", "Iebūvētā navigācija", "Apple CarPlay", "Android Auto", "Bluetooth", "Brīvroku komplekts", "USB ports", "Induktīvā uzlāde", "Heads-Up displejs (HUD)", "Premium skaļruņu sistēma", "Digitālais radio (DAB+)", "Wi-Fi hotspot", "Aizmugures izklaides sistēma"
Exterior: "Leģēta riteņu diski", "17\" diski", "18\" diski", "19\"+ diski", "Panorāmas jumts", "Jumta stieņi", "Piekabes āķis", "LED priekšējie lukturi", "Matrix LED lukturi", "Adaptīvie lukturi", "Xenon lukturi", "Miglas lukturi", "Tonēti stikli", "Rezerves ritenis", "Riepu spiediena kontrole (TPMS)", "Ziemas riepu komplekts"

Return ONLY valid JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let jsonText = response.text || "{}";
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const vinData = JSON.parse(jsonText);
      res.json(vinData);
    } catch (error) {
      console.error("VIN decode error:", error);
      res.status(500).json({ error: 'Neizdevās atšifrēt VIN numuru' });
    }
  });

  async function moderateListing(listingId: number | bigint, title: string, description: string, price: number) {
    try {
      if (!process.env.GEMINI_API_KEY) return;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Esi pieredzējis sludinājumu portāla moderators un krāpniecības apkarošanas eksperts. Analizē šo sludinājumu un sniedz detalizētu drošības novērtējumu.
      
      Virsraksts: ${title}
      Apraksts: ${description}
      Cena: ${price} EUR
      
      Pārbaudi šādus riskus:
      1. Krāpniecības pazīmes (pārāk zema cena, aizdomīgi kontakti, steidzamība).
      2. Phishing saites vai aizdomīgi ārējie resursi.
      3. Aizliegts saturs (narkotikas, ieroči, lamuvārdi, naida runa).
      4. Neadekvāta cena attiecībā pret aprakstīto preci.
      5. Maldinoša informācija.
      
      Atbildi TIKAI JSON formātā:
      {
        "isFlagged": boolean,
        "reason": "īss, profesionāls paskaidrojums latviešu valodā",
        "trustScore": number (0-100, kur 100 ir pilnīgi drošs),
        "status": "approved" | "flagged" | "pending_review"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
      const result = JSON.parse(resultText);

      // Update database with AI results
      await db.run(`
        UPDATE listings
        SET ai_trust_score = ?,
            ai_moderation_status = ?,
            ai_moderation_reason = ?,
            status = CASE WHEN ? = 'flagged' THEN 'flagged' ELSE status END
        WHERE id = ?
      `, [
        result.trustScore || 100,
        result.status || 'approved',
        result.reason || null,
        result.status,
        listingId
      ]);

      if (result.isFlagged || result.status === 'flagged') {
        console.log(`[AI MODERATION] Listing ${listingId} flagged. Reason: ${result.reason}`);

        // Add to reports table for admin review
        await db.run(`
          INSERT INTO reports (reporter_id, listing_id, reason, status)
          VALUES (1, ?, ?, 'pending')
        `, [listingId, `AI Moderācija: ${result.reason} (Uzticamība: ${result.trustScore}%)`]);
      }
    } catch (error) {
      console.error("Error in AI moderation:", error);
    }
  }

  app.post("/api/listings", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, listing_type, exchange_for, video_url } = req.body;

      if (!title || price === undefined || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const info = await db.run('INSERT INTO listings (user_id, title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, listing_type, exchange_for, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [decoded.userId, title, description, price, category, image_url, attributes ? JSON.stringify(attributes) : null, location || null, is_auction ? 1 : 0, auction_end_date || null, listing_type || 'sale', exchange_for || null, video_url || null]);

      const listingId = info.lastInsertRowid;

      // Reward user with 50 points for posting a listing
      try {
        await db.run('UPDATE users SET points = points + 50 WHERE id = ?', [decoded.userId]);
        await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, 50, 'Sludinājuma pievienošana']);
      } catch (pointsError) {
        console.error("Error rewarding points for listing:", pointsError);
      }

      // Check saved searches and notify users asynchronously
      setTimeout(() => {
        checkSavedSearchesAndNotify(listingId as number, { title, price, category, attributes }).catch(e => console.error('[saved-search-notify]', e));
      }, 0);

      // Run AI moderation asynchronously
      setTimeout(() => {
        moderateListing(listingId as number, title, description, price).catch(e => console.error('[moderate-listing]', e));
      }, 0);

      // Geocode location asynchronously
      if (location) {
        geocodeLocation(location).then(async coords => {
          if (coords) {
            await db.run('UPDATE listings SET lat = ?, lng = ? WHERE id = ?', [coords.lat, coords.lng, listingId]);
          }
        }).catch(e => console.error('[geocode]', e));
      }

      // Sync to Meilisearch
      if (process.env.MEILISEARCH_HOST) {
        const author = await db.get<{ name: string; username: string }>(
          'SELECT name, username FROM users WHERE id = ?', [decoded.userId]
        );
        syncListing({
          id: Number(info.lastInsertRowid),
          user_id: decoded.userId,
          title,
          description: description || '',
          price: Number(price),
          category,
          subcategory: (attributes && typeof attributes === 'object' ? (attributes as any).subcategory : null) || null,
          listing_type: listing_type || 'sale',
          status: 'active',
          location: location || null,
          image_url: image_url || null,
          author_name: author?.name || author?.username || '',
          created_at: new Date().toISOString(),
          lat: null,
          lng: null,
        }).catch(e => console.error('[SEARCH SYNC CREATE]', e));
      }

      invalidatePattern('listings:home:*').catch(e => console.error('Cache invalidation error:', e));
      res.json({ id: listingId, message: 'Listing created successfully' });
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: 'Server error while creating listing' });
    }
  });

  async function checkSavedSearchesAndNotify(listingId: number | bigint, listingData: any) {
    try {
      const savedSearches = await db.all('SELECT * FROM saved_searches', []) as any[];

      for (const search of savedSearches) {
        let match = true;

        if (search.category && search.category !== listingData.category) {
          match = false;
        }

        if (match && search.min_price && listingData.price < search.min_price) {
          match = false;
        }

        if (match && search.max_price && listingData.price > search.max_price) {
          match = false;
        }

        if (match && search.query && !listingData.title.toLowerCase().includes(search.query.toLowerCase())) {
          match = false;
        }

        // We could add more complex attribute matching here

        if (match) {
          // Send notification
          await db.run(`
            INSERT INTO notifications (user_id, type, title, message, link)
            VALUES (?, 'saved_search_match', 'Jauns sludinājums jūsu meklējumam', ?, ?)
          `, [
            search.user_id,
            `Atrasts jauns sludinājums "${listingData.title}" par €${listingData.price}.`,
            `/listing/${listingId}`
          ]);

          const user = await db.get('SELECT email, name FROM users WHERE id = ?', [search.user_id]) as any;
          if (user?.email) {
            const tmpl = emailTemplates.newListingMatch(user.name || user.username, listingData.title, Number(listingData.price), Number(listingId));
            sendEmail(user.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
          }
        }
      }
    } catch (error) {
      console.error("Error checking saved searches:", error);
    }
  }

  app.post("/api/listings/:id/highlight", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      // Verify ownership
      const listing = await db.get('SELECT user_id, is_highlighted FROM listings WHERE id = ?', [listingId]) as any;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (listing.is_highlighted) return res.status(400).json({ error: 'Listing is already highlighted' });

      // Check points
      const user = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as any;
      if (!user || user.points < 100) {
        return res.status(400).json({ error: 'Nepietiekams punktu skaits (nepieciešami 100 punkti)' });
      }

      // Deduct points and highlight
      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE users SET points = points - 100 WHERE id = ?', [decoded.userId]);
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -100, `Sludinājuma #${listingId} izcelšana`]);
        await db.clientRun(client, 'UPDATE listings SET is_highlighted = 1 WHERE id = ?', [listingId]);
      });

      // Fetch updated user to return new points balance
      const updatedUser = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as any;

      res.json({ message: 'Sludinājums izcelts veiksmīgi', points: updatedUser.points });
    } catch (error) {
      console.error("Error highlighting listing:", error);
      res.status(500).json({ error: 'Server error highlighting listing' });
    }
  });

  app.delete("/api/listings/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      // Verify ownership
      const listing = await db.get('SELECT user_id FROM listings WHERE id = ?', [listingId]) as { user_id: number } | undefined;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to delete this listing' });

      await db.run('DELETE FROM listings WHERE id = ?', [listingId]);
      if (process.env.MEILISEARCH_HOST) {
        removeListing(Number(listingId)).catch(e => console.error('[SEARCH SYNC DELETE]', e));
      }
      invalidatePattern('listings:home:*').catch(e => console.error('Cache invalidation error:', e));
      invalidate(`listing:${listingId}`).catch(e => console.error('Cache invalidation error:', e));
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error while deleting listing' });
    }
  });

  // Messaging API
  app.get("/api/messages/unread-count", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      const result = await db.get(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE receiver_id = ? AND is_read = 0
      `, [userId]) as { count: number | string };

      res.json({ count: Number(result.count) });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: 'Server error fetching unread count' });
    }
  });

  app.get("/api/messages/conversations", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      // Get latest message for each conversation
      const conversations = await db.all(`
        SELECT
          m.id,
          CASE WHEN m.content = '' AND m.image_url IS NOT NULL THEN 'Attēls' ELSE m.content END as lastMessage,
          m.created_at as time, m.is_read,
          CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
          u.name as other_user_name,
          l.id as listing_id, l.title as item,
          (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = other_user_id AND is_read = 0) as unread
        FROM messages m
        JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        LEFT JOIN listings l ON m.listing_id = l.id
        WHERE m.id IN (
          SELECT MAX(id)
          FROM messages
          WHERE sender_id = ? OR receiver_id = ?
          GROUP BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END, listing_id
        )
        ORDER BY m.created_at DESC
      `, [userId, userId, userId, userId, userId, userId]);

      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: 'Server error fetching conversations' });
    }
  });

  app.get("/api/messages/:otherUserId", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;
      const otherUserId = req.params.otherUserId;
      const listingId = req.query.listingId;

      let query = `
        SELECT m.*,
          CASE WHEN m.sender_id = ? THEN 'me' ELSE 'other' END as sender,
          o.amount as offer_amount, o.status as offer_status
        FROM messages m
        LEFT JOIN offers o ON m.offer_id = o.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
      `;
      const params: any[] = [userId, userId, otherUserId, otherUserId, userId];

      if (listingId) {
        query += ` AND m.listing_id = ?`;
        params.push(listingId);
      }

      query += ` ORDER BY m.created_at ASC`;

      const messages = await db.all(query, params);

      // Mark as read
      let updateQuery = `UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?`;
      let updateParams: any[] = [userId, otherUserId];
      if (listingId) {
        updateQuery += ` AND listing_id = ?`;
        updateParams.push(listingId);
      }
      await db.run(updateQuery, updateParams);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: 'Server error fetching messages' });
    }
  });

  app.post("/api/messages", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const senderId = decoded.userId;
      const { receiverId, listingId, content, image_url } = req.body;

      if (!receiverId || (!content && !image_url)) {
        return res.status(400).json({ error: 'Receiver and content or image are required' });
      }

      let isPhishingWarning = 0;
      let systemWarning = null;

      // Phishing check
      if (content && process.env.GEMINI_API_KEY) {
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const prompt = `Analyze this chat message for phishing or scams in a marketplace context.
          Message: "${content}"
          
          Respond ONLY with JSON:
          {
            "action": "allow" | "block" | "warn",
            "reason": "If warn or block, explain briefly in Latvian why."
          }
          
          Block if it contains obvious fake courier links (e.g. DPD/Omniva fake links).
          Warn if it asks to transfer money in advance ("pārskaiti avansu", "drošības nauda").
          Allow otherwise.`;

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });

          const resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
          const result = JSON.parse(resultText);

          if (result.action === 'block') {
            return res.status(400).json({ error: 'Ziņa bloķēta drošības apsvērumu dēļ: ' + result.reason });
          } else if (result.action === 'warn') {
            isPhishingWarning = 1;
            systemWarning = result.reason;
          }
        } catch (aiError) {
          console.error("AI Phishing check error:", aiError);
        }
      }

      const info = await db.run('INSERT INTO messages (sender_id, receiver_id, listing_id, content, image_url, is_phishing_warning, system_warning) VALUES (?, ?, ?, ?, ?, ?, ?)', [senderId, receiverId, listingId || null, content || '', image_url || null, isPhishingWarning, systemWarning]);

      const message = await db.get(`
        SELECT m.*, 'me' as sender
        FROM messages m
        WHERE id = ?
      `, [info.lastInsertRowid]);

      // Emit the message to the receiver
      io.to(`user_${receiverId}`).emit('new_message', {
        ...(message as any),
        sender: 'other' // from the receiver's perspective, the sender is 'other'
      });

      if (content) {
        sendPushToUser(receiverId, {
          title: 'Jauna ziņa',
          body: content.length > 60 ? content.slice(0, 60) + '...' : content,
          url: `/chat`,
        }).catch(e => console.error('Push error:', e));
      }

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: 'Server error sending message' });
    }
  });

  // Offers API
  app.post("/api/listings/:id/offers", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const senderId = decoded.userId;
      const listingId = req.params.id;
      const { amount, buyerId: providedBuyerId } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid offer amount' });
      }

      const listing = await db.get('SELECT user_id, title FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      const isSeller = listing.user_id === senderId;
      const buyerId = isSeller ? providedBuyerId : senderId;
      const receiverId = isSeller ? buyerId : listing.user_id;

      if (!buyerId) {
        return res.status(400).json({ error: 'Buyer ID is required for counter-offers' });
      }

      const info = await db.run('INSERT INTO offers (listing_id, buyer_id, sender_id, amount) VALUES (?, ?, ?, ?)', [listingId, buyerId, senderId, amount]);
      const offerId = info.lastInsertRowid;

      // Also send a message about the offer
      await db.run('INSERT INTO messages (sender_id, receiver_id, listing_id, offer_id, content) VALUES (?, ?, ?, ?, ?)', [senderId, receiverId, listingId, offerId, isSeller ? `Es piedāvāju pretcenu €${amount}.` : `Es piedāvāju €${amount} par šo preci.`]);

      // Notify receiver
      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'new_offer', ?, ?, ?)
      `, [
        receiverId,
        isSeller ? 'Saņemts pretpiedāvājums' : 'Jauns piedāvājums',
        isSeller
          ? `Pārdevējs izteica pretpiedāvājumu €${amount} sludinājumam "${listing.title}".`
          : `Saņemts jauns piedāvājums €${amount} sludinājumam "${listing.title}".`,
        `/chat?userId=${senderId}&listingId=${listingId}`
      ]);

      res.json({ id: offerId, message: 'Offer sent successfully' });
    } catch (error) {
      console.error("Error sending offer:", error);
      res.status(500).json({ error: 'Server error sending offer' });
    }
  });

  app.get("/api/users/me/offers/received", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const offers = await db.all(`
        SELECT o.*, l.title as listing_title, l.image_url as listing_image, u.name as buyer_name
        FROM offers o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON o.buyer_id = u.id
        WHERE l.user_id = ?
        ORDER BY o.created_at DESC
      `, [decoded.userId]);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching received offers:", error);
      res.status(500).json({ error: 'Server error fetching offers' });
    }
  });

  app.get("/api/users/me/offers/sent", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const offers = await db.all(`
        SELECT o.*, l.title as listing_title, l.image_url as listing_image, u.name as seller_name, l.user_id as seller_id
        FROM offers o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON l.user_id = u.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
      `, [decoded.userId]);
      res.json(offers);
    } catch (error) {
      console.error("Error fetching sent offers:", error);
      res.status(500).json({ error: 'Server error fetching offers' });
    }
  });

  app.patch("/api/offers/:id/status", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const offerId = req.params.id;
      const { status } = req.body; // 'accepted' or 'rejected'

      if (!['accepted', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Verify ownership (only receiver can accept/reject)
      const offer = await db.get(`
        SELECT o.*, l.user_id as seller_id, l.title as listing_title
        FROM offers o
        JOIN listings l ON o.listing_id = l.id
        WHERE o.id = ?
      `, [offerId]) as any;

      if (!offer) return res.status(404).json({ error: 'Offer not found' });

      const isSeller = offer.seller_id === decoded.userId;
      const isBuyer = offer.buyer_id === decoded.userId;
      const isSender = offer.sender_id === decoded.userId;

      // Receiver is the one who didn't send it
      if (isSender) {
        return res.status(403).json({ error: 'Cannot accept/reject your own offer' });
      }

      if (!isSeller && !isBuyer) {
        return res.status(403).json({ error: 'Unauthorized to update this offer' });
      }

      if (offer.status !== 'pending') {
        return res.status(400).json({ error: 'Offer status already updated' });
      }

      await db.run('UPDATE offers SET status = ? WHERE id = ?', [status, offerId]);

      // If accepted, mark listing as sold
      if (status === 'accepted') {
        await db.run("UPDATE listings SET status = 'sold' WHERE id = ?", [offer.listing_id]);
      }

      // Notify the other party (the sender)
      const statusText = status === 'accepted' ? 'pieņemts' : 'noraidīts';
      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'offer_status', ?, ?, ?)
      `, [
        offer.sender_id,
        `Piedāvājums ${statusText}`,
        `Jūsu piedāvājums €${offer.amount} sludinājumam "${offer.listing_title}" tika ${statusText}.`,
        `/chat?userId=${decoded.userId}&listingId=${offer.listing_id}`
      ]);

      res.json({ success: true, status });
    } catch (error) {
      console.error("Error updating offer status:", error);
      res.status(500).json({ error: 'Server error updating offer status' });
    }
  });
  app.post("/api/listings/:id/bids", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { amount } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid bid amount' });
      }

      // Check if listing exists and is an auction
      const listing = await db.get('SELECT price, attributes, user_id, status FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'This auction has ended' });
      }

      if (listing.user_id === decoded.userId) {
        return res.status(400).json({ error: 'Cannot bid on your own listing' });
      }

      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};
      if (attributes.saleType !== 'auction') {
        return res.status(400).json({ error: 'This listing is not an auction' });
      }

      // Check if bid is higher than current highest bid or starting price
      const highestBid = await db.get('SELECT MAX(amount) as maxAmount FROM bids WHERE listing_id = ?', [listingId]) as { maxAmount: number | null };
      const currentHighest = highestBid.maxAmount !== null ? highestBid.maxAmount : listing.price;

      if (amount <= currentHighest) {
        return res.status(400).json({ error: `Bid must be higher than current highest bid: €${currentHighest}` });
      }

      // Soft Close logic
      if (attributes.auctionEndDate) {
        const endDate = new Date(attributes.auctionEndDate);
        const now = new Date();
        const timeDiffMs = endDate.getTime() - now.getTime();

        // If less than 3 minutes remaining, extend by 3 minutes
        if (timeDiffMs > 0 && timeDiffMs < 3 * 60 * 1000) {
          const newEndDate = new Date(now.getTime() + 3 * 60 * 1000);
          attributes.auctionEndDate = newEndDate.toISOString();

          await db.run('UPDATE listings SET attributes = ? WHERE id = ?', [
            JSON.stringify(attributes),
            listingId
          ]);
        }
      }

      const info = await db.run('INSERT INTO bids (listing_id, user_id, amount) VALUES (?, ?, ?)', [listingId, decoded.userId, amount]);

      const newBid = await db.get(`
        SELECT b.id, b.user_id, b.amount, b.created_at, u.name as bidder_name
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `, [info.lastInsertRowid]) as any;

      // Emit real-time bid update
      io.emit('new_bid', {
        listingId: parseInt(listingId),
        bid: newBid
      });

      // Notify seller
      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'new_bid', 'Jauns solījums jūsu izsolē', ?, ?)
      `, [
        listing.user_id,
        `Lietotājs ${newBid.bidder_name} veica solījumu €${amount} jūsu izsolē.`,
        `/listing/${listingId}`
      ]);

      res.json(newBid);
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ error: 'Server error while placing bid' });
    }
  });

  app.get("/api/listings/:id/bids", async (req, res) => {
    try {
      const listingId = req.params.id;
      const bids = await db.all(`
        SELECT bids.*, users.name as bidder_name
        FROM bids
        JOIN users ON bids.user_id = users.id
        WHERE listing_id = ?
        ORDER BY amount DESC
      `, [listingId]);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: 'Server error fetching bids' });
    }
  });

  app.put("/api/listings/:id", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { title, description, price, category, image_url, location, is_auction, auction_end_date, listing_type, exchange_for } = req.body;

      // Verify ownership
      const listing = await db.get('SELECT user_id, price, title FROM listings WHERE id = ?', [listingId]) as { user_id: number, price: number, title: string } | undefined;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to edit this listing' });

      await db.run(`
        UPDATE listings
        SET title = ?, description = ?, price = ?, category = ?, image_url = ?, location = ?, is_auction = ?, auction_end_date = ?, listing_type = ?, exchange_for = ?
        WHERE id = ?
      `, [title, description, price, category, image_url, location || null, is_auction ? 1 : 0, auction_end_date || null, listing_type || 'sale', exchange_for || null, listingId]);

      // Price Drop Alert Logic
      if (price < listing.price) {
        // Fetch users who favorited this listing
        const favoritedUsers = await db.all('SELECT user_id FROM favorites WHERE listing_id = ?', [listingId]) as { user_id: number }[];

        const message = `Great news! The price for "${listing.title}" has dropped from €${listing.price} to €${price}.`;
        const link = `/listing/${listingId}`;

        await db.transaction(async (client) => {
          for (const user of favoritedUsers) {
            await db.clientRun(client, `
              INSERT INTO notifications (user_id, type, title, message, link)
              VALUES (?, 'system', 'Price Drop Alert!', ?, ?)
            `, [user.user_id, message, link]);
          }
        });
      }

      if (process.env.MEILISEARCH_HOST) {
        db.get<any>(
          'SELECT l.*, u.name as author_name, u.username FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = ?',
          [listingId]
        ).then(updatedDoc => {
          if (!updatedDoc) return;
          const attrs = updatedDoc.attributes
            ? (typeof updatedDoc.attributes === 'string' ? JSON.parse(updatedDoc.attributes) : updatedDoc.attributes)
            : {};
          syncListing({
            id: Number(listingId),
            user_id: updatedDoc.user_id,
            title: updatedDoc.title,
            description: updatedDoc.description || '',
            price: Number(updatedDoc.price),
            category: updatedDoc.category,
            subcategory: attrs.subcategory || null,
            listing_type: updatedDoc.listing_type,
            status: updatedDoc.status || 'active',
            location: updatedDoc.location || null,
            image_url: updatedDoc.image_url || null,
            author_name: updatedDoc.author_name || updatedDoc.username || '',
            created_at: updatedDoc.created_at,
            lat: updatedDoc.lat || null,
            lng: updatedDoc.lng || null,
          }).catch(e => console.error('[SEARCH SYNC UPDATE]', e));
        }).catch(e => console.error('[SEARCH SYNC UPDATE FETCH]', e));
      }

      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: 'Server error updating listing' });
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

  // Badges Endpoints
  app.get('/api/users/:id/badges', async (req, res) => {
    try {
      const badges = await db.all('SELECT badge_id, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC', [req.params.id]) as any[];
      res.json(badges.map(b => ({ ...b, ...(BADGE_DEFINITIONS[b.badge_id] || {}) })));
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
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

  // User Self-Service Ads Endpoints
  app.get("/api/users/me/ads", async (req, res) => {
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

  app.get("/api/users/me/ads/:id/stats", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const adId = req.params.id;
      // Verify ad belongs to user
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

  app.post("/api/users/me/ads", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, image_url, link_url, size, start_date, end_date, category } = req.body;

      // Get ad price from settings
      const settings = await db.all('SELECT key, value FROM settings', []) as {key: string, value: string}[];
      const settingsMap = settings.reduce((acc, s) => ({...acc, [s.key]: s.value}), {} as Record<string, string>);
      const adPrice = parseInt(settingsMap['ad_price_points'] || '500', 10);

      let adId: number | bigint | undefined;
      await db.transaction(async (client) => {
        const user = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as {points: number};
        if (!user || user.points < adPrice) {
          throw new Error('INSUFFICIENT_POINTS');
        }

        // Deduct points
        await db.clientRun(client, 'UPDATE users SET points = points - ? WHERE id = ?', [adPrice, decoded.userId]);

        // Record transaction
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -adPrice, `Reklāmas izveide: ${title}`]);

        // Create ad
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
