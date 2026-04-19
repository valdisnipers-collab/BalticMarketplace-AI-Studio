import { Meilisearch } from 'meilisearch';
import db from '../pg';
import type { ParsedQuery } from '../routes/listings';

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST;
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY;

const client = MEILISEARCH_HOST
  ? new Meilisearch({
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

async function searchListingsPostgres(
  parsed: ParsedQuery,
  legacyFilter?: string[],
  legacySort?: string[],
): Promise<SearchableListing[]> {
  const qp: any[] = [];

  // Build ts_query for keyword search — OR between words so filler words don't block results
  let tsQueryExpr: string | null = null;
  if (parsed.keywords?.trim()) {
    const words = parsed.keywords.trim()
      .split(/\s+/)
      .map(w => w.replace(/[&|!():*'<>]/g, '').trim())
      .filter(w => w.length > 1);
    if (words.length > 0) {
      tsQueryExpr = words.join(' | ');
    }
  }

  // Title weighted higher (A) than description (B) for relevance ranking
  const tsvectorExpr = `(
    setweight(to_tsvector('simple', coalesce(l.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(l.description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(l.category,'')), 'C')
  )`;

  let sql = `
    SELECT l.id, l.user_id, l.title, l.description, l.category, l.price, l.location,
           l.status, l.image_url, l.listing_type, l.is_auction, l.created_at, l.quality_score,
           u.name as author_name, NULL as subcategory, l.lat, l.lng
           ${tsQueryExpr ? `, ts_rank(${tsvectorExpr}, to_tsquery('simple', ?)) AS _rank` : ', 0 AS _rank'}
    FROM listings l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.status = 'active'
  `;
  if (tsQueryExpr) qp.push(tsQueryExpr);

  if (tsQueryExpr) {
    sql += ` AND ${tsvectorExpr} @@ to_tsquery('simple', ?)`;
    qp.push(tsQueryExpr);
  }

  // Structured filters from AI
  if (parsed.category) { sql += ` AND l.category = ?`; qp.push(parsed.category); }
  if (parsed.minPrice != null) { sql += ` AND l.price >= ?`; qp.push(parsed.minPrice); }
  if (parsed.maxPrice != null) { sql += ` AND l.price <= ?`; qp.push(parsed.maxPrice); }
  if (parsed.location) {
    sql += ` AND l.location ILIKE ?`;
    qp.push(`%${parsed.location}%`);
  }

  // Legacy Meilisearch-style filters (for non-AI calls)
  for (const f of legacyFilter ?? []) {
    if (f.startsWith('status =')) continue;
    const cat = f.match(/^category = "(.+)"$/);
    if (cat) { sql += ` AND l.category = ?`; qp.push(cat[1]); continue; }
    const gte = f.match(/^price >= ([\d.]+)$/);
    if (gte) { sql += ` AND l.price >= ?`; qp.push(Number(gte[1])); continue; }
    const lte = f.match(/^price <= ([\d.]+)$/);
    if (lte) { sql += ` AND l.price <= ?`; qp.push(Number(lte[1])); continue; }
    const lt = f.match(/^listing_type = "(.+)"$/);
    if (lt) { sql += ` AND l.listing_type = ?`; qp.push(lt[1]); continue; }
  }

  const sortMap: Record<string, string> = {
    'price:asc': 'l.price ASC',
    'price:desc': 'l.price DESC',
    'created_at:desc': 'l.created_at DESC',
    'created_at:asc': 'l.created_at ASC',
  };
  const explicitSort = legacySort?.map(s => sortMap[s]).filter(Boolean).join(', ');
  // When no explicit sort: rank by FTS relevance × quality_score, then recency
  const orderClause = explicitSort
    ? explicitSort
    : tsQueryExpr
      ? `(_rank * (1 + coalesce(l.quality_score, 0) / 100.0)) DESC, l.created_at DESC`
      : `l.created_at DESC`;
  sql += ` ORDER BY ${orderClause} LIMIT 50`;

  return (await db.all(sql, qp)) as SearchableListing[];
}

export async function searchListings(params: {
  parsed: ParsedQuery;
  filter?: string[];
  sort?: string[];
}): Promise<SearchableListing[]> {
  if (!searchIndex) return searchListingsPostgres(params.parsed, params.filter, params.sort);
  const result = await searchIndex.search<SearchableListing>(params.parsed.keywords ?? null, {
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

  // Clear stale documents before re-indexing
  await client.index('listings').deleteAllDocuments();
  console.log('[SEARCH] Veci dokumenti notīrīti');

  const BATCH = 100;
  for (let i = 0; i < listings.length; i += BATCH) {
    const batch = listings.slice(i, i + BATCH);
    await client.index('listings').addDocuments(batch);
    console.log(`[SEARCH] Indeksēti ${Math.min(i + BATCH, listings.length)}/${listings.length}`);
  }

  console.log(`[SEARCH] Reindex pabeigts — ${listings.length} sludinājumi`);
}
