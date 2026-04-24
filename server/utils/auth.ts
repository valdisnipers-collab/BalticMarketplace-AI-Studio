// server/utils/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production (min 16 chars)');
  }
  console.warn('[auth] JWT_SECRET not set — using dev fallback. Set JWT_SECRET before deploying.');
  return 'super-secret-dev-key-change-in-production';
}

export const JWT_SECRET = resolveJwtSecret();

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function isAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
  let decoded: { userId: number };
  try {
    decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  try {
    const user = await db.get(
      'SELECT role, is_banned FROM users WHERE id = $1',
      [decoded.userId],
    ) as { role: string; is_banned: boolean | null } | null;
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.is_banned) return res.status(403).json({ error: 'Account is banned' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export function verifyTokenOptional(authHeader: string | undefined): number | null {
  if (!authHeader) return null;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
}

export function verifyTokenForSocket(token: string | undefined): number | null {
  if (!token || typeof token !== 'string') return null;
  const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
  try {
    const decoded = jwt.verify(raw, JWT_SECRET) as { userId: number };
    return typeof decoded.userId === 'number' ? decoded.userId : null;
  } catch {
    return null;
  }
}
