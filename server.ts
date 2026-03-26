import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db from "./server/db";
import { GoogleGenAI } from "@google/genai";
import twilio from "twilio";
import multer from "multer";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-dev-key-change-in-production";

// Configure Multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
})

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
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // File Upload Route
  app.post('/api/upload', upload.single('image'), (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const token = authHeader.split(' ')[1];
      jwt.verify(token, JWT_SECRET); // Just verify token exists and is valid
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Return the URL to access the uploaded file
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(401).json({ error: 'Invalid token or upload failed' });
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
      let user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any;
      
      if (!user) {
        // Create new user via phone
        const email = `${phone.replace(/\+/g, '')}@phone.local`; // Dummy email for schema
        const hash = await bcrypt.hash(Math.random().toString(36), 10); // Dummy password
        const role = (phone === '29469877' || phone === '+37129469877') ? 'admin' : 'user';
        const stmt = db.prepare('INSERT INTO users (email, password_hash, name, phone, user_type, role) VALUES (?, ?, ?, ?, ?, ?)');
        const info = stmt.run(email, hash, name || 'User', phone, user_type || 'c2c', role);
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
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        const hash = await bcrypt.hash(Math.random().toString(36), 10);
        const uType = user_type === 'b2b' ? 'b2b' : 'c2c';
        const stmt = db.prepare('INSERT INTO users (email, password_hash, name, user_type, role, is_verified, company_name, company_reg_number, company_vat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        const info = stmt.run(email, hash, name, uType, 'user', 1, company_name || null, company_reg_number || null, company_vat || null);
        user = { id: info.lastInsertRowid, email, name, user_type: uType, role: 'user', is_verified: 1, points: 0, company_name, company_reg_number, company_vat };
      } else {
        // If user already exists, just log them in
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
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
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

      if (!user) {
        const hash = await bcrypt.hash(Math.random().toString(36), 10);
        const stmt = db.prepare('INSERT INTO users (email, password_hash, name, user_type, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)');
        const info = stmt.run(email, hash, `User ${personalCode}`, 'c2c', 'user', 1);
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
      const user = db.prepare('SELECT is_verified FROM users WHERE id = ?').get(decoded.userId) as any;
      
      if (!user.is_verified) {
        db.prepare('UPDATE users SET is_verified = 1, points = points + 300 WHERE id = ?').run(decoded.userId);
        db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(decoded.userId, 300, 'Smart-ID Verification');
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
      const stmt = db.prepare('INSERT INTO users (email, password_hash, name, phone, user_type, role, company_name, company_reg_number, company_vat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(email, hash, name, phone || null, uType, role, company_name || null, company_reg_number || null, company_vat || null);
      
      const token = jwt.sign({ userId: info.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: info.lastInsertRowid, email, name, phone, user_type: uType, role, points: 0, early_access_until: null, company_name, company_reg_number, company_vat, is_verified: 0 } });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Email already exists' });
      } else {
        res.status(500).json({ error: 'Server error' });
      }
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) return res.status(400).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, user_type: user.user_type, role: user.role, points: user.points, early_access_until: user.early_access_until, company_name: user.company_name, company_reg_number: user.company_reg_number, company_vat: user.company_vat, is_verified: user.is_verified } });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat FROM users WHERE id = ?').get(decoded.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // User Profile Routes
  app.get("/api/users/me/listings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listings = db.prepare(`
        SELECT * FROM listings 
        WHERE user_id = ? 
        ORDER BY is_highlighted DESC, created_at DESC
      `).all(decoded.userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user listings:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  app.get("/api/users/me/favorites", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { hasAccess, userId } = hasEarlyAccess(req);

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
          sql += ` AND (listings.created_at <= datetime('now', '-15 minutes') OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= datetime('now', '-15 minutes')`;
        }
      }

      sql += ` ORDER BY listings.is_highlighted DESC, favorites.created_at DESC`;

      const favorites = db.prepare(sql).all(...params);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(401).json({ error: 'Invalid token or server error' });
    }
  });

  // Favorites Routes
  app.post("/api/favorites/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      
      db.prepare('INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)').run(decoded.userId, listingId);
      res.json({ message: 'Added to favorites' });
    } catch (error) {
      console.error("Error adding favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.delete("/api/favorites/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      
      db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(decoded.userId, listingId);
      res.json({ message: 'Removed from favorites' });
    } catch (error) {
      console.error("Error removing favorite:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Reviews Routes
  app.get("/api/users/:id/reviews", (req, res) => {
    try {
      const sellerId = req.params.id;
      const reviews = db.prepare(`
        SELECT reviews.*, users.name as reviewer_name 
        FROM reviews 
        JOIN users ON reviews.reviewer_id = users.id 
        WHERE seller_id = ? 
        ORDER BY reviews.created_at DESC
      `).all(sellerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  app.post("/api/users/:id/reviews", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const sellerId = req.params.id;
      const { rating, comment } = req.body;

      if (decoded.userId.toString() === sellerId) {
        return res.status(400).json({ error: 'You cannot review yourself' });
      }

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      const stmt = db.prepare('INSERT INTO reviews (reviewer_id, seller_id, rating, comment) VALUES (?, ?, ?, ?)');
      const info = stmt.run(decoded.userId, sellerId, rating, comment);
      
      res.json({ id: info.lastInsertRowid, message: 'Review added successfully' });
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Listings Routes
  function hasEarlyAccess(req: any): { hasAccess: boolean, userId: number | null } {
    const authHeader = req.headers.authorization;
    if (!authHeader) return { hasAccess: false, userId: null };
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT early_access_until FROM users WHERE id = ?').get(decoded.userId) as any;
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

  app.get("/api/listings/search", (req, res) => {
    try {
      const { q: query, category, subcategory, minPrice, maxPrice, ...restQuery } = req.query;
      if (!query) {
        return res.json([]);
      }
      
      const { hasAccess, userId } = hasEarlyAccess(req);
      
      let sql = `
        SELECT listings.*, users.name as author_name 
        FROM listings_fts 
        JOIN listings ON listings_fts.id = listings.id
        JOIN users ON listings.user_id = users.id 
        WHERE listings_fts MATCH ?
      `;
      const params: any[] = [query + '*'];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= datetime('now', '-15 minutes') OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= datetime('now', '-15 minutes')`;
        }
      }

      if (category) {
        sql += ` AND listings.category = ?`;
        params.push(category);
      }
      if (subcategory) {
        sql += ` AND json_extract(listings.attributes, '$.subcategory') = ?`;
        params.push(subcategory);
      }
      if (minPrice) {
        sql += ` AND listings.price >= ?`;
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        sql += ` AND listings.price <= ?`;
        params.push(Number(maxPrice));
      }

      // Handle dynamic attribute filters
      for (const [key, value] of Object.entries(restQuery)) {
        if (key.startsWith('attr_') && value) {
          const attrName = key.replace('attr_', '');
          sql += ` AND json_extract(listings.attributes, ?) = ?`;
          params.push(`$.${attrName}`, value);
        }
      }

      sql += ` ORDER BY listings.is_highlighted DESC, rank`;
      
      const listings = db.prepare(sql).all(...params);
      res.json(listings);
    } catch (error) {
      console.error("Error searching listings:", error);
      res.status(500).json({ error: 'Server error searching listings' });
    }
  });

  app.get("/api/listings", (req, res) => {
    try {
      const { category, subcategory, minPrice, maxPrice, ...restQuery } = req.query;
      const { hasAccess, userId } = hasEarlyAccess(req);

      let query = `
        SELECT listings.*, users.name as author_name 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE 1=1
      `;
      const params: any[] = [];

      if (!hasAccess) {
        if (userId) {
          query += ` AND (listings.created_at <= datetime('now', '-15 minutes') OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          query += ` AND listings.created_at <= datetime('now', '-15 minutes')`;
        }
      }

      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }
      if (subcategory) {
        query += ` AND json_extract(attributes, '$.subcategory') = ?`;
        params.push(subcategory);
      }
      if (minPrice) {
        query += ` AND price >= ?`;
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        query += ` AND price <= ?`;
        params.push(Number(maxPrice));
      }

      // Handle dynamic attribute filters
      for (const [key, value] of Object.entries(restQuery)) {
        if (key.startsWith('attr_') && value) {
          const attrName = key.replace('attr_', '');
          query += ` AND json_extract(attributes, ?) = ?`;
          params.push(`$.${attrName}`, value);
        }
      }

      query += ` ORDER BY listings.is_highlighted DESC, listings.created_at DESC`;
      
      const listings = db.prepare(query).all(...params);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  app.get("/api/listings/:id", (req, res) => {
    try {
      const { hasAccess, userId } = hasEarlyAccess(req);
      
      let sql = `
        SELECT listings.*, users.name as author_name, users.email as author_email 
        FROM listings 
        JOIN users ON listings.user_id = users.id 
        WHERE listings.id = ?
      `;
      const params: any[] = [req.params.id];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= datetime('now', '-15 minutes') OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= datetime('now', '-15 minutes')`;
        }
      }

      const listing = db.prepare(sql).get(...params);
      
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

  app.post("/api/listings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, description, price, category, image_url, attributes } = req.body;
      
      if (!title || !price || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const stmt = db.prepare('INSERT INTO listings (user_id, title, description, price, category, image_url, attributes) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(decoded.userId, title, description, price, category, image_url, attributes ? JSON.stringify(attributes) : null);
      
      res.json({ id: info.lastInsertRowid, message: 'Listing created successfully' });
    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: 'Server error while creating listing' });
    }
  });

  app.post("/api/listings/:id/highlight", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      // Verify ownership
      const listing = db.prepare('SELECT user_id, is_highlighted FROM listings WHERE id = ?').get(listingId) as any;
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (listing.is_highlighted) return res.status(400).json({ error: 'Listing is already highlighted' });

      // Check points
      const user = db.prepare('SELECT points FROM users WHERE id = ?').get(decoded.userId) as any;
      if (!user || user.points < 100) {
        return res.status(400).json({ error: 'Nepietiekams punktu skaits (nepieciešami 100 punkti)' });
      }

      // Deduct points and highlight
      db.transaction(() => {
        db.prepare('UPDATE users SET points = points - 100 WHERE id = ?').run(decoded.userId);
        db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(decoded.userId, -100, `Sludinājuma #${listingId} izcelšana`);
        db.prepare('UPDATE listings SET is_highlighted = 1 WHERE id = ?').run(listingId);
      })();

      // Fetch updated user to return new points balance
      const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(decoded.userId) as any;

      res.json({ message: 'Sludinājums izcelts veiksmīgi', points: updatedUser.points });
    } catch (error) {
      console.error("Error highlighting listing:", error);
      res.status(500).json({ error: 'Server error highlighting listing' });
    }
  });

  app.delete("/api/listings/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      // Verify ownership
      const listing = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(listingId) as { user_id: number } | undefined;
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to delete this listing' });

      db.prepare('DELETE FROM listings WHERE id = ?').run(listingId);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error while deleting listing' });
    }
  });

  // Messaging API
  app.get("/api/messages/unread-count", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE receiver_id = ? AND is_read = 0
      `).get(userId) as { count: number };

      res.json({ count: result.count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: 'Server error fetching unread count' });
    }
  });

  app.get("/api/messages/conversations", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const userId = decoded.userId;

      // Get latest message for each conversation
      const conversations = db.prepare(`
        SELECT 
          m.id, m.content as lastMessage, m.created_at as time, m.is_read,
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
      `).all(userId, userId, userId, userId, userId, userId);

      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: 'Server error fetching conversations' });
    }
  });

  app.get("/api/messages/:otherUserId", (req, res) => {
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
          CASE WHEN m.sender_id = ? THEN 'me' ELSE 'other' END as sender
        FROM messages m
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
      `;
      const params: any[] = [userId, userId, otherUserId, otherUserId, userId];

      if (listingId) {
        query += ` AND m.listing_id = ?`;
        params.push(listingId);
      }

      query += ` ORDER BY m.created_at ASC`;

      const messages = db.prepare(query).all(...params);

      // Mark as read
      let updateQuery = `UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?`;
      let updateParams: any[] = [userId, otherUserId];
      if (listingId) {
        updateQuery += ` AND listing_id = ?`;
        updateParams.push(listingId);
      }
      db.prepare(updateQuery).run(...updateParams);

      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: 'Server error fetching messages' });
    }
  });

  app.post("/api/messages", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const senderId = decoded.userId;
      const { receiverId, listingId, content } = req.body;

      if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver and content are required' });
      }

      const stmt = db.prepare('INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES (?, ?, ?, ?)');
      const info = stmt.run(senderId, receiverId, listingId || null, content);

      const message = db.prepare(`
        SELECT m.*, 'me' as sender 
        FROM messages m 
        WHERE id = ?
      `).get(info.lastInsertRowid);

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: 'Server error sending message' });
    }
  });

  // Offers API
  app.post("/api/listings/:id/offers", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const buyerId = decoded.userId;
      const listingId = req.params.id;
      const { amount } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid offer amount' });
      }

      const listing = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(listingId) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      
      if (listing.user_id === buyerId) {
        return res.status(400).json({ error: 'Cannot make an offer on your own listing' });
      }

      const stmt = db.prepare('INSERT INTO offers (listing_id, buyer_id, amount) VALUES (?, ?, ?)');
      const info = stmt.run(listingId, buyerId, amount);

      // Also send a message about the offer
      const msgStmt = db.prepare('INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES (?, ?, ?, ?)');
      msgStmt.run(buyerId, listing.user_id, listingId, `Es piedāvāju €${amount} par šo preci.`);

      res.json({ id: info.lastInsertRowid, message: 'Offer sent successfully' });
    } catch (error) {
      console.error("Error sending offer:", error);
      res.status(500).json({ error: 'Server error sending offer' });
    }
  });
  app.post("/api/listings/:id/bids", (req, res) => {
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
      const listing = db.prepare('SELECT price, attributes, user_id FROM listings WHERE id = ?').get(listingId) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      
      if (listing.user_id === decoded.userId) {
        return res.status(400).json({ error: 'Cannot bid on your own listing' });
      }

      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};
      if (attributes.saleType !== 'auction') {
        return res.status(400).json({ error: 'This listing is not an auction' });
      }

      // Check if bid is higher than current highest bid or starting price
      const highestBid = db.prepare('SELECT MAX(amount) as maxAmount FROM bids WHERE listing_id = ?').get(listingId) as { maxAmount: number | null };
      const currentHighest = highestBid.maxAmount !== null ? highestBid.maxAmount : listing.price;

      if (amount <= currentHighest) {
        return res.status(400).json({ error: `Bid must be higher than current highest bid: €${currentHighest}` });
      }

      const stmt = db.prepare('INSERT INTO bids (listing_id, user_id, amount) VALUES (?, ?, ?)');
      stmt.run(listingId, decoded.userId, amount);
      
      res.json({ message: 'Bid placed successfully' });
    } catch (error) {
      console.error("Error placing bid:", error);
      res.status(500).json({ error: 'Server error while placing bid' });
    }
  });

  app.get("/api/listings/:id/bids", (req, res) => {
    try {
      const listingId = req.params.id;
      const stmt = db.prepare(`
        SELECT bids.*, users.name as bidder_name 
        FROM bids 
        JOIN users ON bids.user_id = users.id 
        WHERE listing_id = ? 
        ORDER BY amount DESC
      `);
      const bids = stmt.all(listingId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ error: 'Server error fetching bids' });
    }
  });

  app.put("/api/listings/:id", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { title, description, price, category, image_url } = req.body;

      // Verify ownership
      const listing = db.prepare('SELECT user_id FROM listings WHERE id = ?').get(listingId) as { user_id: number } | undefined;
      
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to edit this listing' });

      db.prepare(`
        UPDATE listings 
        SET title = ?, description = ?, price = ?, category = ?, image_url = ?
        WHERE id = ?
      `).run(title, description, price, category, image_url, listingId);

      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: 'Server error updating listing' });
    }
  });

  // Wallet API
  app.get("/api/wallet/points-history", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const history = db.prepare('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC').all(decoded.userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ error: 'Server error fetching points history' });
    }
  });

  app.get("/api/wallet/balance", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number } | undefined;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ balance: user.balance || 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: 'Server error fetching balance' });
    }
  });

  app.post("/api/wallet/add-funds", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, decoded.userId);
      
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number };
      res.json({ message: 'Funds added successfully', balance: user.balance });
    } catch (error) {
      console.error("Error adding funds:", error);
      res.status(500).json({ error: 'Server error adding funds' });
    }
  });

  app.get("/api/settings", (req, res) => {
    try {
      const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string, value: string }[];
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

  app.put("/api/settings", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.userId) as { role: string };
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const settings = req.body; // Record<string, string>
      db.transaction(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        for (const [key, value] of Object.entries(settings)) {
          stmt.run(key, String(value));
        }
      })();
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: 'Server error updating settings' });
    }
  });

  app.post("/api/wallet/buy-points", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { points } = req.body;
      
      if (!points || points <= 0 || !Number.isInteger(points)) {
        return res.status(400).json({ error: 'Invalid points amount' });
      }

      // In a real app, this would integrate with Stripe or another payment gateway.
      // For now, we simulate a successful purchase and add points directly.
      db.transaction(() => {
        db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, decoded.userId);
        db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(decoded.userId, points, `Punktu iegāde`);
      })();

      const updatedUser = db.prepare('SELECT points FROM users WHERE id = ?').get(decoded.userId) as any;
      res.json({ message: 'Punkti veiksmīgi iegādāti', points: updatedUser.points });
    } catch (error) {
      console.error("Error buying points:", error);
      res.status(500).json({ error: 'Server error buying points' });
    }
  });

  app.post("/api/wallet/buy-early-access", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      // Fetch settings
      const priceSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('early_access_price') as any;
      const durationSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('early_access_duration_hours') as any;
      
      const price = priceSetting ? parseInt(priceSetting.value, 10) : 150;
      const durationHours = durationSetting ? parseInt(durationSetting.value, 10) : 24;

      // Check points
      const user = db.prepare('SELECT points, early_access_until FROM users WHERE id = ?').get(decoded.userId) as any;
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
      db.transaction(() => {
        db.prepare('UPDATE users SET points = points - ?, early_access_until = ? WHERE id = ?').run(price, newEarlyAccessUntil.toISOString(), decoded.userId);
        db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(decoded.userId, -price, `Agrā piekļuve (${durationHours}h)`);
      })();

      // Fetch updated user to return new points balance and early access
      const updatedUser = db.prepare('SELECT points, early_access_until FROM users WHERE id = ?').get(decoded.userId) as any;

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

  app.post("/api/wallet/deduct", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, reason } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number } | undefined;
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, decoded.userId);
      
      const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as { balance: number };
      res.json({ message: 'Funds deducted successfully', balance: updatedUser.balance });
    } catch (error) {
      console.error("Error deducting funds:", error);
      res.status(500).json({ error: 'Server error deducting funds' });
    }
  });

  // Admin API
  const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = db.prepare('SELECT role FROM users WHERE id = ?').get(decoded.userId) as { role: string } | undefined;
      
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admins only' });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  app.get("/api/admin/users", isAdmin, (req, res) => {
    try {
      const users = db.prepare('SELECT id, email, name, role, created_at, balance FROM users ORDER BY created_at DESC').all();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: 'Server error fetching users' });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: 'Server error deleting user' });
    }
  });

  app.get("/api/admin/listings", isAdmin, (req, res) => {
    try {
      const listings = db.prepare(`
        SELECT listings.*, users.name as author_name, users.email as author_email
        FROM listings
        JOIN users ON listings.user_id = users.id
        ORDER BY listings.created_at DESC
      `).all();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching listings:", error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  app.delete("/api/admin/listings/:id", isAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM listings WHERE id = ?').run(req.params.id);
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error("Error deleting listing:", error);
      res.status(500).json({ error: 'Server error deleting listing' });
    }
  });

  // Reporting API
  app.post("/api/reports", (req, res) => {
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

      const stmt = db.prepare('INSERT INTO reports (reporter_id, listing_id, user_id, reason) VALUES (?, ?, ?, ?)');
      const info = stmt.run(reporterId, listingId || null, userId || null, reason);

      res.json({ id: info.lastInsertRowid, message: 'Report submitted successfully' });
    } catch (error) {
      console.error("Error submitting report:", error);
      res.status(500).json({ error: 'Server error submitting report' });
    }
  });

  app.get("/api/admin/reports", isAdmin, (req, res) => {
    try {
      const reports = db.prepare(`
        SELECT r.*, 
               u1.name as reporter_name, 
               u2.name as reported_user_name,
               l.title as reported_listing_title
        FROM reports r
        JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.user_id = u2.id
        LEFT JOIN listings l ON r.listing_id = l.id
        ORDER BY r.created_at DESC
      `).all();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: 'Server error fetching reports' });
    }
  });

  // Ads Endpoints
  app.get("/api/admin/ads", isAdmin, (req, res) => {
    try {
      const ads = db.prepare(`
        SELECT ads.*, users.name as user_name 
        FROM ads 
        LEFT JOIN users ON ads.user_id = users.id 
        ORDER BY ads.created_at DESC
      `).all();
      res.json(ads);
    } catch (error) {
      console.error("Error fetching ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  app.post("/api/admin/ads", isAdmin, (req, res) => {
    const { title, image_url, link_url, size, start_date, end_date, is_active, category } = req.body;
    try {
      const stmt = db.prepare('INSERT INTO ads (title, image_url, link_url, size, start_date, end_date, is_active, category, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(title, image_url, link_url, size, start_date, end_date, is_active ? 1 : 0, category || null, 'approved');
      res.json({ id: info.lastInsertRowid, message: 'Ad created successfully' });
    } catch (error) {
      console.error("Error creating ad:", error);
      res.status(500).json({ error: 'Server error creating ad' });
    }
  });

  app.put("/api/admin/ads/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    const { title, image_url, link_url, size, start_date, end_date, is_active, category, status } = req.body;
    try {
      db.exec('BEGIN TRANSACTION');
      
      // Check if status changed to rejected
      const currentAd = db.prepare('SELECT status, user_id, price_points FROM ads WHERE id = ?').get(id) as {status: string, user_id: number | null, price_points: number | null};
      
      if (currentAd && currentAd.status === 'pending' && status === 'rejected' && currentAd.user_id && currentAd.price_points) {
        // Refund points
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(currentAd.price_points, currentAd.user_id);
        // Record transaction
        db.prepare('INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
          .run(currentAd.user_id, currentAd.price_points, 'refund', `Reklāmas noraidīšana: ${title}`);
      }

      const stmt = db.prepare('UPDATE ads SET title = ?, image_url = ?, link_url = ?, size = ?, start_date = ?, end_date = ?, is_active = ?, category = ?, status = ? WHERE id = ?');
      stmt.run(title, image_url, link_url, size, start_date, end_date, is_active ? 1 : 0, category || null, status || 'approved', id);
      
      db.exec('COMMIT');
      res.json({ message: 'Ad updated successfully' });
    } catch (error) {
      db.exec('ROLLBACK');
      console.error("Error updating ad:", error);
      res.status(500).json({ error: 'Server error updating ad' });
    }
  });

  app.delete("/api/admin/ads/:id", isAdmin, (req, res) => {
    const { id } = req.params;
    try {
      db.exec('BEGIN TRANSACTION');
      
      const currentAd = db.prepare('SELECT status, user_id, price_points, title FROM ads WHERE id = ?').get(id) as {status: string, user_id: number | null, price_points: number | null, title: string};
      
      if (currentAd && currentAd.status === 'pending' && currentAd.user_id && currentAd.price_points) {
        // Refund points
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(currentAd.price_points, currentAd.user_id);
        // Record transaction
        db.prepare('INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
          .run(currentAd.user_id, currentAd.price_points, 'refund', `Reklāmas dzēšana: ${currentAd.title}`);
      }

      db.prepare('DELETE FROM ads WHERE id = ?').run(id);
      
      db.exec('COMMIT');
      res.json({ message: 'Ad deleted successfully' });
    } catch (error) {
      db.exec('ROLLBACK');
      console.error("Error deleting ad:", error);
      res.status(500).json({ error: 'Server error deleting ad' });
    }
  });

  app.get("/api/admin/ads/:id/stats", isAdmin, (req, res) => {
    const { id } = req.params;
    try {
      const stats = db.prepare('SELECT date, views, clicks FROM ad_stats WHERE ad_id = ? ORDER BY date ASC').all(id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching ad stats:", error);
      res.status(500).json({ error: 'Server error fetching ad stats' });
    }
  });

  // User Self-Service Ads Endpoints
  app.get("/api/users/me/ads", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const ads = db.prepare('SELECT * FROM ads WHERE user_id = ? ORDER BY created_at DESC').all(decoded.userId);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching user ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  app.get("/api/users/me/ads/:id/stats", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const adId = req.params.id;
      // Verify ad belongs to user
      const ad = db.prepare('SELECT id FROM ads WHERE id = ? AND user_id = ?').get(adId, decoded.userId);
      if (!ad) return res.status(404).json({ error: 'Ad not found' });

      const stats = db.prepare(`
        SELECT date, views, clicks 
        FROM ad_stats 
        WHERE ad_id = ? 
        ORDER BY date ASC
      `).all(adId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching ad stats:", error);
      res.status(500).json({ error: 'Server error fetching ad stats' });
    }
  });

  app.post("/api/users/me/ads", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, image_url, link_url, size, start_date, end_date, category } = req.body;
      
      // Get ad price from settings
      const settings = db.prepare('SELECT key, value FROM settings').all() as {key: string, value: string}[];
      const settingsMap = settings.reduce((acc, s) => ({...acc, [s.key]: s.value}), {} as Record<string, string>);
      const adPrice = parseInt(settingsMap['ad_price_points'] || '500', 10);

      db.exec('BEGIN TRANSACTION');
      
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(decoded.userId) as {balance: number};
      if (!user || user.balance < adPrice) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: 'Nepietiekams punktu atlikums' });
      }

      // Deduct points
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(adPrice, decoded.userId);
      
      // Record transaction
      db.prepare('INSERT INTO points_history (user_id, amount, type, description) VALUES (?, ?, ?, ?)')
        .run(decoded.userId, -adPrice, 'spend', `Reklāmas izveide: ${title}`);

      // Create ad
      const stmt = db.prepare('INSERT INTO ads (title, image_url, link_url, size, start_date, end_date, is_active, category, user_id, status, price_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = stmt.run(title, image_url, link_url, size, start_date, end_date, 0, category || null, decoded.userId, 'pending', adPrice);
      
      db.exec('COMMIT');
      res.json({ id: info.lastInsertRowid, message: 'Ad submitted for review' });
    } catch (error) {
      db.exec('ROLLBACK');
      console.error("Error creating user ad:", error);
      res.status(500).json({ error: 'Server error creating ad' });
    }
  });

  // Public Ads Endpoints
  app.get("/api/ads", (req, res) => {
    try {
      const now = new Date().toISOString();
      // Fetch all active, approved ads that are within date range.
      // We'll shuffle them randomly on the backend.
      const ads = db.prepare(`
        SELECT id, title, image_url, link_url, size, category 
        FROM ads 
        WHERE is_active = 1 
          AND status = 'approved' 
          AND start_date <= ? 
          AND end_date >= ?
        ORDER BY RANDOM()
      `).all(now, now);
      res.json(ads);
    } catch (error) {
      console.error("Error fetching active ads:", error);
      res.status(500).json({ error: 'Server error fetching ads' });
    }
  });

  app.post("/api/ads/:id/view", (req, res) => {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      db.prepare('UPDATE ads SET views = views + 1 WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO ad_stats (ad_id, date, views, clicks) 
        VALUES (?, ?, 1, 0) 
        ON CONFLICT(ad_id, date) DO UPDATE SET views = views + 1
      `).run(id, today);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/ads/:id/click", (req, res) => {
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    try {
      db.prepare('UPDATE ads SET clicks = clicks + 1 WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO ad_stats (ad_id, date, views, clicks) 
        VALUES (?, ?, 0, 1) 
        ON CONFLICT(ad_id, date) DO UPDATE SET clicks = clicks + 1
      `).run(id, today);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  app.put("/api/admin/reports/:id", isAdmin, (req, res) => {
    try {
      const { status } = req.body;
      if (!['resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, req.params.id);
      res.json({ message: 'Report updated successfully' });
    } catch (error) {
      console.error("Error updating report:", error);
      res.status(500).json({ error: 'Server error updating report' });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
