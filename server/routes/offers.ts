import { Router } from 'express';
import db from '../pg';
import { requireAuth } from '../utils/auth';
import * as OfferService from '../services/OfferService';
import type { Server as SocketIOServer } from 'socket.io';

// Standalone offer routes. Offer CREATION lives in listings.ts:
//   POST /api/listings/:id/offers
// The routes here cover the rest of the lifecycle:
//   GET   /api/users/me/offers/received
//   GET   /api/users/me/offers/sent
//   PATCH /api/offers/:id/status   body: { action: 'accept' | 'reject' | 'cancel' }

export function createOffersRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // Everything here requires a valid session.
  router.use(requireAuth);

  // GET /api/users/me/offers/received
  router.get('/users/me/offers/received', async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const offers = await db.all(
        `SELECT o.*, l.title AS listing_title, l.image_url AS listing_image,
                u.name AS buyer_name
         FROM offers o
         JOIN listings l ON o.listing_id = l.id
         JOIN users u ON o.buyer_id = u.id
         WHERE l.user_id = ?
         ORDER BY o.created_at DESC`,
        [userId],
      );
      res.json(offers);
    } catch (error) {
      console.error('Error fetching received offers:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/users/me/offers/sent
  router.get('/users/me/offers/sent', async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const offers = await db.all(
        `SELECT o.*, l.title AS listing_title, l.image_url AS listing_image,
                u.name AS seller_name
         FROM offers o
         JOIN listings l ON o.listing_id = l.id
         JOIN users u ON l.user_id = u.id
         WHERE o.buyer_id = ?
         ORDER BY o.created_at DESC`,
        [userId],
      );
      res.json(offers);
    } catch (error) {
      console.error('Error fetching sent offers:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PATCH /api/offers/:id/status
  // action: 'accept' (seller only) | 'reject' (seller only) | 'cancel' (buyer only)
  router.patch('/offers/:id/status', async (req: any, res) => {
    try {
      const userId = req.userId as number;
      const offerId = Number(req.params.id);
      const action = String(req.body?.action || '').toLowerCase();

      if (!Number.isInteger(offerId) || offerId <= 0) {
        return res.status(400).json({ error: 'Nederīgs piedāvājuma ID' });
      }

      let updated;
      try {
        if (action === 'accept') {
          updated = await OfferService.acceptOffer(offerId, userId);
        } else if (action === 'reject') {
          updated = await OfferService.rejectOffer(offerId, userId);
        } else if (action === 'cancel') {
          updated = await OfferService.cancelOffer(offerId, userId);
        } else {
          return res.status(400).json({ error: 'Nederīga darbība' });
        }
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg === 'OFFER_NOT_FOUND') return res.status(404).json({ error: 'Piedāvājums nav atrasts' });
        if (msg === 'NOT_LISTING_OWNER' || msg === 'NOT_OFFER_OWNER') {
          return res.status(403).json({ error: 'Nav tiesību' });
        }
        if (msg.startsWith('INVALID_TRANSITION')) {
          return res.status(409).json({ error: 'Nederīga statusa maiņa šim piedāvājumam' });
        }
        throw e;
      }

      // Notify the counterparty in real time.
      const listing = await db.get(
        'SELECT user_id, title FROM listings WHERE id = ?',
        [updated.listing_id],
      ) as { user_id: number; title: string } | null;
      const sellerId = listing?.user_id ?? null;
      const counterpartyId = userId === sellerId ? updated.buyer_id : sellerId;
      if (counterpartyId) {
        io.to(`user_${counterpartyId}`).emit('offer_status_changed', {
          offerId: updated.id,
          status: updated.status,
        });
      }

      res.json(updated);
    } catch (error) {
      console.error('Error updating offer status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
