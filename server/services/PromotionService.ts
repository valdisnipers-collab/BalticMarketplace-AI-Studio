// server/services/PromotionService.ts
//
// Single entry point for paid listing promotions (highlight / bump /
// auto_bump). Deducts points in a transaction, writes a points_history
// row for audit, and appends a listing_promotions row so admins can
// reconstruct the full promotion history of any listing.
//
// Prices are read from platform_settings so the admin Settings tab can
// change them without touching code.

import type { Request } from 'express';
import db from '../pg';
import * as PlatformSettings from './PlatformSettingsService';

export type PromotionType = 'highlight' | 'bump' | 'auto_bump';

interface Durations {
  // Duration (hours) each promotion lasts. auto_bump runs for a week.
  highlight: number;
  auto_bump: number;
}

const DURATIONS: Durations = {
  highlight: 7 * 24, // 7 days
  auto_bump: 7 * 24, // 7 days of periodic bumping
};

const DEFAULT_PRICES: Record<PromotionType, number> = {
  highlight: 100,
  bump: 50,
  auto_bump: 250,
};

async function readPrice(type: PromotionType): Promise<number> {
  const key = `${type}_price_points`;
  const value = await PlatformSettings.get<number>(key);
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  return DEFAULT_PRICES[type];
}

export interface PromoteArgs {
  listingId: number;
  userId: number;
  type: PromotionType;
  req?: Request;
}

export interface PromoteResult {
  type: PromotionType;
  points_spent: number;
  points_balance: number;
  expires_at: string | null;
  last_bumped_at: string | null;
}

export async function promote(args: PromoteArgs): Promise<PromoteResult> {
  const { listingId, userId, type } = args;
  if (!['highlight', 'bump', 'auto_bump'].includes(type)) {
    throw new Error('INVALID_TYPE');
  }

  const cost = await readPrice(type);

  return db.transaction(async (client) => {
    const listing = await db.clientGet<any>(
      client,
      `SELECT id, user_id, status FROM listings WHERE id = ? FOR UPDATE`,
      [listingId],
    );
    if (!listing) throw new Error('LISTING_NOT_FOUND');
    if (listing.user_id !== userId) throw new Error('NOT_LISTING_OWNER');
    if (listing.status !== 'active') throw new Error('LISTING_NOT_ACTIVE');

    const user = await db.clientGet<{ points: number }>(
      client,
      `SELECT points FROM users WHERE id = ? FOR UPDATE`,
      [userId],
    );
    if (!user) throw new Error('USER_NOT_FOUND');
    if ((user.points ?? 0) < cost) throw new Error('INSUFFICIENT_POINTS');

    await db.clientRun(
      client,
      `UPDATE users SET points = points - ? WHERE id = ?`,
      [cost, userId],
    );
    await db.clientRun(
      client,
      `INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)`,
      [userId, -cost, `Sludinājuma promocija: ${type}`],
    );

    let expiresAt: string | null = null;
    let lastBumpedAt: string | null = null;

    if (type === 'highlight') {
      const durationMs = DURATIONS.highlight * 3600 * 1000;
      const until = new Date(Date.now() + durationMs).toISOString();
      await db.clientRun(
        client,
        `UPDATE listings SET is_highlighted = 1, promoted_until = ? WHERE id = ?`,
        [until, listingId],
      );
      expiresAt = until;
    } else if (type === 'bump') {
      const now = new Date().toISOString();
      await db.clientRun(
        client,
        `UPDATE listings SET last_bumped_at = ? WHERE id = ?`,
        [now, listingId],
      );
      lastBumpedAt = now;
    } else if (type === 'auto_bump') {
      const durationMs = DURATIONS.auto_bump * 3600 * 1000;
      const until = new Date(Date.now() + durationMs).toISOString();
      await db.clientRun(
        client,
        `UPDATE listings SET auto_bump_until = ?, last_bumped_at = NOW() WHERE id = ?`,
        [until, listingId],
      );
      expiresAt = until;
    }

    await db.clientRun(
      client,
      `INSERT INTO listing_promotions (listing_id, user_id, type, points_spent, starts_at, expires_at)
       VALUES (?, ?, ?, ?, NOW(), ?)`,
      [listingId, userId, type, cost, expiresAt],
    );

    const updatedUser = await db.clientGet<{ points: number }>(
      client,
      `SELECT points FROM users WHERE id = ?`,
      [userId],
    );

    return {
      type,
      points_spent: cost,
      points_balance: updatedUser?.points ?? 0,
      expires_at: expiresAt,
      last_bumped_at: lastBumpedAt,
    };
  });
}
