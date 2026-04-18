# BalticMarket — Plāns C: Meilisearch, Drošība, Docker, Hetzner

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aizstāt SQLite FTS5 meklēšanu ar Meilisearch, nostiprināt Express drošību (helmet/rate-limit/zod), Dockerizēt aplikāciju un uzstādīt automātisku deployment uz Hetzner VPS ar nginx + SSL.

**Architecture:** Meilisearch Cloud indeksē sludinājumus realtime (sync pie create/update/delete). Drošības middleware stack: `helmet` → `cors` → `express-rate-limit`. Zod validē kritiskos request body. Dockerfile two-stage build — Vite frontend tiek kompilēts, pēc tam Express + `tsx` darbojas production režīmā ar `NODE_ENV=production`. GitHub Actions uz `main` push: build Docker image → push GHCR → SSH deploy uz Hetzner ar `docker compose pull && up -d`. Nginx reverse proxy ar SSL (Let's Encrypt).

**Tech Stack:** `meilisearch`, `helmet`, `cors`, `express-rate-limit`, `zod`, Docker 25+, GitHub Actions, Hetzner CX22 Ubuntu 24.04, nginx, Certbot

**Priekšnoteikums:** Plāni A (PostgreSQL) un B (Ārējie servisi) ir izpildīti.

---

## FĀZE 1: MEILISEARCH PILNTEKSTA MEKLĒŠANA

### Task 1: Meilisearch Cloud konta izveide

**Files:** nav — manuāls uzdevums

- [ ] **Step 1: Izveidot kontu**

Iet uz https://www.meilisearch.com/cloud → Start for free (bezmaksas, nav kartes).

- [ ] **Step 2: Izveidot projektu**

Dashboard → "Create a project":
- Project name: `balticmarket`
- Region: **eu-west-1** (Ireland)
- Click "Create project"

- [ ] **Step 3: Iegūt API atslēgas**

Project page → "API Keys" sadaļa:
- Nokopēt **Host URL**: `https://ms-xxxxxxxx-xxxx.sfo.meilisearch.io`
- Nokopēt **Default Admin API Key** (sākas ar ilgu hex stringu)

- [ ] **Step 4: Pievienot .env**

```bash
# .env failā pievienot:
MEILISEARCH_HOST=https://ms-xxxxxxxx-xxxx.sfo.meilisearch.io
MEILISEARCH_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

### Task 2: Instalēt meilisearch pakotni

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalēt**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npm install meilisearch
```

- [ ] **Step 2: Pārbaudīt**

```bash
node -e "const { MeiliSearch } = require('meilisearch'); console.log('meilisearch OK')"
```

Sagaidāmais output: `meilisearch OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add meilisearch"
```

---

### Task 3: Izveidot search service (server/services/search.ts)

**Files:**
- Create: `server/services/search.ts`

- [ ] **Step 1: Izveidot failu**

```typescript
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST!,
  apiKey: process.env.MEILISEARCH_API_KEY!,
});

export const searchIndex = client.index('listings');

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
  await searchIndex.updateSettings({
    searchableAttributes: ['title', 'description', 'location', 'author_name'],
    filterableAttributes: [
      'category',
      'subcategory',
      'listing_type',
      'status',
      'price',
      'location',
      'created_at',
      'user_id',
    ],
    sortableAttributes: ['price', 'created_at'],
  });
  console.log('[SEARCH] Meilisearch index settings updated');
}

export async function syncListing(doc: SearchableListing): Promise<void> {
  await searchIndex.addDocuments([doc], { primaryKey: 'id' });
}

export async function removeListing(id: number): Promise<void> {
  await searchIndex.deleteDocument(id);
}

export async function searchListings(params: {
  q: string;
  filter?: string[];
  sort?: string[];
}): Promise<SearchableListing[]> {
  const result = await searchIndex.search<SearchableListing>(params.q, {
    filter: params.filter,
    sort: params.sort ?? ['created_at:desc'],
    limit: 50,
  });
  return result.hits;
}
```

- [ ] **Step 2: Pārbaudīt TypeScript**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npx tsc --noEmit
```

Sagaidāmais output: nav kļūdu (vai tikai esošās kļūdas, ne jaunas).

- [ ] **Step 3: Commit**

```bash
git add server/services/search.ts
git commit -m "feat: add Meilisearch search service"
```

---

### Task 4: Inicializēt Meilisearch indeksu pie servera palaišanas

**Files:**
- Modify: `server.ts` (pie `startServer()` sākuma, ap rindu 123)

- [ ] **Step 1: Pievienot import**

`server.ts` augšdaļā (pēc esošajiem importiem, piemēram pēc rindas `import http from "http";`):

```typescript
import { initSearchIndex, syncListing, removeListing, searchListings, SearchableListing } from './server/services/search';
```

- [ ] **Step 2: Izsaukt initSearchIndex pie startServer sākuma**

`server.ts` funkcijā `startServer()`, uzreiz pēc `const io = new SocketIOServer(...)` bloka (ap rindu 133), **pirms** visiem `app.post/get/...` izsaukumiem:

```typescript
  // Initialize Meilisearch index settings
  if (process.env.MEILISEARCH_HOST) {
    initSearchIndex().catch(e => console.error('[SEARCH INIT ERROR]', e));
  }
```

- [ ] **Step 3: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat: initialize Meilisearch index on server start"
```

---

### Task 5: Aizstāt FTS5 meklēšanas endpoint ar Meilisearch

**Files:**
- Modify: `server.ts` rindas 1164–1239 (`app.get("/api/listings/search", ...)`)

- [ ] **Step 1: Nomainīt GET /api/listings/search handleri**

Atrod rindu `app.get("/api/listings/search", (req, res) => {` (ap r. 1164) un aizvieto visu handleri līdz aizvēršanas `});` (ap r. 1239) ar šo:

```typescript
  app.get("/api/listings/search", async (req, res) => {
    try {
      const { q: query, category, subcategory, minPrice, maxPrice, sort, location, listingType } = req.query;
      if (!query) return res.json([]);

      const { hasAccess, userId } = hasEarlyAccess(req);

      const filter: string[] = ['status = "active"'];
      if (category) filter.push(`category = "${(category as string).replace(/"/g, '\\"')}"`);
      if (subcategory) filter.push(`subcategory = "${(subcategory as string).replace(/"/g, '\\"')}"`);
      if (listingType && listingType !== 'all') filter.push(`listing_type = "${listingType}"`);
      if (minPrice) filter.push(`price >= ${Number(minPrice)}`);
      if (maxPrice) filter.push(`price <= ${Number(maxPrice)}`);

      const sortArr: string[] = [];
      if (sort === 'price_asc') sortArr.push('price:asc');
      else if (sort === 'price_desc') sortArr.push('price:desc');
      else sortArr.push('created_at:desc');

      let hits = await searchListings({ q: query as string, filter, sort: sortArr });

      // Early access filter: hide listings < 15 min old (except user's own)
      if (!hasAccess) {
        const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        hits = hits.filter(h => {
          if (userId && h.user_id === userId) return true;
          return h.created_at <= fifteenMinAgo;
        });
      }

      // Location partial match (post-filter since Meilisearch needs exact)
      if (location) {
        const loc = (location as string).toLowerCase();
        hits = hits.filter(h => h.location?.toLowerCase().includes(loc));
      }

      res.json(hits);
    } catch (error) {
      console.error("Error searching listings:", error);
      res.status(500).json({ error: 'Server error searching listings' });
    }
  });
