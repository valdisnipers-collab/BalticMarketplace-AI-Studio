import { Meilisearch } from 'meilisearch';

const client = process.env.MEILISEARCH_HOST
  ? new Meilisearch({
      host: process.env.MEILISEARCH_HOST,
      apiKey: process.env.MEILISEARCH_API_KEY,
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
}

export async function initSearchIndex(): Promise<void> {
  if (!searchIndex) return;
  await searchIndex.updateSettings({
    searchableAttributes: ['title', 'description', 'location', 'author_name'],
    filterableAttributes: [
      'category', 'subcategory', 'listing_type', 'status',
      'price', 'location', 'created_at', 'user_id',
    ],
    sortableAttributes: ['price', 'created_at'],
  });
  console.log('[SEARCH] Meilisearch index settings updated');
}

export async function syncListing(doc: SearchableListing): Promise<void> {
  if (!searchIndex) return;
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
