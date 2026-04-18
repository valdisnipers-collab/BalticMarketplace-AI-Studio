# BalticMarket — Plāns A: PostgreSQL Migrācija

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aizstāt better-sqlite3 ar PostgreSQL (Neon.tech), konvertēt visus 194 db.prepare() izsaukumus uz async/await, saglabāt pilnu funkcionalitāti.

**Architecture:** Jauns `server/pg.ts` modulis eksponē `db.get/all/run/transaction` wrapperus kas automātiski konvertē `?` uz `$1,$2...` placeholder sintaksi. Visi server.ts handler'i kļūst async. SQLite `json_extract(col,'$.field')` → PostgreSQL `(col::json)->>'field'`. FTS5 virtual table tiek noņemts — to aizstās Meilisearch (Plāns C).

**Tech Stack:** `pg` npm pakotne, Neon.tech (serverless PostgreSQL, eu-central-1 Frankfurt), `@types/pg`

---

## SERVISU REĢISTRĀCIJA (manuāli, pirms koda)

### Task 1: Neon.tech konta izveide

**Files:** nav — manuāls uzdevums

- [ ] **Step 1: Izveidot kontu**

Iet uz https://neon.tech → Sign Up (bezmaksas, nav kartes).

- [ ] **Step 2: Izveidot projektu**

Dashboard → "New Project":
- Name: `balticmarket`
- Region: **eu-central-1** (Frankfurt — visātrākais no Latvijas)
- PostgreSQL version: 16

- [ ] **Step 3: Iegūt connection string**

Project → Dashboard → Connection Details:
- Connection string: `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`
- Nokopēt pilnu string — vajadzīgs kā `DATABASE_URL`

- [ ] **Step 4: Pievienot .env**

```bash
# .env failā pievienot:
DATABASE_URL=postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

## FĀZE 1: DEPENDENCIES UN DB WRAPPER

### Task 2: Instalēt pg pakotni

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalēt**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npm install pg
npm install --save-dev @types/pg
npm uninstall better-sqlite3 @types/better-sqlite3
```

- [ ] **Step 2: Pārbaudīt**

```bash
node -e "const { Pool } = require('pg'); console.log('pg OK')"
```

Sagaidāmais output: `pg OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: replace better-sqlite3 with pg for PostgreSQL support"
```

---

### Task 3: Izveidot pg wrapper (server/pg.ts)

**Files:**
- Create: `server/pg.ts`
- Delete: `server/db.ts` (aizstāts)

- [ ] **Step 1: Izveidot server/pg.ts**

```typescript
// server/pg.ts
import { Pool, PoolClient } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

// Converts SQLite ? placeholders to PostgreSQL $1, $2, ...
function parameterize(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const db = {
  // Replaces: db.prepare(sql).get(p1, p2) → await db.get(sql, [p1, p2])
  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { rows } = await pool.query(parameterize(sql), params);
    return (rows[0] as T) ?? null;
  },

  // Replaces: db.prepare(sql).all(p1, p2) → await db.all(sql, [p1, p2])
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { rows } = await pool.query(parameterize(sql), params);
    return rows as T[];
  },

  // Replaces: db.prepare(sql).run(p1, p2) → await db.run(sql, [p1, p2])
  // Returns { lastInsertRowid, changes } to match SQLite API
  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const returningSQL = sql.trim().toUpperCase().startsWith('INSERT')
      ? parameterize(sql) + ' RETURNING id'
      : parameterize(sql);
    const result = await pool.query(returningSQL, params);
    return {
      lastInsertRowid: result.rows[0]?.id ?? 0,
      changes: result.rowCount ?? 0,
    };
  },

  // Replaces: db.transaction(() => { ... })()
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // Direct pool.query access for complex queries
  async query(sql: string, params: any[] = []) {
    return pool.query(parameterize(sql), params);
  },

  // For use inside transactions
  clientGet: async <T = any>(client: PoolClient, sql: string, params: any[] = []): Promise<T | null> => {
    const { rows } = await client.query(parameterize(sql), params);
    return (rows[0] as T) ?? null;
  },
  clientRun: async (client: PoolClient, sql: string, params: any[] = []) => {
    const returningSQL = sql.trim().toUpperCase().startsWith('INSERT')
      ? parameterize(sql) + ' RETURNING id'
      : parameterize(sql);
    const result = await client.query(returningSQL, params);
    return { lastInsertRowid: result.rows[0]?.id ?? 0, changes: result.rowCount ?? 0 };
  },
};

export default db;
```