```

- [ ] **Step 2: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "feat: replace SQLite FTS5 search with Meilisearch"
```

---

### Task 6: Sinhronizēt Meilisearch ar listing CRUD

**Files:**
- Modify: `server.ts` (rindas ~1648, ~1774, ~2298 — create/delete/update handleri)

- [ ] **Step 1: Sync pēc listing izveides**

`server.ts`, `app.post("/api/listings", ...)` handlerī (ap r. 1648), **pēc** `const listingId = info.lastInsertRowid;` rindas un **pirms** points apbalvošanas bloka, pievienot:

```typescript
      // Sync new listing to Meilisearch
      if (process.env.MEILISEARCH_HOST) {
        const user = db.prepare('SELECT name FROM users WHERE id = ?').get(decoded.userId) as { name: string } | undefined;
        const attrs = attributes ? (typeof attributes === 'string' ? JSON.parse(attributes) : attributes) : {};
        syncListing({
          id: Number(listingId),
          user_id: decoded.userId,
          title,
          description: description || '',
          price: Number(price),
          category,
          subcategory: attrs.subcategory || null,
          listing_type: listing_type || 'sale',
          status: 'active',
          location: location || null,
          image_url: image_url || null,
          author_name: user?.name || '',
          created_at: new Date().toISOString(),
          lat: null,
          lng: null,
        }).catch(e => console.error('[SEARCH SYNC CREATE]', e));
      }
```

