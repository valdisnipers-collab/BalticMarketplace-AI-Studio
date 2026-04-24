// server/services/OfferService.ts
//
// Encapsulates the offer lifecycle so route handlers stay thin.
// Allowed statuses: pending, accepted, rejected, countered, expired,
// cancelled, converted_to_order. A status CHECK constraint enforces this
// at the DB level (migration 006).

import type { PoolClient } from 'pg';
import db from '../pg';

export type OfferStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'expired'
  | 'cancelled'
  | 'converted_to_order';

export interface Offer {
  id: number;
  listing_id: number;
  buyer_id: number;
  sender_id: number | null;
  amount: number;
  status: OfferStatus;
  message: string | null;
  expires_at: string | null;
  parent_offer_id: number | null;
  order_id: number | null;
  created_at: string;
  updated_at: string;
}

// Allowed transitions per side. The route layer decides which side is acting
// (seller vs. buyer vs. system) before calling transition().
const ALLOWED: Record<OfferStatus, OfferStatus[]> = {
  pending: ['accepted', 'rejected', 'countered', 'cancelled', 'expired'],
  countered: ['accepted', 'rejected', 'cancelled', 'expired'],
  accepted: ['converted_to_order'],
  rejected: [],
  expired: [],
  cancelled: [],
  converted_to_order: [],
};

export function canTransition(from: OfferStatus, to: OfferStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export async function findById(id: number): Promise<Offer | null> {
  return (await db.get<Offer>(
    `SELECT id, listing_id, buyer_id, sender_id, amount, status, message,
            expires_at, parent_offer_id, order_id, created_at, updated_at
     FROM offers WHERE id = ?`,
    [id],
  )) as Offer | null;
}

async function getListingOwner(listingId: number): Promise<number | null> {
  const row = (await db.get<{ user_id: number }>(
    'SELECT user_id FROM listings WHERE id = ?',
    [listingId],
  )) as { user_id: number } | null;
  return row ? row.user_id : null;
}

/**
 * Seller accepts an offer. In the same transaction:
 *   1. Flip this offer to 'accepted'.
 *   2. Reject every other pending/countered offer on the same listing.
 *
 * NOTE: Order creation is intentionally not wired in here yet — the orders
 * table has a richer shape (Stripe session, shipping) that depends on the
 * checkout flow. Once an order is created, call markConvertedToOrder().
 */
export async function acceptOffer(offerId: number, sellerId: number): Promise<Offer> {
  return db.transaction(async (client: PoolClient) => {
    const offer = await db.clientGet<Offer>(
      client,
      'SELECT * FROM offers WHERE id = ? FOR UPDATE',
      [offerId],
    );
    if (!offer) throw new Error('OFFER_NOT_FOUND');

    const ownerId = await getListingOwner(offer.listing_id);
    if (ownerId !== sellerId) throw new Error('NOT_LISTING_OWNER');

    if (!canTransition(offer.status, 'accepted')) {
      throw new Error(`INVALID_TRANSITION:${offer.status}->accepted`);
    }

    await db.clientRun(
      client,
      "UPDATE offers SET status = 'accepted', updated_at = NOW() WHERE id = ?",
      [offerId],
    );

    // Reject all competing pending/countered offers on the same listing.
    await db.clientRun(
      client,
      `UPDATE offers
       SET status = 'rejected', updated_at = NOW()
       WHERE listing_id = ? AND id != ? AND status IN ('pending', 'countered')`,
      [offer.listing_id, offerId],
    );

    return (await db.clientGet<Offer>(client, 'SELECT * FROM offers WHERE id = ?', [offerId])) as Offer;
  });
}

/**
 * Seller rejects an offer.
 */
export async function rejectOffer(offerId: number, sellerId: number): Promise<Offer> {
  const offer = await findById(offerId);
  if (!offer) throw new Error('OFFER_NOT_FOUND');
  const ownerId = await getListingOwner(offer.listing_id);
  if (ownerId !== sellerId) throw new Error('NOT_LISTING_OWNER');
  if (!canTransition(offer.status, 'rejected')) {
    throw new Error(`INVALID_TRANSITION:${offer.status}->rejected`);
  }
  await db.run("UPDATE offers SET status = 'rejected', updated_at = NOW() WHERE id = ?", [offerId]);
  return (await findById(offerId)) as Offer;
}

/**
 * Buyer cancels their own pending offer.
 */
export async function cancelOffer(offerId: number, buyerId: number): Promise<Offer> {
  const offer = await findById(offerId);
  if (!offer) throw new Error('OFFER_NOT_FOUND');
  if (offer.buyer_id !== buyerId) throw new Error('NOT_OFFER_OWNER');
  if (!canTransition(offer.status, 'cancelled')) {
    throw new Error(`INVALID_TRANSITION:${offer.status}->cancelled`);
  }
  await db.run("UPDATE offers SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [offerId]);
  return (await findById(offerId)) as Offer;
}

/**
 * Mark an accepted offer as converted to an order. Called from the order
 * creation flow — not from the route handler directly.
 */
export async function markConvertedToOrder(offerId: number, orderId: number): Promise<Offer> {
  const offer = await findById(offerId);
  if (!offer) throw new Error('OFFER_NOT_FOUND');
  if (!canTransition(offer.status, 'converted_to_order')) {
    throw new Error(`INVALID_TRANSITION:${offer.status}->converted_to_order`);
  }
  await db.run(
    "UPDATE offers SET status = 'converted_to_order', order_id = ?, updated_at = NOW() WHERE id = ?",
    [orderId, offerId],
  );
  return (await findById(offerId)) as Offer;
}

/**
 * Cron/maintenance: flip any pending/countered offers whose expires_at is in
 * the past to 'expired'. Returns number of rows updated.
 */
export async function expireStaleOffers(): Promise<number> {
  const result = await db.run(
    `UPDATE offers SET status = 'expired', updated_at = NOW()
     WHERE status IN ('pending', 'countered')
       AND expires_at IS NOT NULL
       AND expires_at <= NOW()`,
  );
  return result.changes ?? 0;
}
