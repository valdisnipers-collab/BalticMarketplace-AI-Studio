// server/utils/savedSearchTrigger.ts
import db from '../pg';
import { sendEmail } from '../services/email';

const APP_URL = process.env.APP_URL || 'https://balticmarket.net';

export async function triggerSavedSearchAlerts(
  listingId: number,
  category: string,
  title: string,
  price: number
) {
  try {
    const matches = await db.all(
      `SELECT ss.id, ss.user_id, ss.query, ss.category, ss.min_price, ss.max_price,
              u.email, u.name
       FROM saved_searches ss
       JOIN users u ON ss.user_id = u.id
       WHERE (ss.category IS NULL OR ss.category = $1)
         AND (ss.min_price IS NULL OR $2 >= ss.min_price)
         AND (ss.max_price IS NULL OR $2 <= ss.max_price)`,
      [category, price]
    ) as any[];

    for (const match of matches) {
      if (match.query && !title.toLowerCase().includes(match.query.toLowerCase())) {
        continue;
      }

      sendEmail(
        match.email,
        `Jauns sludinājums atbilst tavam meklējumam: ${match.query || match.category || 'Visi'}`,
        `
          <p>Sveiki, ${match.name || ''}!</p>
          <p>Parādījies jauns sludinājums kas atbilst tavam saglabātajam meklējumam.</p>
          <p><strong>${title}</strong> — €${price}</p>
          <p><a href="${APP_URL}/listing/${listingId}">Skatīt sludinājumu</a></p>
          <p><small><a href="${APP_URL}/profile">Pārvaldīt saglabātos meklējumus</a></small></p>
        `,
      ).catch(() => {});
    }
  } catch (err) {
    console.error('[savedSearchTrigger] Error:', err);
  }
}