**Svarīgi:** Pēc Plan A (PostgreSQL) šajā vietā `db.prepare(...)` ir aizstāts ar `await db.get(...)`. Tad `syncListing` izsaukumam arī pievienot `await` vai saglabāt to kā `fire-and-forget` (ar `.catch()`).

- [ ] **Step 2: Sync pēc listing dzēšanas**

`server.ts`, `app.delete("/api/listings/:id", ...)` handlerī (ap r. 1791), **pēc** `db.prepare('DELETE FROM listings WHERE id = ?').run(listingId);` rindas:

```typescript
      if (process.env.MEILISEARCH_HOST) {
        removeListing(Number(listingId)).catch(e => console.error('[SEARCH SYNC DELETE]', e));
      }
```

- [ ] **Step 3: Sync pēc listing atjaunināšanas**

`server.ts`, `app.put("/api/listings/:id", ...)` handlerī (ap r. 2298), **pēc** `res.json({ message: 'Listing updated successfully' });` rindas, bet **pirms** `} catch` — aizstāt `res.json(...)` rindas atrašanās vietu (ielikt pirms tās):

Atrod šo bloku (ap r. 2297):
```typescript
      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
```

Nomaina uz:
```typescript
      if (process.env.MEILISEARCH_HOST) {
        const updatedDoc = db.prepare(
          'SELECT listings.*, users.name as author_name FROM listings JOIN users ON listings.user_id = users.id WHERE listings.id = ?'
        ).get(listingId) as any;
        if (updatedDoc) {
          const attrs = updatedDoc.attributes ? JSON.parse(updatedDoc.attributes) : {};
          syncListing({
            id: Number(listingId),
            user_id: updatedDoc.user_id,
            title: updatedDoc.title,
            description: updatedDoc.description || '',
            price: updatedDoc.price,
            category: updatedDoc.category,
            subcategory: attrs.subcategory || null,
            listing_type: updatedDoc.listing_type,
            status: updatedDoc.status || 'active',
            location: updatedDoc.location || null,
            image_url: updatedDoc.image_url || null,
            author_name: updatedDoc.author_name,
            created_at: updatedDoc.created_at,
            lat: updatedDoc.lat || null,
            lng: updatedDoc.lng || null,
          }).catch(e => console.error('[SEARCH SYNC UPDATE]', e));
        }
      }
      res.json({ message: 'Listing updated successfully' });
    } catch (error) {
```

**Svarīgi:** Pēc Plan A (PostgreSQL) `db.prepare(...)` ir `await db.get(...)`. Attiecīgi piemērot.

- [ ] **Step 4: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat: sync listings to Meilisearch on create/update/delete"
```

---

### Task 7: Testēt Meilisearch meklēšanu

**Files:** nav

- [ ] **Step 1: Palaist serveri**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npm run dev
```

Sagaidāmais startup output: `[SEARCH] Meilisearch index settings updated`

- [ ] **Step 2: Pārbaudīt meklēšanas endpoint**

