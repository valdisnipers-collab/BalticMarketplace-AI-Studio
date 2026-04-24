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

      // Record seller revenue in time-series stats for the analytics chart.
      db.run(
        `INSERT INTO user_daily_stats (user_id, date, revenue)
         VALUES (?, CURRENT_DATE, ?)
         ON CONFLICT (user_id, date) DO UPDATE SET revenue = user_daily_stats.revenue + EXCLUDED.revenue`,
        [order.seller_id, order.amount]
      ).catch(e => console.error('[user_daily_stats]', e));

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

  // GET /api/orders/:id/invoice-html — printable invoice.
  // Access: admin, buyer, or seller only.
  router.get('/:id/invoice-html', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).send('Unauthorized');
    const token = authHeader.split(' ')[1];
    let decoded: { userId: number };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).send('Invalid token');
    }

    try {
      const orderId = req.params.id;
      const order = await db.get<any>(
        `SELECT o.*, l.title AS listing_title,
                b.id AS buyer_id, b.name AS buyer_name, b.email AS buyer_email,
                b.company_name AS buyer_company, b.company_reg_number AS buyer_reg,
                b.company_address AS buyer_address,
                s.id AS seller_id, s.name AS seller_name, s.email AS seller_email,
                s.company_name AS seller_company, s.company_reg_number AS seller_reg,
                s.company_vat AS seller_vat, s.company_address AS seller_address
         FROM orders o
         JOIN users b ON o.buyer_id = b.id
         JOIN users s ON o.seller_id = s.id
         LEFT JOIN listings l ON o.listing_id = l.id
         WHERE o.id = ?`,
        [orderId],
      );
      if (!order) return res.status(404).send('Order not found');

      // Authorization: admin, buyer, or seller only.
      const requester = await db.get<{ role: string }>(
        `SELECT role FROM users WHERE id = ?`,
        [decoded.userId],
      );
      const isAdmin = requester?.role === 'admin';
      const isBuyer = Number(order.buyer_id) === decoded.userId;
      const isSeller = Number(order.seller_id) === decoded.userId;
      if (!isAdmin && !isBuyer && !isSeller) return res.status(403).send('Forbidden');

      const invoiceDate = new Date(order.created_at).toLocaleDateString('lv-LV');
      const invoiceNumber = `INV-${new Date(order.created_at).getFullYear()}-${String(order.id).padStart(5, '0')}`;
      const amount = Number(order.amount) || 0;
      let priceWithoutVat = amount.toFixed(2);
      let vatAmount = '0.00';
      if (order.seller_vat) {
        priceWithoutVat = (amount / 1.21).toFixed(2);
        vatAmount = (amount - parseFloat(priceWithoutVat)).toFixed(2);
      }
      const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

      const html = `<!DOCTYPE html>
<html lang="lv"><head>
<meta charset="UTF-8"><title>Rēķins ${esc(invoiceNumber)}</title>
<style>
  body { font-family: system-ui, sans-serif; color: #0f172a; max-width: 800px; margin: 2rem auto; padding: 2rem; }
  h1 { color: #E64415; margin: 0; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
  th, td { padding: .5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
  .total { font-size: 1.25rem; font-weight: bold; }
  .muted { color: #64748b; font-size: .85rem; }
  @media print { .noprint { display: none } }
</style></head>
<body>
  <button class="noprint" onclick="window.print()" style="float:right;padding:.5rem 1rem;">Drukāt</button>
  <h1>Rēķins ${esc(invoiceNumber)}</h1>
  <p class="muted">Izdošanas datums: ${esc(invoiceDate)}</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-top:2rem;">
    <div>
      <p class="muted">Pārdevējs</p>
      <p><strong>${esc(order.seller_company || order.seller_name)}</strong></p>
      ${order.seller_reg ? `<p>Reģ. Nr.: ${esc(order.seller_reg)}</p>` : ''}
      ${order.seller_vat ? `<p>PVN Nr.: ${esc(order.seller_vat)}</p>` : ''}
      ${order.seller_address ? `<p>${esc(order.seller_address)}</p>` : ''}
    </div>
    <div>
      <p class="muted">Pircējs</p>
      <p><strong>${esc(order.buyer_company || order.buyer_name)}</strong></p>
      ${order.buyer_reg ? `<p>Reģ. Nr.: ${esc(order.buyer_reg)}</p>` : ''}
      ${order.buyer_address ? `<p>${esc(order.buyer_address)}</p>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Prece</th><th style="text-align:right;">Summa</th></tr></thead>
    <tbody>
      <tr><td>${esc(order.listing_title || 'Prece')}</td><td style="text-align:right;">€${priceWithoutVat}</td></tr>
      ${order.seller_vat ? `<tr><td>PVN (21%)</td><td style="text-align:right;">€${vatAmount}</td></tr>` : ''}
      <tr class="total"><td>Kopā</td><td style="text-align:right;">€${amount.toFixed(2)}</td></tr>
    </tbody>
  </table>
  <p class="muted">Maksājuma statuss: ${esc(order.status)}</p>
</body></html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (error) {
      console.error('[invoice-html] error', error);
      res.status(500).send('Server error');
    }
  });

  return router;
}
