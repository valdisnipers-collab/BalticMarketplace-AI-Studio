// src/lib/recentlyViewed.ts
//
// LocalStorage-backed "Recently viewed listings" for the Profile tab and
// ListingDetails page. Anonymous-friendly (no backend). Stores up to 12
// listing ids, newest first, deduplicated.
//
// Reading and writing both tolerate malformed JSON by resetting the key.

const KEY = 'balticmarket_recently_viewed_v1';
const MAX = 12;

function safeRead(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => Number.isInteger(n) && n > 0).slice(0, MAX);
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    return [];
  }
}

function safeWrite(ids: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {
    /* quota exceeded or disabled — swallow */
  }
}

export function addRecentlyViewedListing(id: number): void {
  if (!Number.isInteger(id) || id <= 0) return;
  const current = safeRead().filter(n => n !== id);
  current.unshift(id);
  safeWrite(current);
}

export function getRecentlyViewedListingIds(): number[] {
  return safeRead();
}

export function removeRecentlyViewedListing(id: number): void {
  const next = safeRead().filter(n => n !== id);
  safeWrite(next);
}

export function clearRecentlyViewedListings(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