Jaunā terminālī:

```bash
curl "http://localhost:3000/api/listings/search?q=auto"
```

Sagaidāmais: JSON masīvs (var būt tukšs ja nav sludinājumu) — nav 500 kļūda.

- [ ] **Step 3: Pievienot testsludinājumu un meklēt**

```bash
# Reģistrēties/pieteikties, iegūt JWT token, tad:
TOKEN="eyJ..."  # aizstāt ar īstu token

curl -X POST http://localhost:3000/api/listings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"BMW 320d automāts","description":"Lielisks auto","price":15000,"category":"Transports","listing_type":"sale"}'
```

Tad gaidīt 2 sekundes un:

```bash
curl "http://localhost:3000/api/listings/search?q=BMW"
```

Sagaidāmais: JSON masīvs ar BMW sludinājumu.

---

## FĀZE 2: DROŠĪBAS MIDDLEWARE

### Task 8: Instalēt drošības pakotnes

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalēt**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npm install helmet cors express-rate-limit zod
npm install --save-dev @types/cors
```

- [ ] **Step 2: Pārbaudīt**

```bash
node -e "require('helmet'); require('cors'); require('express-rate-limit'); require('zod'); console.log('security deps OK')"
```

Sagaidāmais: `security deps OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add helmet, cors, express-rate-limit, zod"
```

---

### Task 9: Izveidot security middleware (server/middleware/security.ts)

**Files:**
- Create: `server/middleware/security.ts`

- [ ] **Step 1: Izveidot failu**

```typescript
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://balticmarket.lv', 'https://www.balticmarket.lv']
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

export const corsMiddleware = cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'res.cloudinary.com', '*.cloudinary.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      connectSrc: ["'self'", 'wss:', 'ws:', '*.meilisearch.io'],
      mediaSrc: ["'self'", 'res.cloudinary.com', '*.cloudinary.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/assets') || req.path === '/favicon.ico',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Pārāk daudz autentifikācijas mēģinājumu. Mēģiniet pēc 15 minūtēm.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Augšupielāžu limits sasniegts. Mēģiniet pēc stundas.' },
  standardHeaders: true,
  legacyHeaders: false,
});
```

- [ ] **Step 2: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/security.ts
git commit -m "feat: add security middleware (helmet, cors, rate-limit)"
```

---

### Task 10: Izveidot Zod validācijas schemas (server/middleware/validate.ts)

**Files:**
- Create: `server/middleware/validate.ts`

- [ ] **Step 1: Izveidot failu**

```typescript
import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validācijas kļūda',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

export const registerSchema = z.object({
  email: z.string().email('Nederīga e-pasta adrese').max(255),
  password: z.string().min(8, 'Parole jābūt vismaz 8 simboliem').max(100),
  name: z.string().min(2, 'Vārds jābūt vismaz 2 simboliem').max(50),
  phone: z.string().max(20).optional().nullable(),
  user_type: z.enum(['c2c', 'b2b']).optional(),
  company_name: z.string().max(100).optional().nullable(),
  company_reg_number: z.string().max(20).optional().nullable(),
  company_vat: z.string().max(20).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email('Nederīga e-pasta adrese'),
  password: z.string().min(1, 'Parole ir obligāta'),
});

export const listingSchema = z.object({
  title: z.string().min(3, 'Nosaukumam jābūt vismaz 3 simboliem').max(100),
  description: z.string().max(5000).optional().nullable(),
  price: z.number({ invalid_type_error: 'Cenai jābūt skaitlim' }).min(0).max(10_000_000),
  category: z.string().min(1, 'Kategorija ir obligāta'),
  image_url: z.string().url().optional().nullable(),
  attributes: z.record(z.unknown()).optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  is_auction: z.boolean().optional(),
  auction_end_date: z.string().datetime({ offset: true }).optional().nullable(),
  listing_type: z.enum(['sale', 'rent', 'auction', 'free', 'exchange']).optional(),
  exchange_for: z.string().max(200).optional().nullable(),
  video_url: z.string().url().optional().nullable(),
});
```

