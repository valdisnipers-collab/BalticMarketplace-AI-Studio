import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import db from '../pg';
import { requireAuth, JWT_SECRET, verifyTokenOptional } from '../utils/auth';
import { createDraftsRouter } from './drafts';
import { getGenAI } from '../utils/ai';
import { geocodeLocation } from '../utils/geocode';
import { hasEarlyAccess } from '../utils/earlyAccess';
import { calculateQualityScore } from '../utils/quality';
import { cached, invalidate, invalidatePattern } from '../services/redis';
import { syncListing, removeListing, searchListings } from '../services/search';
import { sendEmail, emailTemplates } from '../services/email';
import { triggerSavedSearchAlerts } from '../utils/savedSearchTrigger';
import { validateBody, listingSchema } from '../middleware/validate';
import { sanitizePrompt, parseFiniteNumber } from '../utils/sanitize';
import { isSafeExternalUrl } from '../utils/urlSafety';
import { normalizeCategory, toLatvianLabel } from '../utils/categories';
import * as PromotionService from '../services/PromotionService';
import type { Server as SocketIOServer } from 'socket.io';

const uploadsDir = path.join(process.cwd(), 'uploads');

// Canonical listing_type values. 'fixed' (legacy frontend) maps to 'sale'.
const LISTING_TYPES = new Set(['sale', 'auction', 'exchange', 'free', 'rent', 'offer']);

/**
 * Determine the canonical listing_type for a create/update request.
 * Priority: explicit body.listing_type > attributes.saleType mapping > 'sale'.
 * Keeps backward compatibility with frontends that still write attributes.saleType.
 */
function resolveListingType(body: any): string {
  const direct = body?.listing_type;
  if (typeof direct === 'string' && LISTING_TYPES.has(direct)) return direct;

  const fromAttrs = body?.attributes?.saleType;
  if (fromAttrs === 'auction') return 'auction';
  if (fromAttrs === 'fixed') return 'sale';
  if (typeof fromAttrs === 'string' && LISTING_TYPES.has(fromAttrs)) return fromAttrs;

  return 'sale';
}

// ── helpers ─────────────────────────────────────────────────────────────────

async function moderateListing(listingId: number | bigint, title: string, description: string, price: number) {
  try {
    if (!process.env.GEMINI_API_KEY) return;

    const ai = getGenAI();

    const prompt = `Esi pieredzējis sludinājumu portāla moderators un krāpniecības apkarošanas eksperts. Analizē šo sludinājumu un sniedz detalizētu drošības novērtējumu.

      Virsraksts: ${title}
      Apraksts: ${description}
      Cena: ${price} EUR

      Pārbaudi šādus riskus:
      1. Krāpniecības pazīmes (pārāk zema cena, aizdomīgi kontakti, steidzamība).
      2. Phishing saites vai aizdomīgi ārējie resursi.
      3. Aizliegts saturs (narkotikas, ieroči, lamuvārdi, naida runa).
      4. Neadekvāta cena attiecībā pret aprakstīto preci.
      5. Maldinoša informācija.

      Atbildi TIKAI JSON formātā:
      {
        "isFlagged": boolean,
        "reason": "īss, profesionāls paskaidrojums latviešu valodā",
        "trustScore": number (0-100, kur 100 ir pilnīgi drošs),
        "status": "approved" | "flagged" | "pending_review"
      }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}';
    const result = JSON.parse(resultText);

    await db.run(`
      UPDATE listings
      SET ai_trust_score = ?,
          ai_moderation_status = ?,
          ai_moderation_reason = ?,
          status = CASE WHEN ? = 'flagged' THEN 'flagged' ELSE status END
      WHERE id = ?
    `, [
      result.trustScore || 100,
      result.status || 'approved',
      result.reason || null,
      result.status,
      listingId,
    ]);

    if (result.isFlagged || result.status === 'flagged') {
      console.log(`[AI MODERATION] Listing ${listingId} flagged. Reason: ${result.reason}`);
      await db.run(`
        INSERT INTO reports (reporter_id, listing_id, reason, status)
        VALUES (1, ?, ?, 'pending')
      `, [listingId, `AI Moderācija: ${result.reason} (Uzticamība: ${result.trustScore}%)`]);
    }
  } catch (error) {
    console.error('Error in AI moderation:', error);
  }
}

async function checkSavedSearchesAndNotify(listingId: number | bigint, listingData: any) {
  try {
    const savedSearches = await db.all('SELECT * FROM saved_searches', []) as any[];

    for (const search of savedSearches) {
      let match = true;

      if (search.category && search.category !== listingData.category) match = false;
      if (match && search.min_price && listingData.price < search.min_price) match = false;
      if (match && search.max_price && listingData.price > search.max_price) match = false;
      if (match && search.query && !listingData.title.toLowerCase().includes(search.query.toLowerCase())) match = false;

      if (match) {
        await db.run(`
          INSERT INTO notifications (user_id, type, title, message, link)
          VALUES (?, 'saved_search_match', 'Jauns sludinājums jūsu meklējumam', ?, ?)
        `, [
          search.user_id,
          `Atrasts jauns sludinājums "${listingData.title}" par €${listingData.price}.`,
          `/listing/${listingId}`,
        ]);

        const user = await db.get('SELECT email, name FROM users WHERE id = ?', [search.user_id]) as any;
        if (user?.email) {
          const tmpl = emailTemplates.newListingMatch(user.name, listingData.title, Number(listingData.price), Number(listingId));
          sendEmail(user.email, tmpl.subject, tmpl.html).catch(e => console.error('Email error:', e));
        }
      }
    }
  } catch (error) {
    console.error('Error checking saved searches:', error);
  }
}

export interface ParsedQuery {
  keywords: string;        // 2-5 search keywords, space-separated
  category: string | null; // exact category name or null
  minPrice: number | null;
  maxPrice: number | null;
  location: string | null; // city or region, or null
  summary: string;         // one Latvian sentence describing what was understood
}

const KNOWN_CATEGORIES = [
  'Transports', 'Nekustamais īpašums', 'Elektronika',
  'Darbs', 'Mājai', 'Mode', 'Bērniem', 'Sports', 'Dzīvnieki',
];

// Keyword hints for category detection when Gemini is unavailable
const CATEGORY_KEYWORDS: Record<string, string> = {
  bmw: 'Transports', mercedes: 'Transports', audi: 'Transports', toyota: 'Transports',
  volkswagen: 'Transports', volvo: 'Transports', ford: 'Transports', honda: 'Transports',
  auto: 'Transports', mašīna: 'Transports', automašīna: 'Transports', velo: 'Transports',
  iphone: 'Elektronika', samsung: 'Elektronika', macbook: 'Elektronika', laptop: 'Elektronika',
  dators: 'Elektronika', telefons: 'Elektronika', playstation: 'Elektronika', xbox: 'Elektronika',
  dzīvoklis: 'Nekustamais īpašums', māja: 'Nekustamais īpašums', zeme: 'Nekustamais īpašums',
  īpašums: 'Nekustamais īpašums', istaba: 'Nekustamais īpašums',
  dīvāns: 'Mājai', galds: 'Mājai', krēsls: 'Mājai', gulta: 'Mājai', skapis: 'Mājai',
  bērnu: 'Bērniem', ratiņi: 'Bērniem', rotaļlieta: 'Bērniem', lego: 'Bērniem',
  darbs: 'Darbs', vakance: 'Darbs', alga: 'Darbs',
};

// Latvian filler words to strip when extracting keywords from raw query
const FILLER_WORDS = new Set([
  'meklēju', 'mekleju', 'gribu', 'vēlos', 'velos', 'pērku', 'perku', 'nepieciešams',
  'vajag', 'lūdzu', 'ludzu', 'man', 'es', 'ir', 'par', 'un', 'vai', 'ar', 'uz',
  'no', 'līdz', 'lidz', 'ap', 'apmēram', 'apmeram', 'kāds', 'kads', 'labs', 'lēts',
  'lets', 'jauns', 'lietots', 'pārdod', 'pardod',
]);

function buildFallbackParsed(raw: string): ParsedQuery {
  const words = raw.toLowerCase().split(/\s+/);
  const keywords = words.filter(w => !FILLER_WORDS.has(w) && w.length > 1).join(' ') || raw;
  const category = words.reduce<string | null>((found, w) => found ?? (CATEGORY_KEYWORDS[w] ?? null), null);
  // Extract price hints: "līdz 5000", "no 1000", "ap 500"
  const maxMatch = raw.match(/līdz\s+(\d[\d\s]*)/i) ?? raw.match(/max\s+(\d[\d\s]*)/i);
  const minMatch = raw.match(/no\s+(\d[\d\s]*)/i) ?? raw.match(/min\s+(\d[\d\s]*)/i);
  return {
    keywords,
    category,
    minPrice: minMatch ? Number(minMatch[1].replace(/\s/g, '')) : null,
    maxPrice: maxMatch ? Number(maxMatch[1].replace(/\s/g, '')) : null,
    location: null,
    summary: '',
  };
}

async function aiParseQuery(raw: string): Promise<ParsedQuery> {
  if (!raw || raw.length < 3) return { keywords: raw, category: null, minPrice: null, maxPrice: null, location: null, summary: '' };
  if (!process.env.GEMINI_API_KEY) return buildFallbackParsed(raw);

  try {
    const ai = getGenAI();
    const prompt = `Esi meklēšanas parsētājs Latvijas sludinājumu platformā. Izanalizē vaicājumu un atbildi TIKAI ar JSON (bez markdown).

Pieejamās kategorijas: ${KNOWN_CATEGORIES.join(', ')}

Piemēri:
Input: "meklēju bmw vai mercedes līdz 15000"
Output: {"keywords":"BMW Mercedes","category":"Transports","minPrice":null,"maxPrice":15000,"location":null,"summary":"Meklē BMW vai Mercedes automašīnu līdz 15 000 €"}

Input: "dzīvoklis Rīgā 2 istabas ap 100k"
Output: {"keywords":"dzīvoklis 2 istabas","category":"Nekustamais īpašums","minPrice":null,"maxPrice":100000,"location":"Rīga","summary":"Meklē 2-istabu dzīvokli Rīgā līdz 100 000 €"}

Input: "iphone 13 vai 14 labs stāvoklis"
Output: {"keywords":"iPhone 13 14","category":"Elektronika","minPrice":null,"maxPrice":null,"location":null,"summary":"Meklē iPhone 13 vai 14 labā stāvoklī"}

Input: "dīvāns Rīgā lēts"
Output: {"keywords":"dīvāns","category":"Mājai","minPrice":null,"maxPrice":null,"location":"Rīga","summary":"Meklē lētu dīvānu Rīgā"}

Input: "velosipēds bērnam 6-8 gadi Salaspils"
Output: {"keywords":"velosipēds bērnu","category":"Bērniem","minPrice":null,"maxPrice":null,"location":"Salaspils","summary":"Meklē bērnu velosipēdu 6–8 gadus vecam bērnam Salaspilī"}

Input: "${raw}"
Output:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = (response.text || '').trim().replace(/```json|```/g, '').trim();
    if (!text) {
      console.warn('[AI SEARCH] empty response from Gemini, using smart fallback');
      return buildFallbackParsed(raw);
    }
    const parsed = JSON.parse(text) as ParsedQuery;
    console.log(`[AI SEARCH] "${raw}" →`, parsed);
    return {
      keywords: parsed.keywords || buildFallbackParsed(raw).keywords,
      category: KNOWN_CATEGORIES.includes(parsed.category ?? '') ? parsed.category : null,
      minPrice: typeof parsed.minPrice === 'number' ? parsed.minPrice : null,
      maxPrice: typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null,
      location: parsed.location ? String(parsed.location).substring(0, 80) : null,
      summary: parsed.summary || '',
    };
  } catch (e) {
    console.warn('[AI SEARCH] parse failed, using smart fallback', e);
    return buildFallbackParsed(raw);
  }
}

