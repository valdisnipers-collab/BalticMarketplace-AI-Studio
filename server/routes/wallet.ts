import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';
import Stripe from 'stripe';

export function createWalletRouter(deps: { getStripe: () => Stripe }) {
  const router = Router();

  router.get('/wallet/points-history', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const history = await db.all('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC', [decoded.userId]);
      res.json(history);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ error: 'Server error fetching points history' });
    }
  });

  router.get('/wallet/balance', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number } | undefined;

      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ balance: user.balance || 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ error: 'Server error fetching balance' });
    }
  });

  router.get('/settings', async (req, res) => {
    try {
      const settings = await db.all('SELECT key, value FROM settings', []) as { key: string, value: string }[];
      const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {} as Record<string, string>);
      res.json(settingsMap);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: 'Server error fetching settings' });
    }
  });

  router.put('/settings', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await db.get('SELECT role FROM users WHERE id = ?', [decoded.userId]) as { role: string };
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const settings = req.body; // Record<string, string>
      await db.transaction(async (client) => {
        for (const [key, value] of Object.entries(settings)) {
          await db.clientRun(client, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, String(value)]);
        }
      });
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: 'Server error updating settings' });
    }
  });

  router.post('/wallet/buy-early-access', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

      // Fetch settings
      const priceSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['early_access_price']) as any;
      const durationSetting = await db.get('SELECT value FROM settings WHERE key = ?', ['early_access_duration_hours']) as any;

      const price = priceSetting ? parseInt(priceSetting.value, 10) : 150;
      const durationHours = durationSetting ? parseInt(durationSetting.value, 10) : 24;

      // Check points
      const user = await db.get('SELECT points, early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;
      if (!user || user.points < price) {
        return res.status(400).json({ error: `Nepietiekams punktu skaits (nepieciešami ${price} punkti)` });
      }

      // Calculate new early access until
      let newEarlyAccessUntil = new Date();
      if (user.early_access_until) {
        const currentEarlyAccess = new Date(user.early_access_until);
        if (currentEarlyAccess > newEarlyAccessUntil) {
          newEarlyAccessUntil = currentEarlyAccess;
        }
      }
      // Add duration
      newEarlyAccessUntil.setHours(newEarlyAccessUntil.getHours() + durationHours);

      // Deduct points and update early access
      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE users SET points = points - ?, early_access_until = ? WHERE id = ?', [price, newEarlyAccessUntil.toISOString(), decoded.userId]);
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -price, `Agrā piekļuve (${durationHours}h)`]);
      });

      // Fetch updated user to return new points balance and early access
      const updatedUser = await db.get('SELECT points, early_access_until FROM users WHERE id = ?', [decoded.userId]) as any;

      res.json({
        message: 'Agrā piekļuve veiksmīgi iegādāta',
        points: updatedUser.points,
        early_access_until: updatedUser.early_access_until
      });
    } catch (error) {
      console.error("Error buying early access:", error);
      res.status(500).json({ error: 'Server error buying early access' });
    }
  });

  router.post('/wallet/deduct', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, reason } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const user = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number } | undefined;

      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.balance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      await db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, decoded.userId]);

      const updatedUser = await db.get('SELECT balance FROM users WHERE id = ?', [decoded.userId]) as { balance: number };
      res.json({ message: 'Funds deducted successfully', balance: updatedUser.balance });
    } catch (error) {
      console.error("Error deducting funds:", error);
      res.status(500).json({ error: 'Server error deducting funds' });
    }
  });

  return router;
}
