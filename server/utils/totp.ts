// TOTP 2FA utilities.
//
// - Generates RFC 6238 TOTP secrets (32 chars base32).
// - Encrypts secrets at rest with AES-256-GCM using TOTP_ENCRYPTION_KEY from
//   env. Format stored in DB: base64(iv):base64(authTag):base64(ciphertext).
// - Verifies 6-digit codes with a small window (default ±1 step = 30s drift).
// - Generates 8 one-time recovery codes and returns them plaintext once;
//   only a bcrypt hash per code lives in the DB.
//
// If TOTP_ENCRYPTION_KEY is missing, every function that needs encryption
// throws MISSING_KEY — the caller should refuse to enable 2FA in that case.

import { authenticator } from 'otplib';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import bcrypt from 'bcryptjs';

const ISSUER = 'BalticMarket';
const RECOVERY_CODE_COUNT = 8;

// Allow a ±1 period (30s) of clock drift when verifying TOTP codes.
authenticator.options = { window: 1 };

function getEncKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (!raw) throw new Error('MISSING_KEY');
  // Accept base64 or raw 32-byte key.
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    const rawBuf = Buffer.from(raw, 'utf8');
    if (rawBuf.length !== 32) throw new Error('INVALID_KEY_LENGTH');
    return rawBuf;
  }
  return buf;
}

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function encryptSecret(secret: string): string {
  const key = getEncKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(stored: string): string {
  const key = getEncKey();
  const [ivB64, tagB64, encB64] = stored.split(':');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('MALFORMED_SECRET');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function buildOtpAuthUrl(secret: string, accountLabel: string): string {
  return authenticator.keyuri(accountLabel, ISSUER, secret);
}

export function verifyCode(secret: string, code: string): boolean {
  if (typeof code !== 'string') return false;
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) return false;
  try {
    return authenticator.check(normalized, secret);
  } catch {
    return false;
  }
}

export interface RecoveryPair {
  plaintext: string;   // shown to the user once
  hash: string;        // stored in DB
}

// 8 codes of 10 alphanumeric chars (format XXXXX-XXXXX). Predictable format
// helps the user visually compare; crypto randomness comes from randomBytes.
export async function generateRecoveryCodes(): Promise<RecoveryPair[]> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/1/O/I to avoid confusion
  const out: RecoveryPair[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const bytes = randomBytes(10);
    let s = '';
    for (let j = 0; j < 10; j++) s += chars[bytes[j] % chars.length];
    const plaintext = `${s.slice(0, 5)}-${s.slice(5)}`; // what the user sees
    // Hash the normalized form so "ABCDE-12345" and "abcde12345" both match.
    const hash = await bcrypt.hash(normalizeRecoveryCode(plaintext), 10);
    out.push({ plaintext, hash });
  }
  return out;
}

export function normalizeRecoveryCode(input: string): string {
  return String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function matchRecoveryHash(input: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizeRecoveryCode(input), hash);
}
