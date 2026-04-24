// Password validation — length + optional "have I been pwned" check.
//
// The pwned check uses k-anonymity: we hash the password with SHA-1 locally,
// send only the first 5 chars of the hash to the public API, and scan the
// returned list for the rest. The password never leaves the server.
//
// If the haveibeenpwned API is unreachable (network blip, timeout), we fail
// open (allow the password) — denying password resets because an external
// service is down is worse than briefly accepting a slightly weaker password.

import { createHash } from 'crypto';

const MIN_LENGTH = 10;
const MAX_LENGTH = 200;
const PWNED_API = 'https://api.pwnedpasswords.com/range';
const PWNED_TIMEOUT_MS = 1500;

export interface PasswordValidationResult {
  ok: boolean;
  error?: string;
}

export async function validatePassword(pwd: unknown): Promise<PasswordValidationResult> {
  if (typeof pwd !== 'string') {
    return { ok: false, error: 'Parolei jābūt virknei' };
  }
  if (pwd.length < MIN_LENGTH) {
    return { ok: false, error: `Parolei jābūt vismaz ${MIN_LENGTH} simbolus garai` };
  }
  if (pwd.length > MAX_LENGTH) {
    return { ok: false, error: 'Parole pārāk gara' };
  }

  if (await isBreached(pwd)) {
    return {
      ok: false,
      error: 'Šī parole ir nopludināta publiskos datu noplūdes sarakstos. Lūdzu, izvēlieties citu.',
    };
  }

  return { ok: true };
}

async function isBreached(pwd: string): Promise<boolean> {
  try {
    const sha1 = createHash('sha1').update(pwd).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PWNED_TIMEOUT_MS);
    const res = await fetch(`${PWNED_API}/${prefix}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'BalticMarket/1.0' },
    });
    clearTimeout(timer);

    if (!res.ok) return false;
    const body = await res.text();
    // Response format: "<suffix>:<count>\r\n<suffix>:<count>\r\n..."
    const lines = body.split('\n');
    for (const line of lines) {
      const [lineSuffix] = line.split(':');
      if (lineSuffix?.trim().toUpperCase() === suffix) return true;
    }
    return false;
  } catch {
    // Network error / timeout → fail open.
    return false;
  }
}