- [ ] **Step 2: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 3: Commit**

```bash
git add server/middleware/validate.ts
git commit -m "feat: add Zod validation schemas"
```

---

### Task 11: Pievienot drošības middleware server.ts

**Files:**
- Modify: `server.ts`

- [ ] **Step 1: Pievienot importus**

`server.ts` augšdaļā (pēc esošajiem importiem):

```typescript
import { corsMiddleware, helmetMiddleware, generalLimiter, authLimiter, uploadLimiter } from './server/middleware/security';
import { validateBody, registerSchema, loginSchema, listingSchema } from './server/middleware/validate';
```

- [ ] **Step 2: Pievienot globālo middleware**

`server.ts`, `startServer()` funkcijā, **pirms** Stripe Webhook handlera (ap r. 149), uzreiz pēc `io.on("connection", ...)` bloka:

```typescript
  // Security middleware
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(generalLimiter);
```

- [ ] **Step 3: Pievienot authLimiter uz autentifikācijas endpoints**

Atrast `app.post("/api/auth/register", ...)` (ap r. 537) un nomainīt tikai signature rindu:

No:
```typescript
  app.post("/api/auth/register", async (req, res) => {
```

Uz:
```typescript
  app.post("/api/auth/register", authLimiter, validateBody(registerSchema), async (req, res) => {
```

Atrast `app.post("/api/auth/login", ...)` (ap r. 560) un nomainīt:

No:
```typescript
  app.post("/api/auth/login", async (req, res) => {
```

Uz:
```typescript
  app.post("/api/auth/login", authLimiter, validateBody(loginSchema), async (req, res) => {
```

- [ ] **Step 4: Pievienot listingSchema validāciju**

Atrast `app.post("/api/listings", ...)` (ap r. 1634) un nomainīt:

No:
```typescript
  app.post("/api/listings", (req, res) => {
```

Uz:
```typescript
  app.post("/api/listings", validateBody(listingSchema), (req, res) => {
```

- [ ] **Step 5: Pievienot uploadLimiter uz upload endpoints**

Atrast `app.post("/api/upload", ...)` un `app.post("/api/upload/video", ...)` — pievienot `uploadLimiter` kā otro argumentu. Piemēram:

No:
```typescript
  app.post("/api/upload", multerUpload.array('images', 5), async (req, res) => {
```

Uz:
```typescript
  app.post("/api/upload", uploadLimiter, multerUpload.array('images', 5), async (req, res) => {
```

- [ ] **Step 6: Fiksēt Socket.IO CORS (nomainīt wildcard uz explicit origins)**

Atrast (ap r. 128):
```typescript
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
```

Nomainīt uz:
```typescript
  const SOCKET_ORIGINS = process.env.NODE_ENV === 'production'
    ? ['https://balticmarket.lv', 'https://www.balticmarket.lv']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: SOCKET_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    }
  });
```

- [ ] **Step 7: Pārbaudīt TypeScript**

```bash
npx tsc --noEmit
```

Sagaidāmais: nav jaunu kļūdu.

- [ ] **Step 8: Testēt**

```bash
npm run dev
```

Jaunā terminālī:

```bash
# Testēt, ka register endpoint atgriež validācijas kļūdu nepareiziem datiem:
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"not-email","password":"123","name":"A"}'
```

Sagaidāmais response:
```json
{"error":"Validācijas kļūda","details":{"email":["Nederīga e-pasta adrese"],"password":["Parole jābūt vismaz 8 simboliem"],"name":["Vārds jābūt vismaz 2 simboliem"]}}
```

- [ ] **Step 9: Commit**

```bash
git add server.ts
git commit -m "feat: apply security middleware and Zod validation to server"
```

---

## FĀZE 3: DOCKER

### Task 12: Izveidot Dockerfile un .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Izveidot .dockerignore**

```
node_modules
dist
.env
.env.*
*.log
uploads/
.git
.gitignore
docs/
README.md
```