- [ ] **Step 2: Pārbaudīt TypeScript**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npx tsc --noEmit 2>&1 | head -20
```

Sagaidāmais: kļūdas tikai server/db.ts importos server.ts — tas ir normāli, labot nākamajā solī.

- [ ] **Step 3: Commit**

```bash
git add server/pg.ts
git commit -m "feat(db): add PostgreSQL wrapper with parameterize() and transaction support"
```

---

## FĀZE 2: POSTGRESQL SCHEMA

### Task 4: Izveidot PostgreSQL shēmu (server/schema.sql)

**Files:**
- Create: `server/schema.sql`

- [ ] **Step 1: Izveidot server/schema.sql**

```sql
-- server/schema.sql
-- PostgreSQL schema for BalticMarket
-- Run: psql $DATABASE_URL < server/schema.sql
-- Or: node server/init-db.ts

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  balance DOUBLE PRECISION DEFAULT 0,
  points INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  user_type TEXT DEFAULT 'c2c',
  company_name TEXT,
  company_reg_number TEXT,
  company_vat TEXT,
  company_address TEXT,
  early_access_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings
CREATE TABLE IF NOT EXISTS listings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  attributes TEXT,
  location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'active',
  is_auction INTEGER DEFAULT 0,
  auction_end_date TIMESTAMPTZ,
  listing_type TEXT DEFAULT 'sale',
  exchange_for TEXT,
  is_highlighted INTEGER DEFAULT 0,
  highlight_expires_at TIMESTAMPTZ,
  ai_trust_score INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text search index (PostgreSQL native, until Meilisearch)
CREATE INDEX IF NOT EXISTS listings_search_idx ON listings 
  USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'')));

CREATE INDEX IF NOT EXISTS listings_user_id_idx ON listings(user_id);
CREATE INDEX IF NOT EXISTS listings_category_idx ON listings(category);
CREATE INDEX IF NOT EXISTS listings_status_idx ON listings(status);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  reviewer_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  seller_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  order_id BIGINT,
  listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bids (auctions)
CREATE TABLE IF NOT EXISTS bids (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id BIGINT REFERENCES categories(id),
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  offer_id BIGINT,
  content TEXT,
  image_url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx ON messages(sender_id, receiver_id);

-- Transactions (wallet)
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'completed',
  description TEXT,
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points history
CREATE TABLE IF NOT EXISTS points_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, is_read);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT,
  category TEXT,
  min_price DOUBLE PRECISION,
  max_price DOUBLE PRECISION,
  filters TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT INTO settings (key, value) VALUES
  ('site_name', 'BalticMarket'),
  ('maintenance_mode', 'false'),
  ('min_listing_price', '0'),
  ('platform_fee_percent', '5')
ON CONFLICT (key) DO NOTHING;

