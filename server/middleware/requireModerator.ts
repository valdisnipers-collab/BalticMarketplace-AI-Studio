// server/middleware/requireModerator.ts
//
// Accepts `admin` and `moderator` roles. Used on moderation-specific
// endpoints (moderation queue, reports, listing approve/reject) where we
// want a dedicated moderation staff without handing out full admin rights.

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';

export async function requireModerator(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader.split(' ')[1];

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
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Forbidden: Admins or moderators only' });
    }
    (req as any).userId = decoded.userId;
    (req as any).userRole = user.role;
    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
}
