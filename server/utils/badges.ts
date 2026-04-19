// server/utils/badges.ts
import db from '../pg';

export const BADGE_DEFINITIONS: Record<string, { label: string; description: string; icon: string; color: string }> = {
  verified_seller:  { label: 'Verificēts',        description: 'Smart-ID identitāte apstiprināta',  icon: '🛡️', color: 'blue' },
  trusted_seller:   { label: 'Uzticams pārdevējs', description: '10+ pārdošanas, vērtējums ≥ 4.5',   icon: '⭐', color: 'amber' },
  top_seller_2026:  { label: 'Top pārdevējs',      description: '50+ veiksmīgi darījumi',              icon: '🏆', color: 'gold' },
  eco_warrior:      { label: 'Eko pārdevējs',       description: '20+ bezmaksas sludinājumi',           icon: '🌱', color: 'green' },
  auction_master:   { label: 'Izsoles meistars',    description: '10+ veiksmīgas izsoles',              icon: '🔨', color: 'purple' },
};

export async function awardBadgeIfEarned(userId: number, badgeId: string) {
  try {
    await db.run(
      'INSERT INTO user_achievements (user_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, badgeId]
    );
  } catch (err) {
    console.error(`[badges] Failed to award badge ${badgeId} to user ${userId}:`, err);
  }
}

export async function checkAndAwardBadges(userId: number) {
  try {
    const user = await db.get('SELECT is_verified FROM users WHERE id = $1', [userId]) as { is_verified: boolean } | null;
    if (!user) return;

    if (user.is_verified) await awardBadgeIfEarned(userId, 'verified_seller');

    const orderRow = await db.get("SELECT COUNT(*) as c FROM orders WHERE seller_id = $1 AND status = 'completed'", [userId]) as any;
    const orderCount = Number(orderRow?.c ?? 0);
    const ratingRow = await db.get('SELECT AVG(rating) as r FROM reviews WHERE seller_id = $1', [userId]) as any;
    const avgRating = Number(ratingRow?.r ?? 0);
    if (orderCount >= 10 && avgRating >= 4.5) await awardBadgeIfEarned(userId, 'trusted_seller');
    if (orderCount >= 50) await awardBadgeIfEarned(userId, 'top_seller_2026');

    const giveawayRow = await db.get("SELECT COUNT(*) as c FROM listings WHERE user_id = $1 AND listing_type = 'giveaway' AND status = 'sold'", [userId]) as any;
    if (Number(giveawayRow?.c ?? 0) >= 20) await awardBadgeIfEarned(userId, 'eco_warrior');

    const auctionRow = await db.get("SELECT COUNT(*) as c FROM orders WHERE seller_id = $1 AND status = 'completed' AND listing_id IN (SELECT id FROM listings WHERE is_auction = true)", [userId]) as any;
    if (Number(auctionRow?.c ?? 0) >= 10) await awardBadgeIfEarned(userId, 'auction_master');
  } catch (err) {
    console.error(`[badges] checkAndAwardBadges failed for user ${userId}:`, err);
  }
}
