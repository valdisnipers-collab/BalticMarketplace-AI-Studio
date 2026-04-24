// scripts/test-auth-flows.mjs
//
// End-to-end security smoke test for all BalticMarket auth flows. Hits a
// running dev server (default http://localhost:3000) that is connected to
// the real Neon DB, runs the full matrix of positive and negative cases,
// and cleans up any synthetic test rows (test phones) at the end.
//
// Usage: npm run test:auth
// Env: BASE=http://localhost:3000 (override) TEST_EMAIL=<admin email> TEST_PASSWORD=<admin pwd>

import 'dotenv/config';
import pg from 'pg';
import { createHash, randomBytes } from 'crypto';
import { authenticator } from 'otplib';

const BASE = process.env.BASE || 'http://localhost:3000';
const EMAIL = process.env.TEST_EMAIL || 'valdis.nipers@gmail.com';
const PASSWORD = process.env.TEST_PASSWORD || 'Klosteris1977';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Unique synthetic phones for this run (timestamp suffix so multiple test
// runs in parallel never collide).
const stamp = Date.now().toString().slice(-6);
const PHONE_UNREG = `+37120000${stamp.slice(-3)}`;
const PHONE_B2B = `+37129000${stamp.slice(-3)}`;
const PHONE_LEGACY = `+37121000${stamp.slice(-3)}`;

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const icon = pass ? '✓' : '✗';
  const color = pass ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
}