- [ ] **Step 2: Izveidot Dockerfile**

```dockerfile
# Stage 1: Install dependencies and build frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner
WORKDIR /app

# tsx needed to run TypeScript server directly
RUN npm install -g tsx@4.21.0

# Copy runtime dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["tsx", "server.ts"]
```

- [ ] **Step 3: Pievienot /api/health endpoint server.ts**

`server.ts`, `startServer()` funkcijā, pēc `app.use(generalLimiter);` rindas:

```typescript
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
```

- [ ] **Step 4: Testēt Docker build lokāli**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
docker build -t balticmarket:test .
```

Sagaidāmais: `Successfully built ...` vai `writing image sha256:...` — bez ERROR.

- [ ] **Step 5: Testēt Docker container lokāli**

Kopēt `.env` failu uz pagaidu atrašanās vietu un palaist:

```bash
docker run --rm -p 3001:3000 --env-file .env -e NODE_ENV=production balticmarket:test
```

Jaunā terminālī:

```bash
curl http://localhost:3001/api/health
```

Sagaidāmais: `{"status":"ok","timestamp":"..."}"`

Pārtraukt container ar `Ctrl+C`.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore server.ts
git commit -m "feat: add Dockerfile with health check endpoint"
```

---

### Task 13: Izveidot docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Izveidot failu**

```yaml
services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY:-balticmarket/balticmarket}:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      NODE_ENV: production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

- [ ] **Step 2: Pārbaudīt sintaksi**

```bash
docker compose config
```

Sagaidāmais: YAML konfigurācija bez kļūdām.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add docker-compose for production deployment"
```

---

## FĀZE 4: CI/CD UN VPS DEPLOYMENT

### Task 14: GitHub Actions CI/CD pipeline

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Izveidot mapi un failu**

```bash
mkdir -p "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket/.github/workflows"
```

- [ ] **Step 2: Izveidot deploy.yml**

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image: ${{ steps.meta.outputs.tags }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{is_default_branch}}
            type=sha,prefix=sha-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Deploy to Hetzner VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.HETZNER_IP }}
          username: deploy
          key: ${{ secrets.HETZNER_SSH_KEY }}
          script: |
            cd /opt/balticmarket
            echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
            docker compose pull
            docker compose up -d --remove-orphans
            docker system prune -f
            echo "Deploy complete: $(date)"
```

- [ ] **Step 3: Pievienot GitHub Secrets**

Atvērt GitHub repo → Settings → Secrets and variables → Actions → New repository secret:
- `HETZNER_IP` — VPS IP adrese (iegūt Task 15 laikā)
- `HETZNER_SSH_KEY` — privātā SSH atslēga (iegūt Task 15 laikā)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions build and deploy pipeline"
```

---

### Task 15: Hetzner VPS uzstādīšana (manuāli)

**Files:** nav — manuāls uzdevums

- [ ] **Step 1: Izveidot VPS**

Iet uz https://console.hetzner.cloud → New Server:
- Location: **Falkenstein** (vistuvāk Latvijai no Hetzner EU)
- Image: **Ubuntu 24.04**
- Type: **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD, ~€4.35/mēnesī)
- SSH keys: pievienot savu publisko SSH atslēgu vai izveidot jaunu
- Server name: `balticmarket-prod`

Noklikšķināt "Create & Buy now". Sagaidāt IP adresi.

- [ ] **Step 2: Izveidot deployment lietotāju**

```bash
ssh root@YOUR_SERVER_IP

# Izveidot deploy lietotāju
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# Kopēt SSH atslēgas uz deploy lietotāju
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

- [ ] **Step 3: Instalēt Docker**

```bash
# Uz servera kā root:
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Pārbaudīt
docker --version
docker compose version
```

Sagaidāmais: `Docker version 27.x.x` un `Docker Compose version v2.x.x`

- [ ] **Step 4: Izveidot app mapi un .env failu**

