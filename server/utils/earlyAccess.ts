import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from './auth';

export async function hasEarlyAccess(req: any): Promise<{ hasAccess: boolean; userId: number | null }> {
  const authHeader = req.headers.authorization;
  if (!authHeader) return { hasAccess: false, userId: null };
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await db.get('SELECT early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;
    if (user && user.early_access_until) {
      const earlyAccessUntil = new Date(user.early_access_until);
      if (earlyAccessUntil > new Date()) {
        return { hasAccess: true, userId: decoded.userId };
      }
    }
    return { hasAccess: false, userId: decoded.userId };
  } catch (e) {
    return { hasAccess: false, userId: null };
  }
}