let reqCounter = 0;
async function req(path, { method = 'POST', body, token } = {}) {
  reqCounter += 1;
  // Rotate a synthetic X-Forwarded-For per request so the authLimiter
  // (keyed on client IP via trust-proxy) does not throttle the test sweep.
  // Only meaningful against a local dev server; production ingress will
  // overwrite this header.
  const fakeIp = `10.0.${Math.floor(reqCounter / 254)}.${(reqCounter % 254) + 1}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': fakeIp,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function cleanupSyntheticPhones() {
  await pool.query(
    `DELETE FROM users WHERE phone IN ($1, $2, $3)`,
    [PHONE_UNREG, PHONE_B2B, PHONE_LEGACY],
  );
}

async function main() {
  // Pre-flight: ensure the admin user exists. If the password was rotated
  // outside this script, set TEST_PASSWORD before running.
  const pre = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  if (pre.status !== 200) {
    console.error(`\x1b[31mPre-flight login failed (status ${pre.status}). Set TEST_EMAIL/TEST_PASSWORD to match a real account.\x1b[0m`);
    process.exit(2);
  }
  const adminToken = pre.data.token;

  // ─────────────────────────────────────────────────────────────────────────
  // Section A — Email login + /me
  // ─────────────────────────────────────────────────────────────────────────
  let r;

  r = await req('/api/auth/login', { body: { email: EMAIL, password: 'wrong-password-1234' } });
  record('login: wrong password → 400', r.status === 400, `status=${r.status}`);

  r = await req('/api/auth/me', { method: 'GET' });
  record('/me without token → 401', r.status === 401, `status=${r.status}`);

  r = await req('/api/auth/me', { method: 'GET', token: 'invalid.token.here' });
  record('/me with invalid token → 401', r.status === 401, `status=${r.status}`);

  r = await req('/api/auth/me', { method: 'GET', token: adminToken });
  const meOk = r.status === 200 && r.data.user?.email?.toLowerCase() === EMAIL.toLowerCase();
  record('/me with valid token → 200 + user', meOk, `status=${r.status}, role=${r.data.user?.role}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Section B — Password reset: request (enumeration)
  // ─────────────────────────────────────────────────────────────────────────

  r = await req('/api/auth/request-password-reset', { body: { email: EMAIL } });
  const msgKnown = r.data.message;
  record('reset-request: known email → 200', r.status === 200, `msg="${msgKnown?.slice(0, 50)}..."`);

  r = await req('/api/auth/request-password-reset', { body: { email: `noone-${stamp}@nowhere.test` } });
  const msgUnknown = r.data.message;
  record('reset-request: unknown email → 200 (no enumeration)', r.status === 200 && msgKnown === msgUnknown,
    `same message=${msgKnown === msgUnknown}`);

  r = await req('/api/auth/request-password-reset', { body: { email: 'not-an-email' } });
  record('reset-request: invalid email → 400', r.status === 400, `status=${r.status}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Section C — Password reset: token lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  // Inject a known test token for our admin user so we can exercise the
  // reset endpoint without reading from an inbox.
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const userRow = await pool.query('SELECT id FROM users WHERE LOWER(email) = $1', [EMAIL.toLowerCase()]);
  const userId = userRow.rows[0].id;

  // Any previous unused tokens for this user must be invalidated first —
  // otherwise the reset-request call above may have replaced all tokens
  // with newer ones.
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
    [userId],
  );
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  r = await req('/api/auth/reset-password', { body: { token: 'a'.repeat(64), newPassword: PASSWORD } });
  record('reset: garbage token → 400', r.status === 400, `error="${r.data.error}"`);

  r = await req('/api/auth/reset-password', { body: { token: rawToken, newPassword: 'short' } });
  record('reset: weak password (<10) → 400', r.status === 400, `error="${r.data.error}"`);

  r = await req('/api/auth/reset-password', { body: { token: rawToken, newPassword: 'password1234' } });
  record('reset: breached password → 400', r.status === 400 && /nopludināta/i.test(r.data.error || ''),
    `error="${r.data.error}"`);

  r = await req('/api/auth/reset-password', { body: { token: rawToken, newPassword: PASSWORD } });
  record('reset: valid token + strong password → 200', r.status === 200, `msg="${r.data.message}"`);

  r = await req('/api/auth/reset-password', { body: { token: rawToken, newPassword: PASSWORD } });
  record('reset: reuse same token → 400 (one-time)', r.status === 400, `error="${r.data.error}"`);

  // Confirm login still works with the reset password
  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  record('post-reset login → 200', r.status === 200, `role=${r.data.user?.role}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Section D — Phone mode separation
  // ─────────────────────────────────────────────────────────────────────────

  await cleanupSyntheticPhones();

  r = await req('/api/auth/verify-otp', {
    body: { phone: PHONE_UNREG, code: '123456', mode: 'login' },
  });
  record('phone login: unregistered → 400 NOT_REGISTERED',
    r.status === 400 && r.data.code === 'NOT_REGISTERED',
    `code=${r.data.code}`);

  r = await req('/api/auth/verify-otp', {
    body: {
      phone: PHONE_B2B, code: '123456', mode: 'register',
      name: 'Test B2B', user_type: 'b2b',
      company_name: 'Test SIA', company_reg_number: '40003000000', company_vat: 'LV40003000000',
    },
  });
  record('phone register: new + B2B → 200',
    r.status === 200 && r.data.user?.user_type === 'b2b',
    `user_id=${r.data.user?.id}, company=${r.data.user?.company_name}`);

  // Verify B2B fields persisted
  const b2bRow = await pool.query(
    'SELECT user_type, company_name, company_reg_number, company_vat, points FROM users WHERE phone = $1',
    [PHONE_B2B],
  );
  const b2b = b2bRow.rows[0] || {};
  const b2bOk = b2b.user_type === 'b2b' && b2b.company_name === 'Test SIA' && b2b.company_reg_number === '40003000000' && b2b.points === 50;
  record('phone register: B2B company fields persisted', b2bOk,
    `user_type=${b2b.user_type}, company=${b2b.company_name}, points=${b2b.points}`);

  r = await req('/api/auth/verify-otp', {
    body: { phone: PHONE_B2B, code: '123456', mode: 'register' },
  });
  record('phone register: already registered → 400 ALREADY_REGISTERED',
    r.status === 400 && r.data.code === 'ALREADY_REGISTERED',
    `code=${r.data.code}`);

  r = await req('/api/auth/verify-otp', {
    body: { phone: PHONE_B2B, code: '123456', mode: 'login' },
  });
  record('phone login: registered → 200',
    r.status === 200 && r.data.user?.phone === PHONE_B2B,
    `user_id=${r.data.user?.id}`);

  r = await req('/api/auth/verify-otp', {
    body: { phone: PHONE_LEGACY, code: '123456', name: 'Legacy Client' },
  });
  record('phone verify-otp: no mode (legacy auto-create) → 200',
    r.status === 200 && r.data.user?.phone === PHONE_LEGACY,
    `user_id=${r.data.user?.id}`);

  // ─────────────────────────────────────────────────────────────────────────
  // Section E — TOTP 2FA lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  // Clean any leftover 2FA state on the admin user from a previous run.
  await pool.query(
    `UPDATE users SET totp_enabled = false, totp_secret_enc = NULL, totp_enabled_at = NULL WHERE id = $1`,
    [userId],
  );
  await pool.query(`DELETE FROM totp_recovery_codes WHERE user_id = $1`, [userId]);

  // Fresh session token for authenticated 2FA endpoints.
  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const sessionToken = r.data.token;
  record('2fa baseline: login returns plain JWT (no 2FA yet)',
    r.status === 200 && !r.data.requires2FA && !!sessionToken);

  r = await req('/api/auth/2fa/setup-init', { token: sessionToken });
  const pendingSecret = r.data.pendingSecret;
  record('2fa setup-init: returns pendingSecret + QR',
    r.status === 200 && !!pendingSecret && typeof r.data.qrDataUrl === 'string' && r.data.qrDataUrl.startsWith('data:image/'));

  r = await req('/api/auth/2fa/setup-confirm', {
    token: sessionToken,
    body: { pendingSecret, code: '000000' },
  });
  record('2fa setup-confirm: wrong code → 400', r.status === 400);

  const firstCode = authenticator.generate(pendingSecret);
  r = await req('/api/auth/2fa/setup-confirm', {
    token: sessionToken,
    body: { pendingSecret, code: firstCode },
  });
  const recovery = r.data.recoveryCodes || [];
  record('2fa setup-confirm: correct code → 200 + 8 recovery codes',
    r.status === 200 && recovery.length === 8);

  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const tempToken = r.data.tempToken;
  record('login with 2FA enabled: returns requires2FA + tempToken',
    r.status === 200 && r.data.requires2FA === true && !!tempToken);

  r = await req('/api/auth/2fa/verify', { body: { tempToken, code: '000000' } });
  record('2fa verify: wrong code → 400', r.status === 400);

  const nowCode = authenticator.generate(pendingSecret);
  r = await req('/api/auth/2fa/verify', { body: { tempToken, code: nowCode } });
  record('2fa verify: correct code → 200 + full JWT',
    r.status === 200 && !!r.data.token && r.data.user?.role === 'admin');

  // Fresh tempToken for the recovery-code path
  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const tempToken2 = r.data.tempToken;
  r = await req('/api/auth/2fa/verify', { body: { tempToken: tempToken2, recoveryCode: recovery[0] } });
  record('2fa verify: recovery code accepted → 200', r.status === 200 && !!r.data.token);

  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const tempToken3 = r.data.tempToken;
  r = await req('/api/auth/2fa/verify', { body: { tempToken: tempToken3, recoveryCode: recovery[0] } });
  record('2fa verify: reuse recovery code → 400 (one-time)', r.status === 400);

  r = await req('/api/auth/2fa/recovery-codes/regenerate', {
    token: sessionToken,
    body: { code: authenticator.generate(pendingSecret) },
  });
  record('2fa regenerate: returns 8 fresh recovery codes',
    r.status === 200 && (r.data.recoveryCodes?.length === 8));

  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  const tempToken4 = r.data.tempToken;
  r = await req('/api/auth/2fa/verify', { body: { tempToken: tempToken4, recoveryCode: recovery[1] } });
  record('2fa verify: old recovery code after regenerate → 400', r.status === 400);

  r = await req('/api/auth/2fa/disable', {
    token: sessionToken,
    body: { code: authenticator.generate(pendingSecret) },
  });
  record('2fa disable: correct code → 200', r.status === 200);

  r = await req('/api/auth/login', { body: { email: EMAIL, password: PASSWORD } });
  record('login after 2fa disabled: plain JWT again',
    r.status === 200 && !r.data.requires2FA && !!r.data.token);

  // ─────────────────────────────────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────────────────────────────────

  const cleaned = await pool.query(
    `DELETE FROM users WHERE phone IN ($1, $2, $3) RETURNING id`,
    [PHONE_UNREG, PHONE_B2B, PHONE_LEGACY],
  );
  record(`cleanup: deleted ${cleaned.rowCount} synthetic test phones`, true);

  // Summary
  const pass = results.filter(r => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass}/${results.length} passed\x1b[0m`);
  if (fail > 0) {
    console.log('\nFailed tests:');
    for (const r of results.filter(r => !r.pass)) console.log(`  - ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

try {
  await main();
} catch (e) {
  console.error('\x1b[31mFATAL:\x1b[0m', e?.message || e);
  process.exit(2);
} finally {
  await pool.end();
}