```bash
mkdir -p /opt/balticmarket
cd /opt/balticmarket

# Izveidot docker-compose.yml (kopēt no repozitorija vai ievadīt manuāli):
cat > docker-compose.yml << 'EOF'
services:
  app:
    image: ghcr.io/GITHUB_USERNAME/REPO_NAME:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      NODE_ENV: production
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
EOF

# SVARĪGI: Aizstāt GITHUB_USERNAME/REPO_NAME ar īstu repozitorija path
# Piemēram: ghcr.io/valdisnipers-collab/balticmarketplace-ai-studio:latest

# Izveidot .env failu ar visiem production mainīgajiem:
nano .env
```

`.env` failā ielikt:
```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=generate-long-random-string-here

# No Plāna A:
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require

# No Plāna B:
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=BalticMarket <noreply@balticmarket.lv>
VAPID_PUBLIC_KEY=BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:admin@balticmarket.lv

# No Plāna C:
MEILISEARCH_HOST=https://ms-xxxxxxxx-xxxx.sfo.meilisearch.io
MEILISEARCH_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Esošie:
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_VERIFY_SERVICE_SID=VAxx
GOOGLE_AI_API_KEY=xxx
```

JWT_SECRET ģenerēt ar:
```bash
openssl rand -base64 64
```

- [ ] **Step 5: Pievienot GitHub Secret HETZNER_SSH_KEY**