-- Ads
CREATE TABLE IF NOT EXISTS ads (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT,
  link_url TEXT,
  size TEXT DEFAULT '728x90',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  is_active INTEGER DEFAULT 1,
  category TEXT,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'approved',
  price_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad stats
CREATE TABLE IF NOT EXISTS ad_stats (
  id BIGSERIAL PRIMARY KEY,
  ad_id BIGINT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  UNIQUE(ad_id, date)
);

-- Followers
CREATE TABLE IF NOT EXISTS followers (
  follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT REFERENCES listings(id) ON DELETE SET NULL,
  buyer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_session_id TEXT,
  shipping_method TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_buyer_idx ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON orders(seller_id);

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Stores (B2B vitrīnas)
CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  banner_url TEXT,
  logo_url TEXT,
  tagline TEXT,
  description TEXT,
  website TEXT,
  phone TEXT,
  working_hours TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Izveidot init-db.ts skriptu**

```typescript
// server/init-db.ts
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './pg';

async function initDb() {
  console.log('Initializing PostgreSQL schema...');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await pool.query(schema);
    console.log('✓ Schema created successfully');
  } catch (error) {
    console.error('Schema error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
```

- [ ] **Step 3: Palaist shēmas inicializāciju**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npx tsx server/init-db.ts
```

Sagaidāmais output:
```
Initializing PostgreSQL schema...
✓ Schema created successfully
```

- [ ] **Step 4: Pārbaudīt Neon.tech konsolē**

Neon.tech Dashboard → Tables — jāredz visas 22 tabulas.

- [ ] **Step 5: Commit**

```bash
git add server/schema.sql server/init-db.ts
git commit -m "feat(db): add PostgreSQL schema with all 22 tables and indexes"
```

---

## FĀZE 3: SERVER.TS KONVERTĒŠANA

### Task 5: Nomainīt imports un izprast konversijas pattern

**Files:**
- Modify: `server.ts` (pirmās 20 rindas)

- [ ] **Step 1: Nomainīt db importu server.ts sākumā**

Atrast un aizstāt rindu:
```typescript
// VECĀ RINDA (dzēst):
import db from "./server/db";

// JAUNĀ RINDA (pievienot):
import db from "./server/pg";
```

- [ ] **Step 2: Izprast konversijas pattern (neko nevajag mainīt — tikai saprast)**

Visi turpmākie soļi sekos ŠIEM 5 pattern'iem:

**Pattern A — get() (viena rinda):**
```typescript
// PIRMS:
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;

// PĒC:
const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
```

**Pattern B — all() (vairākas rindas):**
```typescript
// PIRMS:
const items = db.prepare('SELECT * FROM listings WHERE user_id = ?').all(userId) as any[];

// PĒC:
const items = await db.all('SELECT * FROM listings WHERE user_id = ?', [userId]);
```

**Pattern C — run() (INSERT/UPDATE/DELETE):**
```typescript
// PIRMS:
const info = db.prepare('INSERT INTO users (email, name) VALUES (?, ?)').run(email, name);
const newId = info.lastInsertRowid;

// PĒC:
const info = await db.run('INSERT INTO users (email, name) VALUES (?, ?)', [email, name]);
const newId = info.lastInsertRowid;
```

**Pattern D — json_extract (SQLite → PostgreSQL):**
```typescript
// PIRMS (SQLite FTS5):
const listings = db.prepare(`
  SELECT * FROM listings_fts 
  JOIN listings ON listings_fts.id = listings.id
  WHERE listings_fts MATCH ?
`).all(query + '*') as any[];

// PĒC (PostgreSQL FTS):
const listings = await db.all(`
  SELECT listings.*, users.name as author_name
  FROM listings
  JOIN users ON listings.user_id = users.id
  WHERE to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,''))
    @@ plainto_tsquery('simple', ?)
  AND status = 'active'
`, [query]);
// PIEZĪME: Meilisearch (Plāns C) aizstās šo ar daudz labāku meklēšanu
```

**Pattern E — transaction (SQLite → PostgreSQL):**
```typescript
// PIRMS:
const tx = db.transaction(() => {
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, userId);
  db.prepare('INSERT INTO transactions ...').run(...);
});
tx();

// PĒC:
await db.transaction(async (client) => {
  await db.clientRun(client, 'UPDATE users SET balance = balance + ? WHERE id = ?', [amount, userId]);
  await db.clientRun(client, 'INSERT INTO transactions ...', [...]);
});
```

**Pattern F — INSERT OR IGNORE (SQLite → PostgreSQL):**
```typescript
// PIRMS:
db.prepare('INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)').run(userId, listingId);

// PĒC:
await db.run('INSERT INTO favorites (user_id, listing_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, listingId]);
```

- [ ] **Step 3: Commit**

```bash
git add server.ts
git commit -m "refactor(db): update import from better-sqlite3 to pg wrapper"
```

---

### Task 6: Konvertēt Auth endpoints

**Files:**
- Modify: `server.ts` (rindas ~430–550, auth endpoints)

- [ ] **Step 1: Konvertēt POST /api/auth/request-otp**

Atrast `app.post("/api/auth/request-otp"` (~rinda 326 pēc jaunajām rindām). Padarīt handler async un konvertēt queries:

```typescript
app.post("/api/auth/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  try {
    // PIRMS: const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
    const existing = await db.get('SELECT id FROM users WHERE phone = ?', [phone]);
    // ... rest of handler unchanged
  }
});
```

- [ ] **Step 2: Konvertēt POST /api/auth/verify-otp**

```typescript
app.post("/api/auth/verify-otp", async (req, res) => {
  // ...
  // PIRMS: const userExists = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  const userExists = await db.get('SELECT * FROM users WHERE phone = ?', [phone]);
  
  if (!userExists) {
    // PIRMS: const info = db.prepare('INSERT INTO users (phone, name, role) VALUES (?, ?, ?)').run(phone, phone, 'user');
    const info = await db.run('INSERT INTO users (phone, name, role) VALUES (?, ?, ?)', [phone, phone, 'user']);
    user = { id: info.lastInsertRowid, phone, name: phone, role: 'user', user_type: 'c2c', is_verified: 0, points: 0 };
  }
  // ...
});
```

- [ ] **Step 3: Konvertēt GET /api/auth/me (~rinda 580)**

```typescript
app.get("/api/auth/me", async (req, res) => {
  // ...
  // PIRMS: const user = db.prepare('SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat FROM users WHERE id = ?').get(decoded.userId);
  const user = await db.get(
    'SELECT id, email, name, role, phone, is_verified, user_type, points, early_access_until, company_name, company_reg_number, company_vat FROM users WHERE id = ?',
    [decoded.userId]
  );
  // ...
});
```

- [ ] **Step 4: Konvertēt Smart-ID endpoints (~rindas 390–480)**

Katrs `db.prepare(...).get/run/all()` izsaukums Smart-ID handler'os:

```typescript
// /api/auth/smart-id/register/status — async handler
app.post("/api/auth/smart-id/register/status", async (req, res) => {
  // ...
  // PIRMS:
  // const stmt = db.prepare('INSERT INTO users (...) VALUES (...)');
  // const info = stmt.run(...);
  
  // PĒC:
  const info = await db.run(
    'INSERT INTO users (email, password_hash, name, user_type, role, is_verified, company_name, company_reg_number, company_vat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [email, null, name, uType, 'user', 1, company_name, company_reg_number, company_vat]
  );
  // ...
});
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "server.ts" | head -20
```

Labot visas kļūdas kas saistītas ar `db.prepare` — tās nozīmē nepārveidotas vietas.

- [ ] **Step 6: Commit**

```bash
git add server.ts
git commit -m "refactor(db): convert auth endpoints to async PostgreSQL"
```

---

### Task 7: Konvertēt Listings endpoints

**Files:**
- Modify: `server.ts` (listings CRUD, ~rindas 1100–1700)

- [ ] **Step 1: Konvertēt GET /api/listings/search**

```typescript
app.get("/api/listings/search", async (req, res) => {
  try {
    const { q: query, category, subcategory, minPrice, maxPrice, sort, location, listingType, ...restQuery } = req.query;
    if (!query) return res.json([]);

    let sql = `
      SELECT listings.*, users.name as author_name
      FROM listings
      JOIN users ON listings.user_id = users.id
      WHERE listings.status = 'active'
      AND to_tsvector('simple', coalesce(listings.title,'') || ' ' || coalesce(listings.description,'') || ' ' || coalesce(listings.category,''))
          @@ plainto_tsquery('simple', ?)
    `;
    const params: any[] = [query];

    if (category) { sql += ` AND listings.category = ?`; params.push(category); }
    if (subcategory) { sql += ` AND (listings.attributes::json)->>'subcategory' = ?`; params.push(subcategory); }
    if (listingType && listingType !== 'all') { sql += ` AND listings.listing_type = ?`; params.push(listingType); }
    if (minPrice) { sql += ` AND listings.price >= ?`; params.push(Number(minPrice)); }
    if (maxPrice) { sql += ` AND listings.price <= ?`; params.push(Number(maxPrice)); }
    if (location) { sql += ` AND listings.location ILIKE ?`; params.push(`%${location}%`); }

    for (const [key, value] of Object.entries(restQuery)) {
      if (key.startsWith('attr_') && value) {
        const attrName = key.replace('attr_', '');
        sql += ` AND (listings.attributes::json)->>'${attrName}' = ?`;
        params.push(value);
      }
    }

    if (sort === 'price_asc') sql += ` ORDER BY listings.is_highlighted DESC, listings.price ASC`;
    else if (sort === 'price_desc') sql += ` ORDER BY listings.is_highlighted DESC, listings.price DESC`;
    else sql += ` ORDER BY listings.is_highlighted DESC, listings.created_at DESC`;

    const listings = await db.all(sql, params);
    res.json(listings);
  } catch (error) {
    console.error("Error searching listings:", error);
    res.status(500).json({ error: 'Server error searching listings' });
  }
});
```

- [ ] **Step 2: Konvertēt GET /api/listings**

```typescript
app.get("/api/listings", async (req, res) => {
  try {
    const { category, subcategory, minPrice, maxPrice, sort, location, listingType, lat, lng, radius, ...restQuery } = req.query;

    let query = `
      SELECT listings.*, users.name as author_name
      FROM listings
      JOIN users ON listings.user_id = users.id
      WHERE listings.status = 'active'
    `;
    const params: any[] = [];

    if (category) { query += ` AND category = ?`; params.push(category); }
    if (subcategory) { query += ` AND (attributes::json)->>'subcategory' = ?`; params.push(subcategory); }
    if (listingType && listingType !== 'all') { query += ` AND listing_type = ?`; params.push(listingType); }
    if (minPrice) { query += ` AND price >= ?`; params.push(Number(minPrice)); }
    if (maxPrice) { query += ` AND price <= ?`; params.push(Number(maxPrice)); }
    if (location) { query += ` AND location ILIKE ?`; params.push(`%${location}%`); }

    if (lat && lng && radius) {
      const latF = parseFloat(lat as string), lngF = parseFloat(lng as string), radiusKm = parseFloat(radius as string);
      const latDelta = radiusKm / 111.0;
      const lngDelta = radiusKm / (111.0 * Math.cos(latF * Math.PI / 180));
      query += ` AND lat BETWEEN ${latF - latDelta} AND ${latF + latDelta}`;
      query += ` AND lng BETWEEN ${lngF - lngDelta} AND ${lngF + lngDelta}`;
    }

    for (const [key, value] of Object.entries(restQuery)) {
      if (key.startsWith('attr_') && value) {
        const attrName = key.replace('attr_', '');
        query += ` AND (attributes::json)->>'${attrName}' = ?`;
        params.push(value);
      }
    }

    if (sort === 'price_asc') query += ` ORDER BY listings.is_highlighted DESC, listings.price ASC`;
    else if (sort === 'price_desc') query += ` ORDER BY listings.is_highlighted DESC, listings.price DESC`;
    else query += ` ORDER BY listings.is_highlighted DESC, listings.created_at DESC`;

    const listings = await db.all(query, params);
    res.json(listings);
  } catch (error) {
    console.error("Error fetching listings:", error);
    res.status(500).json({ error: 'Server error fetching listings' });
  }
});
```

- [ ] **Step 3: Konvertēt GET /api/listings/:id**

```typescript
app.get("/api/listings/:id", async (req, res) => {
  try {
    const listing = await db.get(`
      SELECT listings.*, users.name as author_name, users.email as author_email,
             users.is_verified as author_is_verified, users.user_type as author_user_type
      FROM listings
      JOIN users ON listings.user_id = users.id
      WHERE listings.id = ?
    `, [req.params.id]);

    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 4: Konvertēt POST /api/listings (listing izveide)**

```typescript
app.post("/api/listings", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, listing_type, exchange_for, video_url } = req.body;

    if (!title || price === undefined || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const info = await db.run(
      'INSERT INTO listings (user_id, title, description, price, category, image_url, attributes, location, is_auction, auction_end_date, listing_type, exchange_for, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [decoded.userId, title, description, price, category, image_url, attributes ? JSON.stringify(attributes) : null, location || null, is_auction ? 1 : 0, auction_end_date || null, listing_type || 'sale', exchange_for || null, video_url || null]
    );

    const listingId = info.lastInsertRowid;

    // Points reward
    await db.run('UPDATE users SET points = points + 50 WHERE id = ?', [decoded.userId]);
    await db.run('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)', [decoded.userId, 50, 'Sludinājuma pievienošana']);

    // Async geocoding + AI moderation (unchanged)
    if (location) geocodeLocation(location).then(coords => {
      if (coords) db.run('UPDATE listings SET lat = ?, lng = ? WHERE id = ?', [coords.lat, coords.lng, listingId]);
    });
    setTimeout(() => moderateListing(listingId as number, title, description, price), 0);
    setTimeout(() => checkSavedSearchesAndNotify(listingId as number, { title, price, category, attributes }), 0);

    res.json({ id: listingId, message: 'Listing created successfully' });
  } catch (error) {
    console.error("Error creating listing:", error);
    res.status(500).json({ error: 'Server error while creating listing' });
  }
});
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "error" | grep "server.ts" | head -20
```

- [ ] **Step 6: Commit**

```bash
git add server.ts
git commit -m "refactor(db): convert listings endpoints to async PostgreSQL"
```

---

### Task 8: Konvertēt Orders, Wallet, Chat endpoints

**Files:**
- Modify: `server.ts` (orders ~rindas 700–900, wallet ~rindas 950–1090, messages ~rindas 1800–2000)

- [ ] **Step 1: Konvertēt Orders endpoints — padarīt async**

Katrs orders handler (`/api/orders`, `/api/orders/:id/ship`, `/api/orders/:id/confirm`) — pievienot `async`, konvertēt queries pēc pattern'iem no Task 5.

Piemērs POST /api/orders:
```typescript
app.post("/api/orders", async (req, res) => {
  // ...
  const listing = await db.get('SELECT * FROM listings WHERE id = ? AND status = ?', [listingId, 'active']);
  if (!listing) return res.status(404).json({ error: 'Listing not found or not active' });
  
  // Pārbaudīt vai nav pats savs sludinājums
  if (listing.user_id === buyerId) return res.status(400).json({ error: 'Cannot buy your own listing' });
  
  const orderInfo = await db.run(
    'INSERT INTO orders (listing_id, buyer_id, seller_id, amount, status, shipping_method, shipping_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [listingId, buyerId, listing.user_id, listing.price, 'pending', shippingMethod || 'pickup', shippingAddress || null]
  );
  // ...
});
```

Transactions ar db.transaction():
```typescript
await db.transaction(async (client) => {
  await db.clientRun(client, 'UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId]);
  await db.clientRun(client, 'UPDATE users SET balance = balance + ? WHERE id = ?', [order.amount, order.seller_id]);
});
```

- [ ] **Step 2: Konvertēt Wallet endpoints**

```typescript
app.get("/api/wallet/balance", async (req, res) => {
  // ...
  const user = await db.get('SELECT balance, points FROM users WHERE id = ?', [decoded.userId]);
  res.json({ balance: user?.balance ?? 0, points: user?.points ?? 0 });
});

app.get("/api/wallet/history", async (req, res) => {
  // ...
  const history = await db.all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [decoded.userId]
  );
  res.json(history);
});
```

- [ ] **Step 3: Konvertēt Messages/Chat endpoints**

```typescript
app.get("/api/messages/:userId", async (req, res) => {
  // ...
  const messages = await db.all(`
    SELECT messages.*, 
           sender.name as sender_name,
           receiver.name as receiver_name
    FROM messages
    JOIN users sender ON messages.sender_id = sender.id
    JOIN users receiver ON messages.receiver_id = receiver.id
    WHERE (messages.sender_id = ? AND messages.receiver_id = ?)
       OR (messages.sender_id = ? AND messages.receiver_id = ?)
    ORDER BY messages.created_at ASC
  `, [currentUserId, req.params.userId, req.params.userId, currentUserId]);
  res.json(messages);
});
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "db.prepare" | wc -l
```

Sagaidāmais: 0 (nul nepārveidotu `db.prepare` izsaukumu)

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "refactor(db): convert orders, wallet, messages endpoints to async PostgreSQL"
```

---

### Task 9: Konvertēt Admin, Disputes, Badges endpoints

**Files:**
- Modify: `server.ts` (rindas ~2400–2700)

- [ ] **Step 1: Konvertēt Admin endpoints**

Visiem admin handler'iem (`/api/admin/users`, `/api/admin/listings`, `/api/admin/stats`, utt.) pievienot `async` un konvertēt queries:

```typescript
app.get("/api/admin/stats", isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalListings, pendingReports, totalRevenue] = await Promise.all([
      db.get('SELECT COUNT(*) as count FROM users'),
      db.get('SELECT COUNT(*) as count FROM listings'),
      db.get("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'"),
      db.get("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'completed'"),
    ]);
    res.json({
      totalUsers: Number(totalUsers?.count ?? 0),
      totalListings: Number(totalListings?.count ?? 0),
      pendingReports: Number(pendingReports?.count ?? 0),
      totalRevenue: Number(totalRevenue?.total ?? 0),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 2: Konvertēt isAdmin middleware**

```typescript
const isAdmin = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await db.get<{ role: string }>('SELECT role FROM users WHERE id = ?', [decoded.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Admins only' });
    (req as any).adminUserId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

- [ ] **Step 3: Konvertēt requireAuth middleware**

```typescript
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    (req as any).userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

- [ ] **Step 4: Konvertēt checkAndAwardBadges()**

```typescript
async function checkAndAwardBadges(userId: number) {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return;
  if (user.is_verified) await db.run(
    'INSERT INTO user_achievements (user_id, badge_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
    [userId, 'verified_seller']
  );
  const orderCount = (await db.get<{c: string}>('SELECT COUNT(*) as c FROM orders WHERE seller_id = ? AND status = $2', [userId, 'completed']))?.c ?? 0;
  const avgRating = (await db.get<{r: string}>('SELECT AVG(rating) as r FROM reviews WHERE seller_id = ?', [userId]))?.r ?? 0;
  if (Number(orderCount) >= 10 && Number(avgRating) >= 4.5) {
    await db.run('INSERT INTO user_achievements (user_id, badge_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [userId, 'trusted_seller']);
  }
  // ... pārējas badges pēc tā paša pattern
}
```

- [ ] **Step 5: Galīgais TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Sagaidāmais: **0 kļūdas**

- [ ] **Step 6: Pilns commit**

```bash
git add server.ts server/pg.ts server/schema.sql server/init-db.ts
git commit -m "refactor(db): complete PostgreSQL migration - all 194 queries converted to async"
```

---

## FĀZE 4: TESTĒŠANA

### Task 10: Lokāla testēšana

**Files:** nav — testēšanas uzdevums

- [ ] **Step 1: Palaist serveri**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npm run dev
```

Sagaidāmais output:
```
Initializing server...
Server running on port 3000
```

- [ ] **Step 2: Pārbaudīt health endpoint**

```bash
curl http://localhost:3000/api/health
```

Sagaidāmais: `{"status":"ok"}`

- [ ] **Step 3: Pārbaudīt lietotāju reģistrāciju**

```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+37120000001","otp":"123456"}'
```

Sagaidāmais: `{"token":"eyJ...","user":{...}}`

- [ ] **Step 4: Pārbaudīt listings**

```bash
curl http://localhost:3000/api/listings
```

Sagaidāmais: `[]` (tukšs masīvs — jauna DB)

- [ ] **Step 5: Pārbaudīt admin endpoint**

Atver http://localhost:3000/admin → jāiedarbinās admin panelim (ar esošu admin JWT tokenu)

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete PostgreSQL migration - BalticMarket now runs on Neon.tech"
```

---

## PIEZĪMES PAR BIEŽĀKAJĀM KĻŪDĀM

### PostgreSQL COUNT() atgriež TEXT, ne NUMBER
```typescript
// SQLite: count = 5 (number)
// PostgreSQL: count = "5" (string!)
const count = parseInt(result?.count ?? '0', 10);
```

### BIGSERIAL id ir BIGINT, ne NUMBER
```typescript
// Drošai konversijai:
const id = Number(info.lastInsertRowid);
```

### ILIKE vietā LIKE
SQLite izmanto `LIKE` case-insensitive. PostgreSQL `LIKE` ir case-sensitive — izmantot `ILIKE`:
```sql
-- SQLite:
WHERE location LIKE '%rīga%'

-- PostgreSQL:
WHERE location ILIKE '%rīga%'
```

### Datumi
PostgreSQL atgriež datumu kā JavaScript Date objektu, ne string:
```typescript
// Drošai sērijalizācijai JSON:
const listing = { ...row, created_at: row.created_at?.toISOString() };
```
