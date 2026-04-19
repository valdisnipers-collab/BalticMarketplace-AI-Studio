// server/utils/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-in-production';

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
    const user = await db.get('SELECT role FROM users WHERE id = $1', [decoded.userId]) as { role: string } | null;
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });
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