// ── router factory ───────────────────────────────────────────────────────────

export function createListingsRouter(deps: { io: SocketIOServer }) {
  const { io } = deps;
  const router = Router();

  // NOTE: ai_card_summary column is now created by migration
  // 002_ai_listing_fields.sql — no runtime ALTER needed here.

  // POST /api/listings/ai-suggestions
  router.post('/ai-suggestions', requireAuth, async (req: any, res) => {
    try {
      const { title, category, description, attributes } = req.body;
      if (!title && !description) return res.json({ suggestions: [] });

      const ai = getGenAI();
      const safeCategory = sanitizePrompt(category, 100);
      const safeTitle = sanitizePrompt(title, 200);
      const safeDescription = sanitizePrompt(description, 500);
      const filled = Object.entries(attributes || {})
        .filter(([, v]) => v && v !== '')
        .map(([k, v]) => `${sanitizePrompt(k, 40)}: ${sanitizePrompt(v, 100)}`)
        .join(', ');

      const prompt = `Tu esi marketplace palīgs. Analizē šo sludinājumu un dod 3 konkrētus ieteikumus latviešu valodā kā to uzlabot.

Sludinājums:
- Kategorija: ${safeCategory || 'nav norādīta'}
- Virsraksts: ${safeTitle || 'nav'}
- Apraksts: ${safeDescription || 'nav'}
- Aizpildītie lauki: ${filled || 'nav'}

Dod tieši 3 ieteikumus kā JSON masīvu formātā:
[{"field":"lauka_nosaukums","suggestion":"konkrēts ieteikums"}]

Piemēri lauku nosaukumiem: title, description, price, images, location, attributes.
Esi konkrēts — neraksti "uzlabo aprakstu", raksti "Pievieno izstrādājuma dimensijas un materiālu".`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let suggestions: any[] = [];
      try {
        const text = response.text || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) suggestions = JSON.parse(jsonMatch[0]);
      } catch {}

      res.json({ suggestions: suggestions.slice(0, 3) });
    } catch (e) {
      console.error('[AI SUGGESTIONS]', e);
      res.json({ suggestions: [] });
    }
  });

  // GET /api/listings/search
  router.get('/search', async (req, res) => {
    try {
      const { q: query, minPrice, maxPrice, sort, location, listingType } = req.query;
      if (!query) return res.json({ listings: [], aiSummary: '' });

      const { hasAccess, userId } = await hasEarlyAccess(req);

      // AI structured parsing — always, for every query
      const parsed = await aiParseQuery(query as string);

      // URL params override AI-detected price/location (user explicitly set them)
      const parsedMin = parseFloat(minPrice as string);
      if (isFinite(parsedMin)) parsed.minPrice = parsedMin;
      const parsedMax = parseFloat(maxPrice as string);
      if (isFinite(parsedMax)) parsed.maxPrice = parsedMax;
      if (location) parsed.location = (location as string);

      // Build legacy filter array for Meilisearch compatibility
      const VALID_LISTING_TYPES = new Set(['sale', 'auction', 'exchange', 'free', 'rent', 'offer']);
      const filter: string[] = ['status = "active"'];
      if (parsed.category) {
        // AI parser may emit Latvian label — normalize before filtering.
        const catId = normalizeCategory(parsed.category) ?? parsed.category;
        filter.push(`category = "${catId.replace(/"/g, '\\"')}"`);
      }
      if (parsed.minPrice != null) filter.push(`price >= ${parsed.minPrice}`);
      if (parsed.maxPrice != null) filter.push(`price <= ${parsed.maxPrice}`);
      if (listingType && listingType !== 'all' && VALID_LISTING_TYPES.has(listingType as string)) filter.push(`listing_type = "${listingType}"`);

      const sortArr: string[] = [];
      if (sort === 'price_asc') sortArr.push('price:asc');
      else if (sort === 'price_desc') sortArr.push('price:desc');
      else sortArr.push('created_at:desc');

      let hits = await searchListings({ parsed, filter, sort: sortArr });

      // 15-minute early access filter
      if (!hasAccess) {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        hits = hits.filter(h => {
          if (userId && h.user_id === userId) return true;
          return h.created_at <= fifteenMinAgo;
        });
      }

      for (const h of hits as any[]) {
        if (h?.category) {
          h.category_id = h.category;
          h.category = toLatvianLabel(h.category) ?? h.category;
        }
      }

      res.json({ listings: hits, aiSummary: parsed.summary });
    } catch (error) {
      console.error('Error searching listings:', error);
      res.status(500).json({ error: 'Server error searching listings' });
    }
  });

  // GET /api/listings
  router.get('/', async (req, res) => {
    try {
      const { category, subcategory, minPrice, maxPrice, sort, location, listingType, lat, lng, radius, limit: rawLimit, offset: rawOffset, ...restQuery } = req.query;
      const { hasAccess, userId } = await hasEarlyAccess(req);

      // Pagination bounds: default page size 50, hard cap 100 to prevent
      // runaway queries. Negative or non-numeric values fall back to defaults.
      const parsedLimit = Number(rawLimit);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(Math.floor(parsedLimit), 100)
        : 50;
      const parsedOffset = Number(rawOffset);
      const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0
        ? Math.floor(parsedOffset)
        : 0;

      let query = `
        SELECT listings.*, users.name as author_name
        FROM listings
        JOIN users ON listings.user_id = users.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (!hasAccess) {
        if (userId) {
          query += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          query += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      if (category) {
        // Accept either a canonical id or legacy Latvian label from the client.
        query += ` AND category = ?`;
        params.push(normalizeCategory(String(category)) ?? category);
      }
      if (subcategory) {
        query += ` AND (attributes::json)->>'subcategory' = ?`;
        params.push(subcategory);
      }
      if (listingType && listingType !== 'all') {
        query += ` AND listing_type = ?`;
        params.push(listingType);
      }
      if (minPrice) {
        query += ` AND price >= ?`;
        params.push(Number(minPrice));
      }
      if (maxPrice) {
        query += ` AND price <= ?`;
        params.push(Number(maxPrice));
      }
      if (location) {
        query += ` AND location ILIKE ?`;
        params.push(`%${location}%`);
      }
      if (lat && lng && radius) {
        const latF = parseFloat(lat as string);
        const lngF = parseFloat(lng as string);
        const radiusKm = parseFloat(radius as string);
        const latDelta = radiusKm / 111.0;
        const lngDelta = radiusKm / (111.0 * Math.cos(latF * Math.PI / 180));
        query += ` AND lat BETWEEN ${latF - latDelta} AND ${latF + latDelta}`;
        query += ` AND lng BETWEEN ${lngF - lngDelta} AND ${lngF + lngDelta}`;
      }

      for (const [key, value] of Object.entries(restQuery)) {
        if (key.startsWith('attr_') && value) {
          const attrName = key.replace('attr_', '');
          query += ` AND (attributes::json)->>? = ?`;
          params.push(attrName, value);
        }
      }

      // Ranking: prefer active promotions (highlight/bump) above everything
      // else, then fall back to the user's sort choice.
      const promoBoost = `
        (CASE WHEN listings.is_highlighted = 1
              AND (listings.promoted_until IS NULL OR listings.promoted_until > NOW())
              THEN 1 ELSE 0 END) DESC,
        (CASE WHEN listings.last_bumped_at IS NOT NULL
              AND listings.last_bumped_at > NOW() - INTERVAL '3 days'
              THEN 1 ELSE 0 END) DESC`;
      if (sort === 'price_asc') {
        query += ` ORDER BY ${promoBoost}, listings.price ASC`;
      } else if (sort === 'price_desc') {
        query += ` ORDER BY ${promoBoost}, listings.price DESC`;
      } else {
        query += ` ORDER BY ${promoBoost},
                   COALESCE(listings.last_bumped_at, listings.created_at) DESC`;
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const listings = await db.all(query, params) as any[];
      // Dual-expose category as both canonical id and Latvian label.
      for (const l of listings) {
        if (l?.category) {
          l.category_id = l.category;
          l.category = toLatvianLabel(l.category) ?? l.category;
        }
      }
      res.json(listings);
    } catch (error) {
      console.error('Error fetching listings:', error);
      res.status(500).json({ error: 'Server error fetching listings' });
    }
  });

  // POST /api/listings
  router.post('/', requireAuth, validateBody(listingSchema), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const { title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, exchange_for, video_url, moq, wholesale_price } = req.body;

      if (!title || price === undefined || !category) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const resolvedListingType = resolveListingType(req.body);
      const resolvedIsAuction = resolvedListingType === 'auction' || !!is_auction;
      // Store canonical category id; legacy Latvian labels sent by older
      // builds are accepted and translated here.
      const canonicalCategory = normalizeCategory(category) ?? category;

      // Per-type validation
      if (resolvedListingType === 'exchange' && (!exchange_for || !String(exchange_for).trim())) {
        return res.status(400).json({ error: 'Apmaiņas sludinājumam nepieciešams norādīt "Apmaiņā par"' });
      }
      if (resolvedListingType === 'free' || resolvedListingType === 'exchange') {
        // free / exchange — cena nav obligāta; saglabā 0.
      } else if (Number(price) <= 0) {
        return res.status(400).json({ error: 'Cenai jābūt lielākai par 0' });
      }

      const info = await db.run(
        'INSERT INTO listings (user_id, title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, listing_type, exchange_for, video_url, moq, wholesale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [decoded.userId, title, description, price, canonicalCategory, image_url, attributes ? JSON.stringify(attributes) : null, location || null, resolvedIsAuction ? 1 : 0, auction_end_date || null, resolvedListingType, exchange_for || null, video_url || null, Number.isInteger(moq) && moq >= 1 ? moq : 1, typeof wholesale_price === 'number' && Number.isFinite(wholesale_price) ? wholesale_price : null],
      );

      const listingId = info.lastInsertRowid;

      const qualityScore = calculateQualityScore({
        title,
        description,
        image_url,
        attributes: attributes ? JSON.stringify(attributes) : undefined,
        price,
        location,
      });
      await db.run('UPDATE listings SET quality_score = ? WHERE id = ?', [qualityScore, listingId]);

      try {
        await db.run('UPDATE users SET points = points + 50 WHERE id = ?', [decoded.userId]);
        await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, 50, 'Sludinājuma pievienošana']);
      } catch (pointsError) {
        console.error('Error rewarding points for listing:', pointsError);
      }

      setTimeout(() => {
        checkSavedSearchesAndNotify(listingId as number, { title, price, category, attributes }).catch(e => console.error('[saved-search-notify]', e));
      }, 0);

      setTimeout(() => {
        moderateListing(listingId as number, title, description, price).catch(e => console.error('[moderate-listing]', e));
      }, 0);

      if (location) {
        geocodeLocation(location).then(async coords => {
          if (coords) {
            await db.run('UPDATE listings SET lat = ?, lng = ? WHERE id = ?', [coords.lat, coords.lng, listingId]);
          }
        }).catch(e => console.error('[geocode]', e));
      }

      if (process.env.MEILISEARCH_HOST) {
        const author = await db.get<{ name: string }>(
          'SELECT name FROM users WHERE id = ?', [decoded.userId],
        );
        syncListing({
          id: Number(info.lastInsertRowid),
          user_id: decoded.userId,
          title,
          description: description || '',
          price: Number(price),
          category,
          subcategory: (attributes && typeof attributes === 'object' ? (attributes as any).subcategory : null) || null,
          listing_type: resolvedListingType,
          status: 'active',
          location: location || null,
          image_url: image_url || null,
          author_name: author?.name || '',
          created_at: new Date().toISOString(),
          lat: null,
          lng: null,
        }).catch(e => console.error('[SEARCH SYNC CREATE]', e));
      }

      triggerSavedSearchAlerts(
        Number(listingId),
        req.body.category || '',
        req.body.title || '',
        Number(req.body.price) || 0
      ).catch(() => {});

      invalidatePattern('listings:home:*').catch(e => console.error('Cache invalidation error:', e));
      res.json({ id: listingId, message: 'Listing created successfully' });
    } catch (error) {
      console.error('Error creating listing:', error);
      res.status(500).json({ error: 'Server error while creating listing' });
    }
  });

  // Draft endpoints (must be before /:id)
  router.use('/', createDraftsRouter());

  // GET /api/listings/discovery — personalized feed (must be before /:id)
  router.get('/discovery', async (req: any, res) => {
    try {
      let categoryFilter = '';
      const params: any[] = [];

      if (req.userId) {
        const history = await db.all(
          `SELECT l.category, COUNT(*) as cnt
           FROM favorites f JOIN listings l ON f.listing_id = l.id
           WHERE f.user_id = $1
           GROUP BY l.category ORDER BY cnt DESC LIMIT 3`,
          [req.userId]
        ) as any[];
        if (history.length > 0) {
          const cats = history.map((h: any) => h.category);
          categoryFilter = `AND l.category = ANY($1::text[])`;
          params.push(cats);
        }
      }

      const rows = await db.all(
        `SELECT l.id, l.title, l.price, l.image_url, l.category, l.location, l.quality_score, l.created_at
         FROM listings l
         WHERE l.status = 'active' ${categoryFilter}
         ORDER BY l.quality_score DESC, l.created_at DESC
         LIMIT 12`,
        params
      ) as any[];

      res.json(rows);
    } catch (e) {
      console.error('[DISCOVERY]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/listings/:id/ai-card-summary
  router.get('/:id/ai-card-summary', async (req, res) => {
    try {
      const listingId = Number(req.params.id);
      if (isNaN(listingId)) return res.status(400).json({ error: 'Invalid id' });

      const row = await db.query(
        'SELECT id, title, description, category, attributes, price, location, ai_trust_score, ai_card_summary FROM listings WHERE id = $1',
        [listingId]
      );
      const listing = row.rows[0];
      if (!listing) return res.status(404).json({ error: 'Not found' });

      // Return cached summary if available
      if (listing.ai_card_summary) {
        try {
          return res.json(JSON.parse(listing.ai_card_summary));
        } catch {
          // corrupt cache — fall through to regeneration
        }
      }

      // Generate via Gemini
      if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'AI nav pieejams' });
      const ai = getGenAI();
      if (!ai) return res.status(503).json({ error: 'AI nav pieejams' });

      const attrs = listing.attributes
        ? (typeof listing.attributes === 'string' ? JSON.parse(listing.attributes) : listing.attributes)
        : {};
      const attrText = Object.entries(attrs)
        .filter(([k, v]) => k !== 'features' && v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      const prompt = `Tu esi auto ekspertu asistents BalticMarket platformā. Analizē šo auto sludinājumu un atgriez TIKAI JSON bez nekā cita.

Sludinājums:
- Nosaukums: ${listing.title}
- Cena: €${listing.price}
- Kategorija: ${listing.category}
- Parametri: ${attrText || 'nav norādīti'}
- Apraksts: ${(listing.description || '').slice(0, 400)}

Atgriec šo precīzu JSON struktūru (latviešu valodā):
{
  "summary": "1 teikums — objektīvs auto raksturojums",
  "pros": ["stiprā puse 1", "stiprā puse 2", "stiprā puse 3"],
  "cons": ["uzmanības punkts 1", "uzmanības punkts 2"],
  "suited_for": "1 rinda — kam šis auto ir piemērotākais"
}

Svarīgi: neizdomā faktus. Balsti analīzi tikai uz sniegtajiem datiem.`;

      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      const text = (result.text ?? '').trim();

      // Extract JSON from response (strip markdown code fences if present)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: 'AI atbilde nav derīga' });

      const parsed = JSON.parse(jsonMatch[0]);

      // Cache in DB
      await db.query(
        'UPDATE listings SET ai_card_summary = $1 WHERE id = $2',
        [JSON.stringify(parsed), listingId]
      );

      res.json(parsed);
    } catch (error) {
      console.error('[ai-card-summary] error:', error);
      res.status(500).json({ error: 'Servera kļūda' });
    }
  });

  // POST /api/listings/batch — fetch up to 12 listings by id (for
  // "Recently viewed" and similar client-side lists). Preserves input
  // order and filters out inactive/rejected listings.
  // Registered BEFORE `/:id` so Express does not treat `batch` as an id.
  router.post('/batch', async (req, res) => {
    try {
      const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
      const ids = rawIds
        .map((n: unknown) => Number(n))
        .filter((n: number) => Number.isInteger(n) && n > 0);
      if (ids.length === 0) return res.json([]);
      if (ids.length > 12) return res.status(400).json({ error: 'Too many ids (max 12)' });

      const placeholders = ids.map(() => '?').join(', ');
      const rows = await db.all<any>(
        `SELECT id, title, price, category, image_url, location, created_at,
                view_count, is_highlighted, attributes, listing_type
         FROM listings
         WHERE id IN (${placeholders})
           AND status = 'active'
           AND COALESCE(ai_moderation_status, 'approved') <> 'rejected'`,
        ids,
      );
      // Preserve input order.
      const byId = new Map<number, any>();
      for (const r of rows ?? []) byId.set(Number(r.id), r);
      const ordered = ids.map((id: number) => byId.get(id)).filter(Boolean);
      res.json(ordered);
    } catch (error) {
      console.error('Error fetching batch listings:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/listings/:id/similar — 3–4 active listings in the same
  // category, preferring highlighted/promoted, price-proximal items.
  // Registered BEFORE `/:id` to ensure the 2-segment route is checked
  // first on `/api/listings/123/similar`.
  router.get('/:id/similar', async (req, res) => {
    try {
      const listingId = Number(req.params.id);
      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: 'Invalid listing id' });
      }
      const src = await db.get<{ category: string; price: number; attributes: any }>(
        `SELECT category, price, attributes FROM listings WHERE id = ?`,
        [listingId],
      );
      if (!src) return res.status(404).json({ error: 'Listing not found' });

      const rows = await db.all<any>(
        `SELECT id, title, price, category, image_url, location, created_at,
                view_count, is_highlighted, attributes
         FROM listings
         WHERE id != ?
           AND status = 'active'
           AND COALESCE(ai_moderation_status, 'approved') <> 'rejected'
           AND category = ?
         ORDER BY is_highlighted DESC,
                  (CASE WHEN promoted_until IS NOT NULL AND promoted_until > NOW() THEN 1 ELSE 0 END) DESC,
                  ABS(price - ?) ASC,
                  created_at DESC
         LIMIT 4`,
        [listingId, src.category, Number(src.price) || 0],
      );
      res.json(rows ?? []);
    } catch (error) {
      console.error('Error fetching similar listings:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // GET /api/listings/:id
  router.get('/:id', async (req, res) => {
    try {
      const { hasAccess, userId } = await hasEarlyAccess(req);

      // Do not leak the seller's email to anonymous visitors; contact goes via /api/messages.
      let sql = `
        SELECT listings.*, users.name as author_name,
               users.trust_score as seller_trust_score, users.is_verified as seller_is_verified
        FROM listings
        JOIN users ON listings.user_id = users.id
        WHERE listings.id = ?
      `;
      const params: any[] = [req.params.id];

      if (!hasAccess) {
        if (userId) {
          sql += ` AND (listings.created_at <= NOW() - INTERVAL '15 minutes' OR listings.user_id = ?)`;
          params.push(userId);
        } else {
          sql += ` AND listings.created_at <= NOW() - INTERVAL '15 minutes'`;
        }
      }

      const listing = await db.get(sql, params) as any;

      if (!listing) return res.status(404).json({ error: 'Listing not found or not available yet' });
      // Expose both forms so the legacy frontend keeps working (category =
      // Latvian label for CATEGORY_SCHEMAS lookup) while new code can use
      // category_id.
      if (listing.category) {
        listing.category_id = listing.category;
        listing.category = toLatvianLabel(listing.category) ?? listing.category;
      }
      res.json(listing);
    } catch (error) {
      console.error('Error fetching listing:', error);
      res.status(500).json({ error: 'Server error fetching listing' });
    }
  });

  // POST /api/listings/:id/view — increment view_count + daily stats
  router.post('/:id/view', async (req, res) => {
    try {
      const listingId = Number(req.params.id);
      const viewerId = verifyTokenOptional(req.headers.authorization);
      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: 'Invalid listing id' });
      }
      // Don't count the owner viewing their own listing.
      const listing = await db.get<{ id: number; user_id: number; status: string; view_count: number }>(
        `SELECT id, user_id, status, view_count FROM listings WHERE id = ?`,
        [listingId]
      );
      if (!listing || listing.status !== 'active') {
        return res.json({ success: false });
      }
      if (viewerId && viewerId === listing.user_id) {
        return res.json({ success: false, view_count: listing.view_count, today_views: 0 });
      }
      await db.run(
        `UPDATE listings SET view_count = view_count + 1 WHERE id = ?`,
        [listingId]
      );
      // Upsert per-day stats for listing + seller.
      await db.run(
        `INSERT INTO listing_view_stats (listing_id, date, views)
         VALUES (?, CURRENT_DATE, 1)
         ON CONFLICT (listing_id, date) DO UPDATE SET views = listing_view_stats.views + 1`,
        [listingId]
      );
      await db.run(
        `INSERT INTO user_daily_stats (user_id, date, views)
         VALUES (?, CURRENT_DATE, 1)
         ON CONFLICT (user_id, date) DO UPDATE SET views = user_daily_stats.views + 1`,
        [listing.user_id]
      );
      const today = await db.get<{ views: number }>(
        `SELECT views FROM listing_view_stats WHERE listing_id = ? AND date = CURRENT_DATE`,
        [listingId]
      );
      res.json({
        success: true,
        view_count: (listing.view_count ?? 0) + 1,
        today_views: today?.views ?? 1,
      });
    } catch (error) {
      console.error('Error incrementing view count:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /api/listings/:id
  router.put('/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;
      const { title, description, price, category, image_url, location, is_auction, auction_end_date, exchange_for, moq, wholesale_price } = req.body;

      const listing = await db.get('SELECT user_id, price, title FROM listings WHERE id = ?', [listingId]) as { user_id: number; price: number; title: string } | undefined;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to edit this listing' });

      const resolvedListingType = resolveListingType(req.body);
      const resolvedIsAuction = resolvedListingType === 'auction' || !!is_auction;
      const canonicalCategory = normalizeCategory(category) ?? category;

      await db.run(`
        UPDATE listings
        SET title = ?, description = ?, price = ?, category = ?, image_url = ?, location = ?, is_auction = ?, auction_end_date = ?, listing_type = ?, exchange_for = ?,
            moq = COALESCE(?, moq), wholesale_price = COALESCE(?, wholesale_price)
        WHERE id = ?
      `, [title, description, price, canonicalCategory, image_url, location || null, resolvedIsAuction ? 1 : 0, auction_end_date || null, resolvedListingType, exchange_for || null, Number.isInteger(moq) && moq >= 1 ? moq : null, typeof wholesale_price === 'number' && Number.isFinite(wholesale_price) ? wholesale_price : null, listingId]);

      const updatedListing = await db.get('SELECT * FROM listings WHERE id = ?', [listingId]) as any;
      const qualityScore = calculateQualityScore({
        title: updatedListing.title,
        description: updatedListing.description,
        image_url: updatedListing.image_url,
        attributes: updatedListing.attributes,
        price: updatedListing.price,
        location: updatedListing.location,
      });
      await db.run('UPDATE listings SET quality_score = ? WHERE id = ?', [qualityScore, listingId]);

      // Re-run AI moderation on edits so content changes can't slip past the initial check.
      const titleChanged = updatedListing.title !== listing.title;
      const priceChanged = Number(updatedListing.price) !== Number(listing.price);
      const descriptionChanged = (updatedListing.description ?? '') !== (req.body?.description ?? updatedListing.description ?? '');
      if (titleChanged || priceChanged || descriptionChanged) {
        moderateListing(
          Number(listingId),
          updatedListing.title,
          updatedListing.description || '',
          Number(updatedListing.price) || 0,
        ).catch(e => console.error('[moderate-listing:update]', { listingId, error: e?.message || e }));
      }

      if (price < listing.price) {
        const favoritedUsers = await db.all('SELECT user_id FROM favorites WHERE listing_id = ?', [listingId]) as { user_id: number }[];
        const message = `Great news! The price for "${listing.title}" has dropped from €${listing.price} to €${price}.`;
        const link = `/listing/${listingId}`;

        await db.transaction(async (client) => {
          for (const user of favoritedUsers) {
            await db.clientRun(client, `
              INSERT INTO notifications (user_id, type, title, message, link)
              VALUES (?, 'system', 'Price Drop Alert!', ?, ?)
            `, [user.user_id, message, link]);
          }
        });
      }

      if (process.env.MEILISEARCH_HOST) {
        db.get<any>(
          'SELECT l.*, u.name as author_name FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = ?',
          [listingId],
        ).then(updatedDoc => {
          if (!updatedDoc) return;
          const attrs = updatedDoc.attributes
            ? (typeof updatedDoc.attributes === 'string' ? JSON.parse(updatedDoc.attributes) : updatedDoc.attributes)
            : {};
          syncListing({
            id: Number(listingId),
            user_id: updatedDoc.user_id,
            title: updatedDoc.title,
            description: updatedDoc.description || '',
            price: Number(updatedDoc.price),
            category: updatedDoc.category,
            subcategory: attrs.subcategory || null,
            listing_type: updatedDoc.listing_type,
            status: updatedDoc.status || 'active',
            location: updatedDoc.location || null,
            image_url: updatedDoc.image_url || null,
            author_name: updatedDoc.author_name || updatedDoc.username || '',
            created_at: updatedDoc.created_at,
            lat: updatedDoc.lat || null,
            lng: updatedDoc.lng || null,
          }).catch(e => console.error('[SEARCH SYNC UPDATE]', e));
        }).catch(e => console.error('[SEARCH SYNC UPDATE FETCH]', e));
      }

      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
      console.error('Error updating listing:', error);
      res.status(500).json({ error: 'Server error updating listing' });
    }
  });

  // DELETE /api/listings/:id
  router.delete('/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      const listing = await db.get('SELECT user_id FROM listings WHERE id = ?', [listingId]) as { user_id: number } | undefined;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized to delete this listing' });

      await db.run('DELETE FROM listings WHERE id = ?', [listingId]);
      if (process.env.MEILISEARCH_HOST) {
        removeListing(Number(listingId)).catch(e => console.error('[SEARCH SYNC DELETE]', e));
      }
      invalidatePattern('listings:home:*').catch(e => console.error('Cache invalidation error:', e));
      invalidate(`listing:${listingId}`).catch(e => console.error('Cache invalidation error:', e));
      res.json({ message: 'Listing deleted successfully' });
    } catch (error) {
      console.error('Error deleting listing:', error);
      res.status(500).json({ error: 'Server error while deleting listing' });
    }
  });

  // POST /api/listings/:id/promote — unified promotion (highlight/bump/auto_bump).
  // Legacy /:id/highlight route below stays for backward compat.
  router.post('/:id/promote', requireAuth, async (req: any, res) => {
    try {
      const listingId = Number(req.params.id);
      const type = String(req.body?.type || '').trim() as any;
      if (!Number.isInteger(listingId) || listingId <= 0) {
        return res.status(400).json({ error: 'Invalid listing id' });
      }
      const result = await PromotionService.promote({
        listingId,
        userId: req.userId,
        type,
        req,
      });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg === 'INVALID_TYPE') return res.status(400).json({ error: 'Nederīgs promocijas tips' });
      if (msg === 'LISTING_NOT_FOUND') return res.status(404).json({ error: 'Sludinājums nav atrasts' });
      if (msg === 'NOT_LISTING_OWNER') return res.status(403).json({ error: 'Nav tiesību' });
      if (msg === 'LISTING_NOT_ACTIVE') return res.status(400).json({ error: 'Sludinājums nav aktīvs' });
      if (msg === 'INSUFFICIENT_POINTS') return res.status(400).json({ error: 'Nepietiek punktu' });
      if (msg === 'USER_NOT_FOUND') return res.status(404).json({ error: 'Lietotājs nav atrasts' });
      console.error('Error promoting listing:', error);
      res.status(500).json({ error: 'Server error promoting listing' });
    }
  });

  // POST /api/listings/:id/highlight
  router.post('/:id/highlight', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      const listing = await db.get('SELECT user_id, is_highlighted FROM listings WHERE id = ?', [listingId]) as any;

      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.user_id !== decoded.userId) return res.status(403).json({ error: 'Unauthorized' });
      if (listing.is_highlighted) return res.status(400).json({ error: 'Listing is already highlighted' });

      const user = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as any;
      if (!user || user.points < 100) {
        return res.status(400).json({ error: 'Nepietiekams punktu skaits (nepieciešami 100 punkti)' });
      }

      await db.transaction(async (client) => {
        await db.clientRun(client, 'UPDATE users SET points = points - 100 WHERE id = ?', [decoded.userId]);
        await db.clientRun(client, 'INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, -100, `Sludinājuma #${listingId} izcelšana`]);
        await db.clientRun(client, 'UPDATE listings SET is_highlighted = 1 WHERE id = ?', [listingId]);
      });

      const updatedUser = await db.get('SELECT points FROM users WHERE id = ?', [decoded.userId]) as any;
      res.json({ message: 'Sludinājums izcelts veiksmīgi', points: updatedUser.points });
    } catch (error) {
      console.error('Error highlighting listing:', error);
      res.status(500).json({ error: 'Server error highlighting listing' });
    }
  });

  // POST /api/listings/:id/offers
  router.post('/:id/offers', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const senderId = decoded.userId;
      const listingId = req.params.id;
      const { amount, buyerId: providedBuyerId } = req.body;

      if (!amount || isNaN(amount)) {
        return res.status(400).json({ error: 'Invalid offer amount' });
      }

      const listing = await db.get('SELECT user_id, title, status FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });
      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'Piedāvājumus var sūtīt tikai aktīviem sludinājumiem' });
      }

      const isSeller = listing.user_id === senderId;
      const buyerId = isSeller ? Number(providedBuyerId) : senderId;
      const receiverId = isSeller ? buyerId : listing.user_id;

      if (!buyerId) {
        return res.status(400).json({ error: 'Buyer ID is required for counter-offers' });
      }
      // Hard guard: buyer and seller must be different users.
      if (buyerId === listing.user_id && !isSeller) {
        return res.status(400).json({ error: 'Nevar piedāvāt savam sludinājumam' });
      }

      const info = await db.run('INSERT INTO offers (listing_id, buyer_id, sender_id, amount) VALUES (?, ?, ?, ?)', [listingId, buyerId, senderId, amount]);
      const offerId = info.lastInsertRowid;

      await db.run(
        'INSERT INTO messages (sender_id, receiver_id, listing_id, offer_id, content) VALUES (?, ?, ?, ?, ?)',
        [senderId, receiverId, listingId, offerId, isSeller ? `Es piedāvāju pretcenu €${amount}.` : `Es piedāvāju €${amount} par šo preci.`],
      );

      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'new_offer', ?, ?, ?)
      `, [
        receiverId,
        isSeller ? 'Saņemts pretpiedāvājums' : 'Jauns piedāvājums',
        isSeller
          ? `Pārdevējs izteica pretpiedāvājumu €${amount} sludinājumam "${listing.title}".`
          : `Saņemts jauns piedāvājums €${amount} sludinājumam "${listing.title}".`,
        `/chat?userId=${senderId}&listingId=${listingId}`,
      ]);

      res.json({ id: offerId, message: 'Offer sent successfully' });
    } catch (error) {
      console.error('Error sending offer:', error);
      res.status(500).json({ error: 'Server error sending offer' });
    }
  });

  // POST /api/listings/:id/bids
  router.post('/:id/bids', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const listingId = req.params.id;

      const bidAmount = parseFiniteNumber(req.body?.amount, { min: 0.01, max: 10_000_000 });
      if (bidAmount === null) {
        return res.status(400).json({ error: 'Nederīga solījuma summa' });
      }

      const listing = await db.get('SELECT price, attributes, user_id, status, listing_type FROM listings WHERE id = ?', [listingId]) as any;
      if (!listing) return res.status(404).json({ error: 'Listing not found' });

      if (listing.status !== 'active') {
        return res.status(400).json({ error: 'This auction has ended' });
      }

      if (listing.user_id === decoded.userId) {
        return res.status(400).json({ error: 'Cannot bid on your own listing' });
      }

      const attributes = listing.attributes ? JSON.parse(listing.attributes) : {};
      // Canonical check via listing_type. Fall back to legacy attributes.saleType
      // for pre-migration rows (migration 001 backfills but defence in depth).
      const isAuction = listing.listing_type === 'auction' || attributes.saleType === 'auction';
      if (!isAuction) {
        return res.status(400).json({ error: 'This listing is not an auction' });
      }

      // Guard against the race where the background auction checker has not yet
      // flipped status to 'sold'/'expired': reject bids once the end time has passed.
      if (attributes.auctionEndDate) {
        const endDate = new Date(attributes.auctionEndDate);
        if (Number.isFinite(endDate.getTime()) && endDate.getTime() <= Date.now()) {
          return res.status(400).json({ error: 'Izsole jau ir noslēgusies' });
        }
      }

      // Strikes check — block bidding if 3+ strikes
      const strikesRow = await db.get(
        'SELECT COUNT(*) as c FROM user_strikes WHERE user_id = $1',
        [decoded.userId]
      ) as any;
      const strikes = Number(strikesRow?.c ?? 0);
      if (strikes >= 3) {
        return res.status(403).json({
          error: 'Tev ir 3 vai vairāk brīdinājumi. Sazinies ar administrāciju lai atbloķētu kontu.'
        });
      }

      // Critical section: SELECT listing FOR UPDATE so two concurrent bids
      // cannot both pass the highest-bid check. Everything that reads and
      // mutates the auction state happens inside the transaction.
      let auctionEndDate = attributes.auctionEndDate;
      let bidInsertId: number | bigint;
      let extended = false;
      try {
        await db.transaction(async (client) => {
          const locked = await db.clientGet<any>(
            client,
            'SELECT price, attributes, status FROM listings WHERE id = ? FOR UPDATE',
            [listingId]
          );
          if (!locked) throw new Error('LISTING_DISAPPEARED');
          if (locked.status !== 'active') throw new Error('AUCTION_ENDED');

          const lockedAttrs = locked.attributes ? JSON.parse(locked.attributes) : {};
          if (lockedAttrs.auctionEndDate) {
            const lockedEnd = new Date(lockedAttrs.auctionEndDate);
            if (Number.isFinite(lockedEnd.getTime()) && lockedEnd.getTime() <= Date.now()) {
              throw new Error('AUCTION_ENDED');
            }
          }

          const maxRow = await db.clientGet<{ maxamount: number | null }>(
            client,
            'SELECT MAX(amount) as maxAmount FROM bids WHERE listing_id = ?',
            [listingId]
          );
          const currentHighest = (maxRow?.maxamount ?? null) !== null
            ? Number(maxRow?.maxamount)
            : Number(locked.price);
          if (bidAmount <= currentHighest) {
            throw new Error(`BID_TOO_LOW:${currentHighest}`);
          }

          // Anti-sniping: extend auction by 3 min if a bid lands in the last
          // 3 min. Happens atomically under the row lock so two near-end
          // bids cannot race the extension.
          if (lockedAttrs.auctionEndDate) {
            const endDate = new Date(lockedAttrs.auctionEndDate);
            const now = new Date();
            const timeDiffMs = endDate.getTime() - now.getTime();
            if (timeDiffMs > 0 && timeDiffMs < 3 * 60 * 1000) {
              const newEndDate = new Date(now.getTime() + 3 * 60 * 1000);
              auctionEndDate = newEndDate.toISOString();
              lockedAttrs.auctionEndDate = auctionEndDate;
              attributes.auctionEndDate = auctionEndDate;
              await db.clientRun(
                client,
                'UPDATE listings SET attributes = ? WHERE id = ?',
                [JSON.stringify(lockedAttrs), listingId]
              );
              extended = true;
            }
          }

          const insertResult = await db.clientRun(
            client,
            'INSERT INTO bids (listing_id, user_id, amount) VALUES (?, ?, ?)',
            [listingId, decoded.userId, bidAmount]
          );
          bidInsertId = insertResult.lastInsertRowid;
        });
      } catch (e: any) {
        const msg = e?.message || '';
        if (msg === 'AUCTION_ENDED') return res.status(400).json({ error: 'Izsole jau ir noslēgusies' });
        if (msg === 'LISTING_DISAPPEARED') return res.status(404).json({ error: 'Listing not found' });
        if (msg.startsWith('BID_TOO_LOW:')) {
          const currentHighest = msg.split(':')[1];
          return res.status(400).json({ error: `Bid must be higher than current highest bid: €${currentHighest}` });
        }
        throw e;
      }

      if (extended) {
        io.to(`auction_${listingId}`).emit('auction_extended', {
          listing_id: parseInt(listingId),
          new_end_date: auctionEndDate,
        });
      }

      const info = { lastInsertRowid: bidInsertId! };

      const newBid = await db.get(`
        SELECT b.id, b.user_id, b.amount, b.created_at, u.name as bidder_name
        FROM bids b
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `, [info.lastInsertRowid]) as any;

      io.emit('new_bid', {
        listingId: parseInt(listingId),
        bid: newBid,
      });
      io.to(`auction_${listingId}`).emit('new_bid', {
        listing_id: parseInt(listingId),
        amount: bidAmount,
        bidder_name: newBid.bidder_name,
        auction_end_date: auctionEndDate,
      });

      await db.run(`
        INSERT INTO notifications (user_id, type, title, message, link)
        VALUES (?, 'new_bid', 'Jauns solījums jūsu izsolē', ?, ?)
      `, [
        listing.user_id,
        `Lietotājs ${newBid.bidder_name} veica solījumu €${bidAmount} jūsu izsolē.`,
        `/listing/${listingId}`,
      ]);

      res.json(newBid);
    } catch (error) {
      console.error('Error placing bid:', error);
      res.status(500).json({ error: 'Server error while placing bid' });
    }
  });

  // GET /api/listings/:id/bids
  router.get('/:id/bids', async (req, res) => {
    try {
      const listingId = req.params.id;
      const bids = await db.all(`
        SELECT bids.*, users.name as bidder_name
        FROM bids
        JOIN users ON bids.user_id = users.id
        WHERE listing_id = ?
        ORDER BY amount DESC
      `, [listingId]);
      res.json(bids);
    } catch (error) {
      console.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Server error fetching bids' });
    }
  });

  // POST /api/listings/generate-description  (was /api/generate-description)
  router.post('/generate-description', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];

    try {
      jwt.verify(token, JWT_SECRET);
      const { category, title, ...attributes } = req.body;

      const ai = getGenAI();

      let attributesText = '';
      for (const [key, value] of Object.entries(attributes)) {
        if (value) attributesText += `${key}: ${value}\n`;
      }

      const prompt = `Izveido profesionālu, pievilcīgu un strukturētu pārdošanas aprakstu latviešu valodā šādam sludinājumam:
      Kategorija: ${category}
      Virsraksts: ${title || 'Nav norādīts'}

      Detaļas:
      ${attributesText || 'Nav norādītas papildus detaļas'}

      Aprakstam jābūt pārliecinošam, viegli lasāmam un jāizceļ preces priekšrocības. Nelieto pārāk garus ievadus, uzreiz ķeries pie lietas.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ description: response.text });
    } catch (error) {
      console.error('Error generating description:', error);
      res.status(500).json({ error: 'Server error generating description' });
    }
  });

  // POST /api/listings/recommend-price  (was /api/recommend-price)
  router.post('/recommend-price', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      const { category, title, attributes } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const ai = getGenAI();

      const safeCategory = sanitizePrompt(category, 100);
      const safeTitle = sanitizePrompt(title, 200);
      let attributesText = '';
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          if (value) attributesText += `${sanitizePrompt(key, 40)}: ${sanitizePrompt(value, 100)}\n`;
        }
      }

      const prompt = `Kā eksperts tirgus analītiķis, iesaki reālistisku pārdošanas cenu (eiro) šādam sludinājumam Latvijas tirgū.
      Kategorija: ${safeCategory}
      Virsraksts: ${safeTitle}
      Parametri:
      ${attributesText}

      Atgriez TIKAI skaitli (piemēram, 15000 vai 250). Nekādu papildu tekstu vai paskaidrojumu.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const recommendedPrice = parseInt(response.text?.replace(/[^0-9]/g, '') || '0', 10);
      res.json({ price: recommendedPrice });
    } catch (error) {
      console.error('Error recommending price:', error);
      res.status(500).json({ error: 'Server error recommending price' });
    }
  });

  // POST /api/listings/ai/generate-listing  (was /api/ai/generate-listing)
  router.post('/ai/generate-listing', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'No image URL provided' });
      }

      let imageBuffer: Buffer;
      let mimeType = 'image/jpeg';

      if (imageUrl.startsWith('http')) {
        if (!(await isSafeExternalUrl(imageUrl))) {
          return res.status(400).json({ error: 'Nederīgs vai aizliegts attēla URL' });
        }
        const imageRes = await fetch(imageUrl);
        if (!imageRes.ok) throw new Error('Failed to fetch image');
        const contentLength = Number(imageRes.headers.get('content-length') || 0);
        if (contentLength && contentLength > 10 * 1024 * 1024) {
          return res.status(413).json({ error: 'Attēls pārāk liels (max 10 MB)' });
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
          return res.status(413).json({ error: 'Attēls pārāk liels (max 10 MB)' });
        }
        imageBuffer = Buffer.from(arrayBuffer);
        mimeType = imageRes.headers.get('content-type') || 'image/jpeg';
      } else {
        // Only accept relative paths inside the uploads dir; block traversal
        const filename = path.basename(String(imageUrl));
        const filePath = path.join(uploadsDir, filename);
        if (path.dirname(filePath) !== uploadsDir) {
          return res.status(400).json({ error: 'Nederīgs attēla ceļš' });
        }
        if (!fs.existsSync(filePath)) {
          return res.status(404).json({ error: 'Image not found' });
        }
        imageBuffer = fs.readFileSync(filePath);
        mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
      }

      const ai = getGenAI();

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const prompt = `Analyze this image and generate a listing for a marketplace in Latvia.
      Return a JSON object with the following fields:
      - title: A catchy, descriptive title in Latvian.
      - description: A detailed description in Latvian.
      - category: One of the following categories: 'vehicles', 'real-estate', 'electronics', 'home', 'fashion', 'services', 'other'.
      - price: A realistic estimated price in EUR (number only).

      Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt, imagePart],
      });

      let jsonText = response.text || '{}';
      if (jsonText.startsWith('\`\`\`json')) {
        jsonText = jsonText.replace(/\`\`\`json\n?/, '').replace(/\`\`\`$/, '');
      } else if (jsonText.startsWith('\`\`\`')) {
        jsonText = jsonText.replace(/\`\`\`\n?/, '').replace(/\`\`\`$/, '');
      }

      const listingData = JSON.parse(jsonText);
      res.json(listingData);
    } catch (error) {
      console.error('Error generating listing from image:', error);
      res.status(500).json({ error: 'Server error generating listing' });
    }
  });

  // POST /api/listings/ai/decode-vin  (was /api/ai/decode-vin)
  router.post('/ai/decode-vin', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });

    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'AI pakalpojums nav pieejams' });
      }

      const { vin } = req.body;
      // VIN is a fixed-length ASCII identifier — reject anything that isn't
      // exactly 17 allowed chars to prevent smuggling prompt text into the AI.
      if (typeof vin !== 'string' || !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) {
        return res.status(400).json({ error: 'Nepareizs VIN numurs (17 simboli, tikai A-Z/0-9)' });
      }
      const safeVin = vin.toUpperCase();

      const ai = getGenAI();

      const prompt = `You are an automotive expert. Decode this VIN number: ${safeVin}

Return ONLY a valid JSON object with these fields:
{
  "make": "car brand",
  "model": "car model",
  "year": 2020,
  "bodyType": "Sedans|Universāls|Apvidus (SUV)|Hečbeks|Kupeja|Minivens|Pikaps|Cits",
  "engine": "e.g. 2.0 TDI",
  "engineCc": 1968,
  "powerKw": 110,
  "fuelType": "Dīzelis|Benzīns|Elektriskais|Hibrīds (PHEV)|Hibrīds (HEV)|Gāze (LPG)|Gāze (CNG)",
  "transmission": "Automāts|Manuāla|Robots (DSG/CVT)",
  "drive": "Priekšas (FWD)|Aizmugures (RWD)|Pilnpiedziņa (4x4/AWD)",
  "doors": 4,
  "seats": 5,
  "equipment": ["list of standard and common optional equipment for this specific model/trim"],
  "confidence": "high|medium|low"
}

For equipment array, include all standard and typical optional features for this specific variant in Latvian. Use these exact names where applicable:
Safety: "ABS", "ESP (stabilitātes kontrole)", "Priekšējais gaisa spilvens", "Sānu gaisa spilveni", "Galvas gaisa spilveni", "Joslu maiņas brīdinājums", "Akls punkts (BSD)", "Aizmugures satiksmes brīdinājums", "Avārijas bremzēšana (AEB)", "Adaptīvais kruīza kontrols", "Joslas turēšanas asistents", "Noguruma brīdinājums", "Naktsvīzija", "Imobilaizers", "Centrālā slēdzene"
Comfort: "Gaisa kondicionēšana", "Klimata kontrole (1 zona)", "Klimata kontrole (2 zonas)", "Sēdekļu apsilde priekšā", "Sēdekļu apsilde aizmugurē", "Sēdekļu ventilācija", "Elektriski regulējami sēdekļi", "Masāžas sēdekļi", "Ādas sēdekļi", "Panorāmas jumts", "Elektrisks aizmugures bagāžnieks", "Bezkontakta atslēga (Keyless)", "Start/Stop sistēma", "Apkures apsilde (Webasto)", "Stūres apsilde", "Vējstikla apsilde", "Parkošanās sensori priekšā", "Parkošanās sensori aizmugurē", "Atpakaļgaitas kamera", "360° kamera", "Automātiskā stāvvieta", "Kruīza kontrols", "Adaptīvais kruīza kontrols", "Elektriski regulējami spoguļi", "Elektriski salocāmi spoguļi", "Augstuma regulēšana (pnevmatiskā)", "Pievares kontrole"
Multimedia: "AM/FM Radio", "CD/DVD atskaņotājs", "Iebūvētā navigācija", "Apple CarPlay", "Android Auto", "Bluetooth", "Brīvroku komplekts", "USB ports", "Induktīvā uzlāde", "Heads-Up displejs (HUD)", "Premium skaļruņu sistēma", "Digitālais radio (DAB+)", "Wi-Fi hotspot", "Aizmugures izklaides sistēma"
Exterior: "Leģēta riteņu diski", "17\" diski", "18\" diski", "19\"+ diski", "Panorāmas jumts", "Jumta stieņi", "Piekabes āķis", "LED priekšējie lukturi", "Matrix LED lukturi", "Adaptīvie lukturi", "Xenon lukturi", "Miglas lukturi", "Tonēti stikli", "Rezerves ritenis", "Riepu spiediena kontrole (TPMS)", "Ziemas riepu komplekts"

Return ONLY valid JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      let jsonText = response.text || '{}';
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      const vinData = JSON.parse(jsonText);
      res.json(vinData);
    } catch (error) {
      console.error('VIN decode error:', error);
      res.status(500).json({ error: 'Neizdevās atšifrēt VIN numuru' });
    }
  });

  // POST /api/listings/compare
  router.post('/compare', requireAuth, async (req: any, res) => {
    try {
      const { ids } = req.body as { ids: number[] };
      if (!Array.isArray(ids) || ids.length < 2 || ids.length > 4) {
        return res.status(400).json({ error: 'Nepieciešami 2–4 sludinājumi salīdzināšanai' });
      }
      const sanitizedIds = ids.map(Number).filter(n => Number.isInteger(n) && n > 0);
      if (sanitizedIds.length !== ids.length) {
        return res.status(400).json({ error: 'Nederīgi sludinājumu ID' });
      }

      const placeholders = sanitizedIds.map(() => '?').join(', ');
      const listings = await db.all(
        `SELECT l.id, l.title, l.description, l.price, l.category, l.location,
                l.image_url, l.attributes, l.quality_score, l.status, u.name as author_name
         FROM listings l
         LEFT JOIN users u ON l.user_id = u.id
         WHERE l.id IN (${placeholders}) AND l.status = 'active'`,
        sanitizedIds
      ) as any[];

      if (listings.length < 2) {
        return res.status(400).json({ error: `Nepietiekams aktīvu sludinājumu skaits (atrasti: ${listings.length} no ${sanitizedIds.length})` });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'AI nav pieejams' });
      }
      const ai = getGenAI();

      const listingsText = listings.map((l: any, i: number) => {
        let attrsText = '';
        try {
          const attrs = JSON.parse(l.attributes || '{}');
          attrsText = Object.entries(attrs)
            .filter(([, v]) => v && v !== '')
            .map(([k, v]) => `${sanitizePrompt(k, 40)}: ${sanitizePrompt(v, 100)}`)
            .join(', ');
        } catch {}
        return `Sludinājums ${i + 1} (ID: ${l.id}):
  Virsraksts: ${sanitizePrompt(l.title, 200)}
  Cena: €${Number(l.price) || 0}
  Kategorija: ${sanitizePrompt(l.category, 100)}
  Atrašanās vieta: ${sanitizePrompt(l.location, 100) || 'nav norādīta'}
  Apraksts: ${sanitizePrompt(l.description, 500)}
  Papildu info: ${attrsText || 'nav'}`;
      }).join('\n\n');

      // Step 1: Google Search grounding — get real-time market context
      const itemsSummary = listings.map((l: any) => `${l.title} par €${l.price}`).join(', ');
      const category = listings[0]?.category || '';
      let marketContext = '';
      try {
        const searchResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Atrodi aktuālās tirgus cenas un tipiskās īpašības šādiem produktiem Baltijas/Latvijas tirgū: ${itemsSummary}. Kategorija: ${category}. Sniedz īsu tirgus pārskatu: vidējās cenas, populārākie modeļi, uz ko pircēji parasti pievērš uzmanību. Atbildi latviešu valodā, īsi un konkrēti.`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
        marketContext = searchResponse.text || '';
      } catch (e) {
        console.warn('[COMPARE] Search grounding failed, proceeding without market context:', e);
      }

      // Step 2: Structured comparison using market context + AI knowledge
      const marketSection = marketContext
        ? `\nAKTUĀLAIS TIRGUS KONTEKSTS (no Google meklēšanas):\n${marketContext}\n`
        : '';

      const prompt = `Tu esi pieredzējis un objektīvs tirgus analītiķis ar piekļuvi aktuāliem tirgus datiem. Salīdzini šos ${listings.length} sludinājumus UN novērtē tos pret tirgus vidējo līmeni.
${marketSection}
SLUDINĀJUMI:
${listingsText}

NOVĒRTĒŠANAS KRITĒRIJI:
1. Cenas atbilstība tirgum — vai cena ir augstāka/zemāka par tirgus vidējo?
2. Tehniskās specifikācijas vs. tirgus standarts šajā kategorijā
3. Stāvoklis, komplektācija, papildu vērtība
4. Atrašanās vieta un piegādes ērtums
5. Kopējā vērtība naudas ekvivalentā

Atbildi TIKAI JSON formātā (bez markdown, bez komentāriem):
{
  "bestPickId": <labākā sludinājuma ID kā skaitlis>,
  "marketInsight": "<1–2 teikumi par tirgus situāciju šajā kategorijā>",
  "overallSummary": "<2–3 teikumu objektīvs kopsavilkums, iekļaujot salīdzinājumu ar tirgus vidējo>",
  "rankings": [
    {
      "id": <sludinājuma ID kā skaitlis>,
      "rank": <1 = labākais>,
      "verdict": "<viens teikums — ko šis piedāvā pret tirgu>",
      "priceVsMarket": "<'Zem vidējā' | 'Tirgus cena' | 'Virs vidējā'> — un par cik procentiem aptuveni",
      "pros": ["<konkrēta priekšrocība, ideālā gadījumā ar skaitļiem>", "<otra priekšrocība>"],
      "cons": ["<konkrēts trūkums>"],
      "valueScore": <0–100, kur 100 = izcila cena/kvalitāte attiecība pret tirgu>
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = (response.text || '').trim().replace(/```json|```/g, '').trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: 'AI atbilde nav derīga' });
      const result = JSON.parse(jsonMatch[0]);

      if (
        result.bestPickId === undefined ||
        result.overallSummary === undefined ||
        !Array.isArray(result.rankings)
      ) {
        return res.status(500).json({ error: 'Salīdzināšana neizdevās' });
      }

      res.json(result);
    } catch (error: any) {
      console.error('[COMPARE]', error?.message || error);
      const status = error?.status ?? error?.code;
      if (status === 429 || String(error?.message).includes('429') || String(error?.message).includes('RESOURCE_EXHAUSTED')) {
        return res.status(503).json({ error: 'AI pakalpojums šobrīd ir pārslogots. Mēģini vēlreiz pēc dažām sekundēm.' });
      }
      res.status(500).json({ error: 'Salīdzināšana neizdevās. Mēģini vēlreiz.' });
    }
  });

  return router;
}