Lokālajā mašīnā ģenerēt jaunu SSH atslēgu pāri deployment:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/balticmarket_deploy -N ""
cat ~/.ssh/balticmarket_deploy.pub
```

Uz servera pievienot publisko atslēgu deploy lietotājam:
```bash
echo "ssh-ed25519 AAAA... github-actions-deploy" >> /home/deploy/.ssh/authorized_keys
```

GitHub repo → Settings → Secrets:
- `HETZNER_SSH_KEY` = saturs no `cat ~/.ssh/balticmarket_deploy`
- `HETZNER_IP` = servera IP adrese

---

### Task 16: Nginx reverse proxy uzstādīšana

**Files:** nav — manuāls uzdevums uz servera

- [ ] **Step 1: Instalēt nginx**

```bash
# Uz servera kā root:
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
```

- [ ] **Step 2: Izveidot nginx konfigurāciju (bez SSL pagaidām)**

```bash
cat > /etc/nginx/sites-available/balticmarket << 'EOF'
server {
    listen 80;
    server_name balticmarket.lv www.balticmarket.lv;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
EOF

ln -s /etc/nginx/sites-available/balticmarket /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

Sagaidāmais: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

- [ ] **Step 3: Pārbaudīt pamata konfigurāciju**

```bash
curl http://YOUR_SERVER_IP/api/health
```

Sagaidāmais: `{"status":"ok","timestamp":"..."}` (ja Docker container jau darbojas) vai nginx 502 (ja container vēl nav palaists — tas ir OK šajā posmā).

---

### Task 17: SSL ar Let's Encrypt

**Files:** nav — manuāls uzdevums uz servera

**Priekšnoteikums:** DNS ierakstiem `balticmarket.lv` un `www.balticmarket.lv` jānorāda uz servera IP. Pagaidīt DNS izplatīšanos (5–30 min) pirms šī soļa.

- [ ] **Step 1: Pārbaudīt DNS**

```bash
dig +short balticmarket.lv
```

Sagaidāmais: servera IP adrese.

- [ ] **Step 2: Instalēt Certbot**

```bash
apt-get install -y certbot python3-certbot-nginx
```

- [ ] **Step 3: Iegūt SSL sertifikātu**

```bash
certbot --nginx -d balticmarket.lv -d www.balticmarket.lv \
  --non-interactive --agree-tos --email admin@balticmarket.lv
```

Certbot automātiski modificē nginx konfigurāciju — pievieno SSL blokus un HTTP→HTTPS redirect.

Sagaidāmais output beigas: `Successfully deployed certificate for balticmarket.lv`

- [ ] **Step 4: Pārbaudīt SSL auto-atjaunošanu**

```bash
certbot renew --dry-run
```

Sagaidāmais: `Simulating renewal of an existing certificate for balticmarket.lv`

- [ ] **Step 5: Pārbaudīt HTTPS**

```bash
curl https://balticmarket.lv/api/health
```

Sagaidāmais: `{"status":"ok","timestamp":"..."}`

---

### Task 18: Pirmais pilnais deployment

**Files:** nav

- [ ] **Step 1: Push uz main un skatīt GitHub Actions**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
git push origin main
```

Atvērt GitHub repo → Actions — skatīt "Build & Deploy" workflow izpildi.

Sagaidāmais: abi jobs (`build-and-push` un `deploy`) ✅ zaļi.

- [ ] **Step 2: Pārbaudīt deployment uz servera**

```bash
ssh deploy@YOUR_SERVER_IP
cd /opt/balticmarket
docker compose ps
```

Sagaidāmais:
```
NAME                STATUS              PORTS
balticmarket-app-1  Up X minutes        0.0.0.0:3000->3000/tcp
```

- [ ] **Step 3: Pārbaudīt health endpoint caur HTTPS**

```bash
curl https://balticmarket.lv/api/health
```

Sagaidāmais: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 4: Pārbaudīt lietotni pārlūkā**

Atver https://balticmarket.lv pārlūkā. Sagaidāmais: BalticMarket homepage bez konsoļkļūdām (F12 → Console).

---

## PĒCPĀRBAUDE

### Drošība

- [ ] **Pārbaudīt HTTP response headers**

```bash
curl -I https://balticmarket.lv/api/health
```

Sagaidāmais atslēgas header:
```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: ...
Strict-Transport-Security: max-age=15552000; includeSubDomains
```

### Rate Limiting

- [ ] **Pārbaudīt auth rate limit**

```bash
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://balticmarket.lv/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass"}'
done
```

Sagaidāmais: pirmie 10 atgriež `400`, 11. un 12. atgriež `429`.

### Meilisearch

- [ ] **Pārbaudīt meklēšanu production**

```bash
curl "https://balticmarket.lv/api/listings/search?q=test"
```

Sagaidāmais: JSON masīvs (nav 500 kļūda).

---

## QUICK REFERENCE: ENV MAINĪGO KOPSAVILKUMS

Visi mainīgie kas nepieciešami `.env` failā production serverī:

| Mainīgais | Avots | Piemērs |
|-----------|-------|---------|
| `NODE_ENV` | manuāli | `production` |
| `JWT_SECRET` | `openssl rand -base64 64` | `long-random-string` |
| `DATABASE_URL` | Neon.tech (Plāns A) | `postgresql://...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary (Plāns B) | `mycloud` |
| `CLOUDINARY_API_KEY` | Cloudinary (Plāns B) | `123456789` |
| `CLOUDINARY_API_SECRET` | Cloudinary (Plāns B) | `xxx` |
| `UPSTASH_REDIS_REST_URL` | Upstash (Plāns B) | `https://xxx.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash (Plāns B) | `AXxxx` |
| `RESEND_API_KEY` | Resend (Plāns B) | `re_xxx` |
| `RESEND_FROM` | manuāli | `BalticMarket <noreply@balticmarket.lv>` |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` (Plāns B) | `BNxxx` |
| `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (Plāns B) | `xxx` |
| `VAPID_SUBJECT` | manuāli | `mailto:admin@balticmarket.lv` |
| `MEILISEARCH_HOST` | Meilisearch Cloud (šis plāns) | `https://ms-xxx.meilisearch.io` |
| `MEILISEARCH_API_KEY` | Meilisearch Cloud (šis plāns) | `xxx` |
| `STRIPE_SECRET_KEY` | Stripe | `sk_live_xxx` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe | `pk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks | `whsec_xxx` |
| `TWILIO_ACCOUNT_SID` | Twilio | `ACxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio | `xxx` |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio | `VAxxx` |
| `GOOGLE_AI_API_KEY` | Google AI Studio | `AIzaxxx` |
