import { Router } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import twilio from 'twilio';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';
import { checkAndAwardBadges } from '../utils/badges';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate';

// Twilio Configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

export function createAuthRouter(deps: { authLimiter: RateLimitRequestHandler }): Router {
  const { authLimiter } = deps;
  const router = Router();

  router.post("/request-otp", authLimiter, async (req, res) => {
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

  router.post("/verify-otp", authLimiter, async (req, res) => {
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

  router.post("/smart-id/register/init", authLimiter, async (req, res) => {
    const { personalCode, country, name, user_type, company_name, company_reg_number, company_vat } = req.body;
    if (!personalCode || !country || !name) return res.status(400).json({ error: 'Personal code, country and name required' });

    // Simulate Smart-ID registration initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    // Store registration data in a temporary map or just pass it back/forth (for simulation, we'll just trust the client in status)
    res.json({ sessionId, verificationCode, message: 'Registration initiated' });
  });

  router.post("/smart-id/register/status", authLimiter, async (req, res) => {
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

  router.post("/smart-id/login/init", authLimiter, async (req, res) => {
    const { personalCode, country } = req.body;
    if (!personalCode || !country) return res.status(400).json({ error: 'Personal code and country required' });

    // Simulate Smart-ID login initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    res.json({ sessionId, verificationCode, message: 'Login initiated' });
  });

  router.post("/smart-id/login/status", authLimiter, async (req, res) => {
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

  router.post("/smart-id/init", async (req, res) => {
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

  router.post("/smart-id/status", async (req, res) => {
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

  router.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
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

  router.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
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

  router.get("/me", async (req, res) => {
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

  return router;
}
