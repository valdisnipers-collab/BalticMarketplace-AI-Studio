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
import * as TOTP from '../utils/totp';
import QRCode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';
import { generateState, verifyState } from '../utils/oauthState';

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
    const {
      phone, code, name, user_type,
      company_name, company_reg_number, company_vat,
      mode, // 'login' | 'register' | undefined (legacy auto-create)
    } = req.body;
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

      // Enforce register/login intent when the client declares one. Falls
      // back to legacy auto-create if no `mode` is sent (backwards compat
      // for older mobile builds).
      if (mode === 'login' && !user) {
        return res.status(400).json({
          error: 'Šis telefona numurs nav reģistrēts.',
          code: 'NOT_REGISTERED',
          hint: 'register',
        });
      }
      if (mode === 'register' && user) {
        return res.status(400).json({
          error: 'Konts ar šo telefona numuru jau eksistē. Lūdzu, ienāciet sistēmā.',
          code: 'ALREADY_REGISTERED',
          hint: 'login',
        });
      }

      if (!user) {
        // Create new user via phone — includes company fields if the caller
        // supplied them (Register.tsx phone flow for B2B).
        const email = `${phone.replace(/\+/g, '')}@phone.local`; // Dummy email for schema
        const hash = await bcrypt.hash(Math.random().toString(36), 10); // Dummy password
        const role = (phone === '29469877' || phone === '+37129469877') ? 'admin' : 'user';
        const uType = user_type === 'b2b' ? 'b2b' : 'c2c';
        const info = await db.run(
          `INSERT INTO users (email, password_hash, name, phone, user_type, role,
                              company_name, company_reg_number, company_vat, points)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 50)`,
          [email, hash, name || 'User', phone, uType, role,
           company_name || null, company_reg_number || null, company_vat || null],
        );
        const userId = info.lastInsertRowid as number;
        await db.run(
          'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)',
          [userId, 50, 'Reģistrācijas bonuss'],
        );
        user = {
          id: userId, email, name: name || 'User', phone, role, user_type: uType,
          is_verified: 0, points: 50,
          company_name: company_name || null,
          company_reg_number: company_reg_number || null,
          company_vat: company_vat || null,
        };
      }

      // Phone login also steps up if the user has TOTP enabled. New
      // registrations never have TOTP enabled yet, so this only affects
      // the login path.
      if (user.totp_enabled) {
        const tempToken = jwt.sign(
          { userId: user.id, totp_pending: true },
          JWT_SECRET,
          { expiresIn: '5m' },
        );
        return res.json({ requires2FA: true, tempToken });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role, user_type: user.user_type, is_verified: user.is_verified, points: user.points, company_name: user.company_name, company_reg_number: user.company_reg_number, company_vat: user.company_vat } });
    } catch (error) {
      console.error("Error creating/logging in user:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Link an existing account to a phone number via SMS verification.
  // Prevents duplicate accounts when a user registered by email first and
  // later tries SMS login — they use this flow to attach their phone
  // instead of auto-creating a second account.
  router.post("/link-phone/request-otp", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Nav autorizēts' });

    const { phone } = req.body;
    if (!phone || !/^\+\d{7,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Nederīgs telefona numurs (formāts: +371XXXXXXXX)' });
    }

    const owner = await db.get<{ id: number }>('SELECT id FROM users WHERE phone = ?', [phone]);
    if (owner && owner.id !== userId) {
      return res.status(409).json({ error: 'Šis telefona numurs jau ir piesaistīts citam kontam' });
    }

    if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'SMS verifikācijas serviss nav konfigurēts' });
      }
      console.warn("Twilio is not configured. Simulating OTP for link-phone (dev only).");
      return res.json({ message: 'OTP sent (simulated)', simulated: true });
    }

    try {
      await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({ to: phone, channel: 'sms' });
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error("Twilio link-phone error:", error);
      res.status(500).json({ error: 'Neizdevās nosūtīt SMS kodu' });
    }
  });

  router.post("/link-phone/verify-otp", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Nav autorizēts' });

    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Telefons un kods ir obligāti' });

    const owner = await db.get<{ id: number }>('SELECT id FROM users WHERE phone = ?', [phone]);
    if (owner && owner.id !== userId) {
      return res.status(409).json({ error: 'Šis telefona numurs jau ir piesaistīts citam kontam' });
    }

    let isValid = false;
    if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'SMS verifikācijas serviss nav konfigurēts' });
      }
      isValid = code === '123456';
    } else {
      try {
        const verification = await twilioClient.verify.v2.services(TWILIO_VERIFY_SERVICE_SID)
          .verificationChecks.create({ to: phone, code });
        isValid = verification.status === 'approved';
      } catch (error) {
        console.error("Twilio link-phone verification error:", error);
        return res.status(500).json({ error: 'Neizdevās pārbaudīt kodu' });
      }
    }

    if (!isValid) return res.status(400).json({ error: 'Nepareizs SMS kods' });

    try {
      await db.run('UPDATE users SET phone = ? WHERE id = ?', [phone, userId]);
      const updated = await db.get<any>(
        'SELECT id, email, name, phone, role, user_type, is_verified, points FROM users WHERE id = ?',
        [userId],
      );
      res.json({ message: 'Telefons veiksmīgi piesaistīts', user: updated });
    } catch (error) {
      console.error("link-phone DB update error:", error);
      res.status(500).json({ error: 'Neizdevās saglabāt telefonu' });
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

      // TOTP step-up: if the user has enabled 2FA, the password is only the
      // first factor. Return a short-lived "pending" token that the client
      // exchanges on /2fa/verify with the 6-digit code.
      if (user.totp_enabled) {
        const tempToken = jwt.sign(
          { userId: user.id, totp_pending: true },
          JWT_SECRET,
          { expiresIn: '5m' },
        );
        return res.json({ requires2FA: true, tempToken });
      }

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

  // ── TOTP 2FA endpoints ──────────────────────────────────────────────────
  //
  // Flow:
  //   1. Client (logged in) POSTs /2fa/setup-init → gets a fresh secret + QR.
  //      The secret is NOT yet stored against the user — only returned so
  //      the client can render the QR. Client includes it as `pendingSecret`
  //      on the follow-up call so the server does not have to stash pending
  //      state between requests.
  //   2. Client POSTs /2fa/setup-confirm { pendingSecret, code } → server
  //      verifies the code against pendingSecret, encrypts the secret,
  //      stores it on users, generates 8 recovery codes, returns them once.
  //   3. During login, if totp_enabled=true, /login returns {requires2FA,
  //      tempToken} instead of the JWT. Client POSTs /2fa/verify
  //      { tempToken, code | recoveryCode } to receive the real JWT.
  //   4. Client (logged in) POSTs /2fa/disable { code } to turn 2FA off.

  function extractBearer(req: any): string | null {
    const h = req.headers.authorization as string | undefined;
    if (!h) return null;
    const parts = h.split(' ');
    return parts[1] || null;
  }

  function authenticatedUserId(req: any): number | null {
    const token = extractBearer(req);
    if (!token) return null;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; totp_pending?: boolean };
      if (decoded.totp_pending) return null; // pending tokens cannot access protected routes
      return decoded.userId;
    } catch { return null; }
  }

  router.post("/2fa/setup-init", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'No token' });
    try {
      const user = await db.get<{ email: string | null; totp_enabled: boolean | null }>(
        'SELECT email, totp_enabled FROM users WHERE id = ?', [userId],
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.totp_enabled) return res.status(400).json({ error: '2FA jau ir aktivizēts' });

      const secret = TOTP.generateSecret();
      const label = user.email || `BalticMarket user #${userId}`;
      const otpauthUrl = TOTP.buildOtpAuthUrl(secret, label);
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl, { margin: 1, width: 256 });

      res.json({ pendingSecret: secret, otpauthUrl, qrDataUrl });
    } catch (e: any) {
      if (e?.message === 'MISSING_KEY') {
        return res.status(503).json({ error: 'TOTP_ENCRYPTION_KEY nav konfigurēts serverī. Sazinieties ar atbalstu.' });
      }
      console.error('[2fa/setup-init]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post("/2fa/setup-confirm", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'No token' });

    const { pendingSecret, code } = req.body || {};
    if (typeof pendingSecret !== 'string' || pendingSecret.length < 16) {
      return res.status(400).json({ error: 'Nederīgs setup' });
    }
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Nederīgs 6-ciparu kods' });
    }

    try {
      if (!TOTP.verifyCode(pendingSecret, code)) {
        return res.status(400).json({ error: 'Nepareizs kods. Pārbaudiet laiku telefonā un mēģiniet vēlreiz.' });
      }

      const user = await db.get<{ totp_enabled: boolean | null }>(
        'SELECT totp_enabled FROM users WHERE id = ?', [userId],
      );
      if (user?.totp_enabled) return res.status(400).json({ error: '2FA jau aktivizēts' });

      const encrypted = TOTP.encryptSecret(pendingSecret);
      const recovery = await TOTP.generateRecoveryCodes();

      await db.transaction(async (client) => {
        await db.clientRun(
          client,
          `UPDATE users SET totp_secret_enc = ?, totp_enabled = true, totp_enabled_at = NOW() WHERE id = ?`,
          [encrypted, userId],
        );
        // Reset any previous recovery codes for this user (defensive — should
        // be none when enabling, but matches regenerate semantics).
        await db.clientRun(
          client,
          `UPDATE totp_recovery_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
          [userId],
        );
        for (const r of recovery) {
          await db.clientRun(
            client,
            `INSERT INTO totp_recovery_codes (user_id, code_hash) VALUES (?, ?) RETURNING id`,
            [userId, r.hash],
          );
        }
      });

      res.json({
        ok: true,
        recoveryCodes: recovery.map(r => r.plaintext),
        message: 'Saglabājiet rezerves kodus drošā vietā. Tie parādās tikai vienreiz.',
      });
    } catch (e: any) {
      if (e?.message === 'MISSING_KEY') {
        return res.status(503).json({ error: 'TOTP_ENCRYPTION_KEY nav konfigurēts serverī.' });
      }
      console.error('[2fa/setup-confirm]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post("/2fa/verify", authLimiter, async (req, res) => {
    const { tempToken, code, recoveryCode } = req.body || {};
    if (typeof tempToken !== 'string') return res.status(400).json({ error: 'tempToken required' });

    let decoded: { userId: number; totp_pending?: boolean };
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET) as typeof decoded;
    } catch {
      return res.status(401).json({ error: 'Derīguma termiņš beidzies. Ienāciet vēlreiz.' });
    }
    if (!decoded.totp_pending) return res.status(400).json({ error: 'Nederīgs tempToken' });

    try {
      const user = await db.get<any>(
        'SELECT id, email, name, phone, role, user_type, points, early_access_until, company_name, company_reg_number, company_vat, is_verified, totp_secret_enc FROM users WHERE id = ?',
        [decoded.userId],
      );
      if (!user?.totp_secret_enc) return res.status(400).json({ error: '2FA nav aktivizēts' });

      let pass = false;

      if (typeof code === 'string' && /^\d{6}$/.test(code.replace(/\s/g, ''))) {
        const secret = TOTP.decryptSecret(user.totp_secret_enc);
        pass = TOTP.verifyCode(secret, code);
      } else if (typeof recoveryCode === 'string' && recoveryCode.length >= 6) {
        const rows = await db.all<{ id: number; code_hash: string }>(
          `SELECT id, code_hash FROM totp_recovery_codes WHERE user_id = ? AND used_at IS NULL`,
          [user.id],
        );
        for (const r of rows) {
          if (await TOTP.matchRecoveryHash(recoveryCode, r.code_hash)) {
            await db.run(
              `UPDATE totp_recovery_codes SET used_at = NOW() WHERE id = ?`,
              [r.id],
            );
            pass = true;
            break;
          }
        }
      } else {
        return res.status(400).json({ error: 'Kods vai rezerves kods nav padots' });
      }

      if (!pass) return res.status(400).json({ error: 'Nepareizs kods' });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        token,
        user: {
          id: user.id, email: user.email, name: user.name, phone: user.phone,
          user_type: user.user_type, role: user.role, points: user.points,
          early_access_until: user.early_access_until,
          company_name: user.company_name, company_reg_number: user.company_reg_number,
          company_vat: user.company_vat, is_verified: user.is_verified,
        },
      });
    } catch (e: any) {
      if (e?.message === 'MISSING_KEY' || e?.message === 'MALFORMED_SECRET') {
        return res.status(503).json({ error: 'TOTP konfigurācija bojāta. Sazinieties ar atbalstu.' });
      }
      console.error('[2fa/verify]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post("/2fa/disable", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'No token' });

    const { code } = req.body || {};
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Ievadiet 6-ciparu kodu, lai apstiprinātu' });
    }

    try {
      const user = await db.get<{ totp_secret_enc: string | null; totp_enabled: boolean | null }>(
        'SELECT totp_secret_enc, totp_enabled FROM users WHERE id = ?', [userId],
      );
      if (!user?.totp_enabled || !user.totp_secret_enc) {
        return res.status(400).json({ error: '2FA nav aktivizēts' });
      }

      const secret = TOTP.decryptSecret(user.totp_secret_enc);
      if (!TOTP.verifyCode(secret, code)) {
        return res.status(400).json({ error: 'Nepareizs kods' });
      }

      await db.transaction(async (client) => {
        await db.clientRun(
          client,
          `UPDATE users SET totp_enabled = false, totp_secret_enc = NULL, totp_enabled_at = NULL WHERE id = ?`,
          [userId],
        );
        await db.clientRun(
          client,
          `UPDATE totp_recovery_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
          [userId],
        );
      });

      res.json({ ok: true, message: '2FA atslēgts' });
    } catch (e) {
      console.error('[2fa/disable]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post("/2fa/recovery-codes/regenerate", authLimiter, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'No token' });

    const { code } = req.body || {};
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Ievadiet 6-ciparu kodu, lai apstiprinātu' });
    }

    try {
      const user = await db.get<{ totp_secret_enc: string | null; totp_enabled: boolean | null }>(
        'SELECT totp_secret_enc, totp_enabled FROM users WHERE id = ?', [userId],
      );
      if (!user?.totp_enabled || !user.totp_secret_enc) {
        return res.status(400).json({ error: '2FA nav aktivizēts' });
      }
      const secret = TOTP.decryptSecret(user.totp_secret_enc);
      if (!TOTP.verifyCode(secret, code)) return res.status(400).json({ error: 'Nepareizs kods' });

      const recovery = await TOTP.generateRecoveryCodes();
      await db.transaction(async (client) => {
        await db.clientRun(
          client,
          `UPDATE totp_recovery_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL`,
          [userId],
        );
        for (const r of recovery) {
          await db.clientRun(
            client,
            `INSERT INTO totp_recovery_codes (user_id, code_hash) VALUES (?, ?) RETURNING id`,
            [userId, r.hash],
          );
        }
      });

      res.json({ ok: true, recoveryCodes: recovery.map(r => r.plaintext) });
    } catch (e) {
      console.error('[2fa/recovery-codes/regenerate]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── Google SSO ──────────────────────────────────────────────────────────
  //
  // Flow:
  //   GET /api/auth/google
  //     → generate stateless state JWT (30s TTL), set as HttpOnly cookie,
  //       redirect to accounts.google.com
  //   GET /api/auth/google/callback?code=&state=
  //     → verify state cookie matches query param (CSRF), exchange code for
  //       id_token, verify id_token via google-auth-library, find/link/create
  //       user, issue our JWT (or 2FA tempToken for admins with TOTP),
  //       redirect back to /login with the token in the query string.
  //
  // Account linking policy:
  //   1. Primary: user_identities (provider='google', provider_uid=<sub>)
  //   2. Fallback if email_verified=true: existing users.email case-insensitive
  //   3. Otherwise: create new user + link

  const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';
  const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

  function buildCallbackUri(): string {
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    return `${base}${GOOGLE_CALLBACK_PATH}`;
  }

  function ssoRedirect(res: any, params: Record<string, string>): void {
    const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const qs = new URLSearchParams(params).toString();
    res.redirect(`${base}/login?${qs}`);
  }

  router.get('/google', authLimiter, (req: any, res) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) return ssoRedirect(res, { sso_error: 'Google SSO nav konfigurēts' });

    const state = generateState('google', JWT_SECRET);
    res.cookie('oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 1000, // 60s — a hair longer than the 30s JWT TTL to avoid race
      path: '/',
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: buildCallbackUri(),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  });

  router.get('/google/callback', authLimiter, async (req: any, res) => {
    const clearStateCookie = () =>
      res.clearCookie('oauth_state', { httpOnly: true, path: '/', sameSite: 'lax' });

    try {
      const { code, state, error } = req.query as Record<string, string | undefined>;
      const cookieState = req.cookies?.oauth_state;

      clearStateCookie();

      if (error) return ssoRedirect(res, { sso_error: `Google atteicās autentificēt (${error})` });
      if (!code || !state) return ssoRedirect(res, { sso_error: 'Trūkst OAuth atbildes parametru' });

      const statePayload = verifyState(state, cookieState, 'google', JWT_SECRET);
      if (!statePayload) return ssoRedirect(res, { sso_error: 'Nederīgs state (CSRF aizsardzība)' });

      const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        return ssoRedirect(res, { sso_error: 'Google SSO nav konfigurēts serverī' });
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: buildCallbackUri(),
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenRes.ok) {
        const body = await tokenRes.text();
        console.error('[google/callback] token exchange failed', body);
        return ssoRedirect(res, { sso_error: 'Neizdevās apmainīt kodu pret token' });
      }
      const tokenPayload = await tokenRes.json() as { id_token?: string };
      if (!tokenPayload.id_token) return ssoRedirect(res, { sso_error: 'Nav id_token atbildē' });

      // Verify id_token signature, issuer, audience, expiry.
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: tokenPayload.id_token, audience: clientId });
      const p = ticket.getPayload();
      if (!p || !p.sub) return ssoRedirect(res, { sso_error: 'Nederīgs id_token' });

      const sub = p.sub;
      const googleEmail = (p.email || '').toLowerCase();
      const emailVerified = p.email_verified === true;
      const displayName = p.name || googleEmail.split('@')[0] || 'User';

      // 1. Primary: look up by (provider, provider_uid)
      let linked = await db.get<{ user_id: number }>(
        `SELECT user_id FROM user_identities WHERE provider = 'google' AND provider_uid = ?`,
        [sub],
      );
      let userId: number;

      if (linked) {
        userId = linked.user_id;
      } else if (emailVerified && googleEmail) {
        // 2. Fallback: match existing account by verified email, then link
        const existing = await db.get<{ id: number }>(
          `SELECT id FROM users WHERE LOWER(email) = ?`,
          [googleEmail],
        );
        if (existing) {
          await db.run(
            `INSERT INTO user_identities (user_id, provider, provider_uid, email_at_link)
             VALUES (?, 'google', ?, ?) RETURNING id`,
            [existing.id, sub, googleEmail],
          );
          userId = existing.id;
        } else {
          // 3. Create new user + link
          const dummyPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
          const role = googleEmail === 'valdis.nipers@gmail.com' ? 'admin' : 'user';
          const info = await db.run(
            `INSERT INTO users (email, password_hash, name, user_type, role, is_verified, points)
             VALUES (?, ?, ?, 'c2c', ?, 1, 50)`,
            [googleEmail, dummyPasswordHash, displayName, role],
          );
          userId = info.lastInsertRowid as number;
          await db.run(
            `INSERT INTO points_history (user_id, points, reason) VALUES (?, 50, 'Reģistrācijas bonuss (Google)') RETURNING id`,
            [userId],
          );
          await db.run(
            `INSERT INTO user_identities (user_id, provider, provider_uid, email_at_link)
             VALUES (?, 'google', ?, ?) RETURNING id`,
            [userId, sub, googleEmail],
          );
        }
      } else {
        return ssoRedirect(res, { sso_error: 'Google email nav apstiprināts — reģistrācija bloķēta' });
      }

      // Load user for admin + TOTP check
      const user = await db.get<any>(
        `SELECT id, email, name, phone, role, user_type, points, early_access_until,
                company_name, company_reg_number, company_vat, is_verified, totp_enabled
         FROM users WHERE id = ?`,
        [userId],
      );

      // Admin policy: admin accounts with TOTP still get a step-up even
      // after Google SSO, so platform control is never reduced to a Google
      // account compromise.
      if (user.role === 'admin' && user.totp_enabled) {
        const tempToken = jwt.sign(
          { userId: user.id, totp_pending: true },
          JWT_SECRET,
          { expiresIn: '5m' },
        );
        return ssoRedirect(res, { sso_2fa: '1', sso_temp: tempToken });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      // Mint a tiny payload the client can base64-decode if it wants (avoids
      // another /me round-trip on redirect). But the canonical path is still
      // signIn(token, user) from the Login page.
      return ssoRedirect(res, { sso_token: token });
    } catch (e: any) {
      console.error('[google/callback]', e);
      return ssoRedirect(res, { sso_error: 'Neizdevās pabeigt Google ienākšanu' });
    }
  });

  router.get("/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat, company_address, b2b_subscription_status, stripe_customer_id, totp_enabled FROM users WHERE id = ?', [decoded.userId]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
}
