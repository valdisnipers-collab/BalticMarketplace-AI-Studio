import { Router, raw } from 'express';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { JWT_SECRET } from '../utils/auth';
import Stripe from 'stripe';
import type { Server as SocketIOServer } from 'socket.io';

export function createPaymentsRouter(deps: { getStripe: () => Stripe; io: SocketIOServer }) {
  const { getStripe, io } = deps;
  const router = Router();

  // Stripe Webhook — must use raw body parser, NOT express.json()
  router.post('/webhook', raw({ type: 'application/json' }), async (req: any, res: any) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhooks will not work.');
      return res.status(400).send('Webhook secret not configured');
    }

    let event;

    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const type = session.metadata?.type;
      const amount = parseInt(session.metadata?.amount || '0', 10);

      if (type === 'escrow_purchase') {
        const orderId = session.metadata?.orderId;
        if (orderId) {
          try {
            await db.run('UPDATE orders SET status = ?, stripe_session_id = ? WHERE id = ?', ['paid', session.id, orderId]);
            console.log(`Successfully processed escrow payment for order ${orderId}`);
          } catch (dbError) {
            console.error('Database error processing escrow webhook:', dbError);
          }
        }
      } else if (userId && amount > 0) {
        try {
          if (type === 'points') {
            // Add points
            await db.run('UPDATE users SET points = points + ? WHERE id = ?', [amount, userId]);

            await db.run(`
              INSERT INTO points_history (user_id, points, reason)
              VALUES (?, ?, 'Punktu pirkums')
            `, [userId, amount]);
          } else {
            // Add funds (EUR)
            await db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);

            // Reward bonus points for purchase (10 points per 1 EUR)
            const bonusPoints = Math.floor(amount * 10);
            if (bonusPoints > 0) {
              await db.run('UPDATE users SET points = points + ? WHERE id = ?', [bonusPoints, userId]);
              await db.run(`
                INSERT INTO points_history (user_id, points, reason)
                VALUES (?, ?, 'Bonuss par maka papildināšanu')
              `, [userId, bonusPoints]);
            }
          }
          console.log(`Successfully processed payment for user ${userId}: ${amount} ${type}`);
        } catch (dbError) {
          console.error('Database error processing webhook:', dbError);
        }
      }
    }

    res.json({ received: true });
  });

  // Stripe Payment Intent
  router.post('/create-payment-intent', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      jwt.verify(token, JWT_SECRET);
      const { amount, currency = 'eur' } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: 'Server error creating payment intent' });
    }
  });

  // Stripe Checkout Session — escrow purchase
  router.post('/checkout/escrow', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { listingId, shippingMethod, shippingAddress } = req.body;

      const listing = await db.get('SELECT * FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id === decoded.userId) return res.status(400).json({ error: 'Cannot buy your own listing' });

      let finalPrice = listing.price;
      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};

      if (attributes.saleType === 'auction') {
        if (!attributes.auctionEndDate || new Date(attributes.auctionEndDate) > new Date()) {
          return res.status(400).json({ error: 'Auction has not ended yet' });
        }
        const highestBid = await db.get('SELECT user_id, amount FROM bids WHERE listing_id = ? ORDER BY amount DESC LIMIT 1', [listingId]) as any;
        if (!highestBid) {
          return res.status(400).json({ error: 'No bids on this auction' });
        }
        if (highestBid.user_id !== decoded.userId) {
          return res.status(403).json({ error: 'You are not the winner of this auction' });
        }
        finalPrice = highestBid.amount;
      }

      // Create order in pending state
      const result = await db.run(`
        INSERT INTO orders (listing_id, buyer_id, seller_id, amount, shipping_method, shipping_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [listingId, decoded.userId, listing.user_id, finalPrice, shippingMethod, shippingAddress]);

      const orderId = result.lastInsertRowid;

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Drošs pirkums: ${listing.title}`,
                description: `Piegāde: ${shippingMethod}`,
              },
              unit_amount: Math.round(finalPrice * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/profile?tab=orders&success=true&orderId=${orderId}`,
        cancel_url: `${process.env.APP_URL}/listing/${listingId}?canceled=true`,
        client_reference_id: decoded.userId.toString(),
        metadata: {
          type: 'escrow_purchase',
          orderId: String(orderId)
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating escrow checkout session:", error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Stripe Checkout Session — wallet top-up / points / subscription
  router.post('/create-checkout-session', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { amount, type = 'funds', planId, pointsAmount } = req.body;

      const stripe = getStripe();

      if (type === 'subscription') {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price: planId, // This should be a Stripe Price ID
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${process.env.APP_URL}/profile?success=true&type=subscription`,
          cancel_url: `${process.env.APP_URL}/profile?canceled=true`,
          client_reference_id: decoded.userId.toString(),
        });
        return res.json({ url: session.url });
      }

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: type === 'funds' ? 'Konta papildināšana' : 'Punktu iegāde',
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL}/profile?success=true&amount=${amount}&type=${type}`,
        cancel_url: `${process.env.APP_URL}/profile?canceled=true`,
        client_reference_id: decoded.userId.toString(),
        metadata: {
          type: String(type),
          amount: String(type === 'points' ? pointsAmount : amount)
        }
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: 'Server error creating checkout session' });
    }
  });

  return router;
}
