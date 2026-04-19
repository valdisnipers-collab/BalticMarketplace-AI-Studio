import { MeiliSearch } from 'meilisearch';
import db from '../pg';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;

const client = MEILISEARCH_HOST
  ? new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    })
  : null;

export const searchIndex = client?.index('listings') ?? null;

export interface SearchableListing {
  id: number;
  user_id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  subcategory: string | null;
  listing_type: string;
  status: string;
  location: string | null;
  image_url: string | null;
  author_name: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
  is_auction?: number | null;
  quality_score?: number;
}

export async function initSearchIndex(): Promise<void> {
  if (!client) return;
  const index = client.index('listings');

  await index.updateSettings({
    searchableAttributes: ['title', 'description', 'location', 'author_name', 'category'],
    filterableAttributes: ['category', 'status', 'price', 'location', 'created_at', 'user_id', 'listing_type', 'is_auction'],
    sortableAttributes: ['price', 'created_at', 'quality_score'],
    rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
  });
  console.log('[SEARCH] Meilisearch index settings updated');
}

export async function syncListing(listing: SearchableListing): Promise<void> {
  if (!searchIndex) return;
  const doc = {
    ...listing,
    quality_score: listing.quality_score ?? 0,
  };
  await searchIndex.addDocuments([doc], { primaryKey: 'id' });
}

export async function removeListing(id: number): Promise<void> {
  if (!searchIndex) return;
  await searchIndex.deleteDocument(id);
}

export async function searchListings(params: {
  q: string;
  filter?: string[];
  sort?: string[];
}): Promise<SearchableListing[]> {
  if (!searchIndex) return [];
  const result = await searchIndex.search<SearchableListing>(params.q, {
    filter: params.filter,
    sort: params.sort ?? ['created_at:desc'],
    limit: 50,
  });
  return result.hits;
}

export async function reindexAllListings() {
  if (!client) {
    console.log('[SEARCH] Meilisearch nav konfigurēts, reindex izlaists');
    return;
  }

  const listings = await db.all(
    `SELECT l.id, l.title, l.description, l.category, l.price, l.location,
            l.status, l.user_id, l.image_url, l.listing_type, l.is_auction,
            l.created_at, l.quality_score,
            u.name as author_name
     FROM listings l
     LEFT JOIN users u ON l.user_id = u.id
     WHERE l.status = 'active'
     ORDER BY l.id`
  ) as any[];

  if (listings.length === 0) {
    console.log('[SEARCH] Nav aktīvu sludinājumu indeksēšanai');
    return;
  }

  const BATCH = 100;
  for (let i = 0; i < listings.length; i += BATCH) {
    const batch = listings.slice(i, i + BATCH);
    await client.index('listings').addDocuments(batch);
    console.log(`[SEARCH] Indeksēti ${Math.min(i + BATCH, listings.length)}/${listings.length}`);
  }

  console.log(`[SEARCH] Reindex pabeigts — ${listings.length} sludinājumi`);
}
