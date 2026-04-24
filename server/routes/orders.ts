import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';
import { sendPushToUser } from '../services/push';
import { sendEmail, emailTemplates } from '../services/email';
import { checkAndAwardBadges, recalculateTrustScore } from '../utils/badges';
import type { Server as SocketIOServer } from 'socket.io';

export function createOrdersRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  router.post('/:id/ship', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.seller_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (order.status !== 'paid') return res.status(400).json({ error: 'Order is not in paid status' });

      await db.run('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['shipped', orderId]);

      const listing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      io.to(`user_${order.buyer_id}`).emit('order_shipped', {
        id: orderId,
        listing_title: listing?.title || 'Prece'
      });

      sendPushToUser(order.buyer_id, {
        title: 'Pasūtījums nosūtīts',
        body: `"${listing?.title ?? 'Prece'}" ir ceļā uz jums`,
        url: `/profile?tab=orders`,
      }).catch(e => console.error('Push error:', e));

      const buyer = await db.get('SELECT email, name FROM users WHERE id = ?', [order.buyer_id]) as any;
      if (buyer?.email) {
        const tmpl = emailTemplates.orderShipped(buyer.name || buyer.username, listing?.title ?? 'Prece', Number(orderId));
        sendEmail(buyer.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
      }

      res.json({ message: 'Order marked as shipped' });
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/confirm', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyer_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (order.status !== 'shipped') return res.status(400).json({ error: 'Order is not shipped yet' });

      // Refuse confirmation while an open dispute exists on this order — otherwise
      // the buyer could release funds to the seller mid-dispute.
      const openDispute = await db.get(
        "SELECT id FROM disputes WHERE order_id = ? AND status = 'open' LIMIT 1",
        [orderId]
      );
      if (openDispute) {
        return res.status(409).json({ error: 'Pasūtījumu nevar apstiprināt, kamēr pastāv atvērts strīds' });
      }

      // Begin transaction — use a conditional UPDATE so concurrent confirm
      // calls cannot double-transfer funds if the request is replayed.
      let transferred = false;
      await db.transaction(async (client) => {
        const result = await db.clientRun(
          client,
          "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'shipped'",
          ['completed', orderId]
        );
        const changed = (result as any)?.changes ?? (result as any)?.rowCount ?? 0;
        if (!changed) return;
        transferred = true;
        await db.clientRun(client, 'UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);
      });
      if (!transferred) {
        return res.status(409).json({ error: 'Pasūtījums jau ir apstiprināts vai stāvoklis mainīts' });
      }

      const listing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      io.to(`user_${order.seller_id}`).emit('order_completed', {
        id: orderId,
        listing_title: listing?.title || 'Prece',
        amount: order.amount
      });

      sendPushToUser(order.seller_id, {
        title: 'Nauda ieskaitīta',
        body: `€${order.amount} par "${listing?.title ?? 'Prece'}"`,
        url: `/profile?tab=wallet`,
      }).catch(e => console.error('Push error:', e));

      await checkAndAwardBadges(order.seller_id);
      recalculateTrustScore(order.seller_id).catch(() => {});

      const seller = await db.get('SELECT email, name FROM users WHERE id = ?', [order.seller_id]) as any;
      const completedListing = await db.get('SELECT title FROM listings WHERE id = ?', [order.listing_id]) as any;
      if (seller?.email) {
        const tmpl = emailTemplates.orderCompleted(seller.name || seller.username, completedListing?.title ?? 'Prece', order.amount);
        sendEmail(seller.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
      }

      res.json({ message: 'Order confirmed and funds transferred' });
    } catch (error) {
      console.error("Error confirming order:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/:id/dispute', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const orderId = req.params.id;
      const { reason, description } = req.body;

      if (!reason) return res.status(400).json({ error: 'Reason is required' });

      const order = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]) as any;
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.buyer_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });

      if (!['paid', 'shipped'].includes(order.status)) {
        return res.status(400).json({ error: 'Order status does not allow dispute' });
      }

      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['disputed', orderId]);
        await db.clientRun(client, 'INSERT INTO disputes (order_id, user_id, reason, description) VALUES (?, ?, ?, ?)', [orderId, decoded.userId, reason, description]);

        await db.clientRun(client, `
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES (?, 'system', 'Strīds pieteikts', ?, ?)
        `, [order.seller_id, `Pircējs ir pieteicis strīdu pasūtījumam #${orderId}.`, `/profile?tab=orders`]);
      });

      res.json({ message: 'Dispute opened successfully' });
    } catch (error) {
      console.error("Error opening dispute:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
