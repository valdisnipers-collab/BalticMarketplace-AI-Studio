import { Router } from 'express';
import type { RateLimitRequestHandler } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import twilio from 'twilio';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';
import { checkAndAwardBadges } from '../utils/badges';
import { validateBody, registerSchema, loginSchema } from '../middleware/validate';
import { validatePassword } from '../utils/passwordCheck';
import { sendEmail, emailTemplates } from './../services/email';

const RESET_TOKEN_TTL_MINUTES = 60;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

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
      // Simulated OTP flow is only allowed outside production. In production
      // a missing Twilio configuration must fail loudly so nobody can bypass
      // phone verification with the known dev code.
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'SMS verifikācijas serviss nav konfigurēts. Sazinieties ar administrāciju.',
        });
      }
      console.warn("Twilio is not configured. Simulating OTP sent (dev only).");
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
      // Dev-only fallback. Production must never accept the hardcoded code.
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
          error: 'SMS verifikācijas serviss nav konfigurēts. Sazinieties ar administrāciju.',
        });
      }
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

  // Helper: Smart-ID flows are fully simulated. Block them in production
  // until a real Smart-ID provider (e.g. Dokobit) is wired up.
  const smartIdGuard = (req: any, res: any, next: any) => {
    if (process.env.NODE_ENV === 'production' && !process.env.SMART_ID_PROVIDER_URL) {
      return res.status(503).json({
        error: 'Smart-ID autentifikācija nav pieejama. Sazinieties ar administrāciju.',
      });
    }
    next();
  };

  router.post("/smart-id/register/init", authLimiter, smartIdGuard, async (req, res) => {
    const { personalCode, country, name, user_type, company_name, company_reg_number, company_vat } = req.body;
    if (!personalCode || !country || !name) return res.status(400).json({ error: 'Personal code, country and name required' });

    // Simulate Smart-ID registration initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    // Store registration data in a temporary map or just pass it back/forth (for simulation, we'll just trust the client in status)
    res.json({ sessionId, verificationCode, message: 'Registration initiated' });
  });

  router.post("/smart-id/register/status", authLimiter, smartIdGuard, async (req, res) => {
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

  router.post("/smart-id/login/init", authLimiter, smartIdGuard, async (req, res) => {
    const { personalCode, country } = req.body;
    if (!personalCode || !country) return res.status(400).json({ error: 'Personal code and country required' });

    // Simulate Smart-ID login initiation
    const sessionId = `sid_${Math.random().toString(36).substring(2, 15)}`;
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit code

    res.json({ sessionId, verificationCode, message: 'Login initiated' });
  });

  router.post("/smart-id/login/status", authLimiter, smartIdGuard, async (req, res) => {
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

  router.post("/smart-id/init", smartIdGuard, async (req, res) => {
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

  router.post("/smart-id/status", smartIdGuard, async (req, res) => {
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
    const { email, password, name, phone, user_type, company_name, company_reg_number, company_vat, ref } = req.body;
    try {
      const hash = await bcrypt.hash(password, 10);
      const role = email === 'valdis.nipers@gmail.com' ? 'admin' : 'user';
      const uType = user_type === 'b2b' ? 'b2b' : 'c2c';
      const info = await db.run('INSERT INTO users (email, password_hash, name, phone, user_type, role, company_name, company_reg_number, company_vat, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [email, hash, name, phone || null, uType, role, company_name || null, company_reg_number || null, company_vat || null, 50]);

      const userId = info.lastInsertRowid as number;
      await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [userId, 50, 'Reģistrācijas bonuss']);

      // Apply referral code if provided
      if (ref) {
        const refRow = await db.get('SELECT user_id FROM referral_codes WHERE code = $1', [ref]) as any;
        if (refRow && refRow.user_id !== userId) {
          await db.run('UPDATE users SET referred_by = $1 WHERE id = $2', [refRow.user_id, userId]);
          await db.run('UPDATE referral_codes SET uses = uses + 1 WHERE user_id = $1', [refRow.user_id]);
          await db.run('UPDATE users SET points = points + 50 WHERE id IN ($1, $2)', [userId, refRow.user_id]);
          await db.run("INSERT INTO points_history (user_id, points, reason) VALUES ($1, 50, 'Referral bonuss — jauns lietotājs')", [userId]);
          await db.run("INSERT INTO points_history (user_id, points, reason) VALUES ($1, 50, 'Referral bonuss — uzaicināts lietotājs')", [refRow.user_id]);
        }
      }

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, email, name, phone, user_type: uType, role, points: 50, early_access_until: null, company_name, company_reg_number, company_vat, is_verified: 0 } });
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

  // POST /api/auth/request-password-reset
  // Always returns 200 regardless of whether the email exists — prevents
  // account enumeration. If the email matches a user, we generate a one-time
  // token (hashed in DB), invalidate any previous unused tokens for that
  // user, and send a reset email with a 1h-expiring link.
  router.post("/request-password-reset", authLimiter, async (req, res) => {
    try {
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        return res.status(400).json({ error: 'Nederīgs e-pasts' });
      }

      const user = await db.get<{ id: number; email: string; name: string }>(
        'SELECT id, email, name FROM users WHERE LOWER(email) = ?',
        [rawEmail],
      );

      if (user) {
        // Invalidate previous unused tokens so only the newest link works.
        await db.run(
          `UPDATE password_reset_tokens
             SET used_at = NOW()
           WHERE user_id = ? AND used_at IS NULL`,
          [user.id],
        );

        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = hashResetToken(rawToken);
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
        const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim()
          || req.socket.remoteAddress
          || null;

        await db.run(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_ip)
           VALUES (?, ?, ?, ?)
           RETURNING id`,
          [user.id, tokenHash, expiresAt, ip],
        );

        const resetUrl = `${APP_URL}/reset-password?token=${rawToken}`;
        const tmpl = emailTemplates.passwordReset(user.name || 'lietotāj', resetUrl, RESET_TOKEN_TTL_MINUTES);
        sendEmail(user.email, tmpl.subject, tmpl.html).catch(e =>
          console.error('[password-reset email]', e),
        );
      }

      // Same response regardless — no enumeration.
      res.json({ ok: true, message: 'Ja konts ar šo e-pastu eksistē, esam nosūtījuši paroles atjaunošanas saiti.' });
    } catch (error) {
      console.error('[request-password-reset]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // POST /api/auth/reset-password
  // Consumes a reset token and sets a new password. Token is one-time use
  // (marked used_at after success) and subject to the same password policy
  // as registration (min 10 chars + haveibeenpwned check).
  router.post("/reset-password", authLimiter, async (req, res) => {
    try {
      const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
      const newPassword = req.body?.newPassword;
      if (!token || token.length < 32) {
        return res.status(400).json({ error: 'Nederīga paroles atjaunošanas saite' });
      }

      const validation = await validatePassword(newPassword);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      const tokenHash = hashResetToken(token);
      const row = await db.get<{ id: number; user_id: number }>(
        `SELECT id, user_id FROM password_reset_tokens
           WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
           LIMIT 1`,
        [tokenHash],
      );

      if (!row) {
        return res.status(400).json({ error: 'Saite nederīga vai novecojusi. Lūdzu, pieprasi jaunu.' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await db.transaction(async (client) => {
        await db.clientRun(
          client,
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [hash, row.user_id],
        );
        await db.clientRun(
          client,
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
          [row.id],
        );
        // Invalidate any other pending tokens for the same user so a leaked
        // earlier link cannot be used after this reset.
        await db.clientRun(
          client,
          `UPDATE password_reset_tokens
             SET used_at = NOW()
           WHERE user_id = ? AND used_at IS NULL`,
          [row.user_id],
        );
      });

      res.json({ ok: true, message: 'Parole atjaunota. Tagad vari ienākt ar jauno paroli.' });
    } catch (error) {
      console.error('[reset-password]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat, company_address, b2b_subscription_status, stripe_customer_id FROM users WHERE id = ?', [decoded.userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
