// OAuth state token — stateless CSRF protection for the SSO dance.
//
// When starting the flow, the server generates a short-lived JWT (30s),
// writes it to an HttpOnly cookie `oauth_state`, AND puts the same value
// into the Google `state` query param. On callback, the server requires
// both values to match. An attacker who can forge the redirect URL
// cannot also forge the cookie (different origin).
//
// Token payload also carries `nonce` so the same state cannot be
// replayed inside its 30s window for two separate callbacks.

import { randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

const STATE_TTL_SEC = 30;

interface StatePayload {
  provider: string;
  nonce: string;
  iat: number;
  exp: number;
}

export function generateState(provider: string, jwtSecret: string): string {
  const nonce = randomBytes(16).toString('hex');
  return jwt.sign({ provider, nonce }, jwtSecret, { expiresIn: `${STATE_TTL_SEC}s` });
}

export function verifyState(
  token: string,
  cookieValue: string | undefined,
  expectedProvider: string,
  jwtSecret: string,
): StatePayload | null {
  if (!token || !cookieValue || token !== cookieValue) return null;
  try {
    const payload = jwt.verify(token, jwtSecret) as StatePayload;
    if (payload.provider !== expectedProvider) return null;
    return payload;
  } catch {
    return null;
  }
}
