# BalticMarket — Platformas Pabeigšanas un Uzlabošanas Plāns

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pabeigt un uzlabot BalticMarket platformas funkcionalitāti, prioritizējot biznesa kritiski svarīgas funkcijas un izmantojot esošo arhitektūru bez dizaina vai struktūras maiņas.

**Architecture:** React + Express.js + SQLite + Socket.IO + Gemini AI. Visi jaunie endpoints iet caur `server.ts`. DB migrācijas izmanto esošo `try/catch ALTER TABLE` pattern no `server/db.ts`. Frontend lapas ievietotas `src/pages/`, jaunie komponenti — `src/components/`.

**Tech Stack:** React, Vite, TailwindCSS, Express.js, better-sqlite3, Socket.IO, Stripe, Gemini AI, react-helmet-async (jau instalēts), leaflet (jāinstalē fāzē 6)

---

## PAŠREIZĒJĀ STĀVOKĻA NOVĒRTĒJUMS

| Funkcija | Manifesta status | Reālais statuss | Atšķirība |
|---|---|---|---|
| JWT Auth | READY | ✅ IMPLEMENTED | — |
| Chat WebSocket | PARTIAL | ✅ IMPLEMENTED | Manifests neprecīzs — server emitē `new_message`, klients klausās |
| Escrow/Orders | 90% READY | ✅ IMPLEMENTED | Pilna status flow |
| Auction soft-close | READY | ✅ IMPLEMENTED | Darbojas |
| AI features | READY | ✅ IMPLEMENTED | Visi Gemini endpoints reāli |
| Stripe webhook | READY | ✅ IMPLEMENTED | — |
| Reviews (purchase-gated) | READY | ✅ IMPLEMENTED | — |
| Wallet/Points | READY | ✅ IMPLEMENTED | — |
| **Admin Dispute Portal** | MISSING | ⚠️ BACKEND GATAVS | Trūkst tikai frontend tabs AdminDashboard.tsx |
| **Email notifikācijas** | PARTIAL | ❌ STUB | `// Simulate email notification` komentārs |
| **Delivery/Shipping** | PARTIAL | ❌ STUB | Kolonna eksistē, API nav |
| **Achievement badges** | NOT IN MANIFEST | ❌ MISSING | Nav DB, nav backend, nav frontend |
| **B2B Storefronts** | PROPOSED | ❌ MISSING | Nav `/api/stores`, nav `/store/:slug` |
| **SEO meta tags** | PROPOSED | ❌ MISSING | `react-helmet-async` instalēts, nav ieviests |
| **Geo-search/Map** | PROPOSED | ❌ MISSING | Nav `lat/lng` kolonnās |
| **Smart-ID** | PARTIAL | ❌ STUB | Mock sesija, nav Dokobit OAuth |

---

## FĀZE 1: FRONTEND PABEIGUMS — ADMIN STRĪDU PORTĀLS
*Ātrākais augstās vērtības uzlabojums — backend 100% gatavs, trūkst tikai UI*

### Task 1.1: Disputes tabs AdminDashboard.tsx

**Files:**
- Modify: `src/pages/AdminDashboard.tsx`

**Mērķis:** Pievienot "Strīdi" tab AdminDashboard, kas parāda visus atvērtos strīdus ar pircēja/pārdevēja info un ļauj izpildīt refund vai pārskaitījumu.

**Esošie backend endpoints (jau gatavi):**
- `GET /api/admin/disputes` — atgriež `{id, order_id, user_id, reason, description, status, admin_notes, created_at}[]` ar JOIN uz `orders` un `users`
- `POST /api/admin/disputes/:id/resolve` — body: `{resolution: 'refund'|'release', adminNotes: string}`

- [ ] **Step 1: Pievienot disputes stāvokļa mainīgos un fetch funkciju**

Atrast `AdminDashboard.tsx:83` — pievieno `'disputes'` tipam un fetch loģiku:

```tsx
// AdminDashboard.tsx, pie pārējiem useState
const [disputes, setDisputes] = useState<any[]>([]);
const [activeTab, setActiveTab] = useState<'users' | 'listings' | 'reports' | 'settings' | 'ads' | 'disputes'>('users');

// fetchData() funkcijā (ap rindu 138) pievieno:
const disputesRes = await fetch('/api/admin/disputes', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
});
if (disputesRes.ok) {
  const d = await disputesRes.json();
  setDisputes(d);
}
```

- [ ] **Step 2: Pievienot resolveDispute funkciju**

```tsx
const resolveDispute = async (id: number, resolution: 'refund' | 'release', notes: string) => {
  const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    },
    body: JSON.stringify({ resolution, adminNotes: notes })
  });
  if (res.ok) {
    setDisputes(prev => prev.filter(d => d.id !== id));
  }
};
```

- [ ] **Step 3: Pievienot Disputes tab pogu (pie esošajām tab pogām ~rinda 486)**

```tsx
<button
  onClick={() => setActiveTab('disputes')}
  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors
    ${activeTab === 'disputes' ? 'bg-red-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
>
  Strīdi {disputes.filter(d => d.status === 'open').length > 0 && (
    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
      {disputes.filter(d => d.status === 'open').length}
    </span>
  )}
</button>
```

- [ ] **Step 4: Pievienot Disputes tab saturu (pie esošā tab content renderēšanas)**

```tsx
{activeTab === 'disputes' && (
  <div className="space-y-4">
    <h2 className="text-xl font-bold text-slate-900">Strīdi ({disputes.filter(d => d.status === 'open').length} atvērti)</h2>
    {disputes.length === 0 ? (
      <p className="text-slate-500 text-sm">Nav atvērtu strīdu.</p>
    ) : (
      disputes.map(dispute => (
        <DisputeCard key={dispute.id} dispute={dispute} onResolve={resolveDispute} />
      ))
    )}
  </div>
)}
```

- [ ] **Step 5: Izveidot DisputeCard komponenti (tajā pašā failā, pirms export default)**

```tsx
function DisputeCard({ dispute, onResolve }: { dispute: any, onResolve: (id: number, resolution: 'refund' | 'release', notes: string) => void }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (resolution: 'refund' | 'release') => {
    if (!notes.trim()) return;
    setLoading(true);
    await onResolve(dispute.id, resolution, notes);
    setLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-800">Strīds #{dispute.id} — Pasūtījums #{dispute.order_id}</p>
          <p className="text-sm text-slate-500">Iemesls: {dispute.reason}</p>
          {dispute.description && <p className="text-sm text-slate-600 mt-1">{dispute.description}</p>}
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${dispute.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {dispute.status}
        </span>
      </div>
      {dispute.status === 'open' && (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Administratora piezīmes (obligāti)..."
            className="w-full border border-slate-200 rounded-lg p-2 text-sm resize-none"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handle('refund')}
              disabled={loading || !notes.trim()}
              className="flex-1 bg-red-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Atmaksāt pircējam
            </button>
            <button
              onClick={() => handle('release')}
              disabled={loading || !notes.trim()}
              className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Pārskaitīt pārdevējam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Palaist un pārbaudīt**

```bash
npm run dev
# Atvērt http://localhost:3000/admin
# Pārliecināties ka "Strīdi" tabs parādās un darbojas
```

- [ ] **Step 7: Commit**
```bash
git add src/pages/AdminDashboard.tsx
git commit -m "feat(admin): add dispute resolution portal with refund/release actions"
```

---

## FĀZE 2: SEO META TAGS
*react-helmet-async jau instalēts — ātrs ienesīgs uzlabojums*

### Task 2.1: Dynamic meta tags ListingDetails.tsx

**Files:**
- Modify: `src/pages/ListingDetails.tsx`
- Modify: `src/main.tsx` (pievienot HelmetProvider)

**Mērķis:** Katram sludinājumam ģenerēt unique `<title>`, `<meta description>`, un Open Graph tagus priekš dalīšanās Facebook/WhatsApp.

- [ ] **Step 1: Pievienot HelmetProvider main.tsx**

```tsx
// src/main.tsx — importēt un apvienot
import { HelmetProvider } from 'react-helmet-async';

// App wrappā:
<HelmetProvider>
  <App />
</HelmetProvider>
```

- [ ] **Step 2: ListingDetails.tsx — pievienot Helmet komponentu**

Atrast `src/pages/ListingDetails.tsx`. Importēt:
```tsx
import { Helmet } from 'react-helmet-async';
```

Listing datu ielādes jau esošajā `useEffect` blokā, pēc `setListing(data)` — pievieno:

```tsx
// Jau ir listing dati — tieši renderēšanā pievieno:
{listing && (
  <Helmet>
    <title>{listing.title} — {listing.price}€ | BalticMarket</title>
    <meta name="description" content={`${listing.title}. ${listing.description?.slice(0, 150)}... Cena: ${listing.price}€. ${listing.location ? `Atrašanās vieta: ${listing.location}` : ''}`} />
    <meta property="og:title" content={`${listing.title} — ${listing.price}€`} />
    <meta property="og:description" content={listing.description?.slice(0, 200)} />
    {listing.image_urls?.[0] && <meta property="og:image" content={listing.image_urls[0]} />}
    <meta property="og:type" content="product" />
    <meta property="og:url" content={`https://balticmarket.lv/listing/${listing.id}`} />
    <meta name="twitter:card" content="summary_large_image" />
  </Helmet>
)}
```

- [ ] **Step 3: Home.tsx — pievienot pamata meta tagus**

```tsx
import { Helmet } from 'react-helmet-async';

// Home komponentes renderēšanā:
<Helmet>
  <title>BalticMarket — Pērkat un pārdodiet droši Latvijā</title>
  <meta name="description" content="BalticMarket — Latvijas modernākā tirdzniecības platforma. Pārdod, pērc, izsolē preces droši ar iebūvētu maksājumu aizsardzību." />
</Helmet>
```

- [ ] **Step 4: Commit**
```bash
git add src/main.tsx src/pages/ListingDetails.tsx src/pages/Home.tsx
git commit -m "feat(seo): add react-helmet-async meta tags for listings and home page"
```

---

## FĀZE 3: ACHIEVEMENT/BADGE SISTĒMA
*Pirms fāzes 4 (B2B) — badges nepieciešami arī B2B profila lapā*

### Task 3.1: DB schema achievements tabulai

**Files:**
- Modify: `server/db.ts`

**Badges saraksts (balstīts uz Kleinanzeigen behavioral model):**
- `verified_seller` — Smart-ID verificēts (jau ir points sistēmā)
- `trusted_seller` — 10+ completed orders + avg rating ≥ 4.5
- `fast_responder` — vidēji atbild < 2h (messages tabulas laiku analīze)
- `top_seller_2026` — 50+ pārdošanas darījumi
- `eco_warrior` — 20+ giveaway sludinājumi
- `auction_master` — 10+ izsoles

- [ ] **Step 1: Pievienot achievements tabulu server/db.ts**

Pirms `export default db;`:

```ts
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
} catch (e) {}
```

- [ ] **Step 2: Pievienot badge metadata konstanti (server.ts sākumā)**

```ts
export const BADGE_DEFINITIONS: Record<string, { label: string; description: string; icon: string; color: string }> = {
  verified_seller:  { label: 'Verificēts',       description: 'Smart-ID identitāte apstiprināta', icon: '🛡️', color: 'blue' },
  trusted_seller:   { label: 'Uzticams pārdevējs', description: '10+ pārdošanas, vērtējums ≥ 4.5',  icon: '⭐', color: 'amber' },
  fast_responder:   { label: 'Ātrs atbildētājs',  description: 'Vidēji atbild < 2 stundās',         icon: '⚡', color: 'yellow' },
  top_seller_2026:  { label: 'Top pārdevējs',     description: '50+ veiksmīgi darījumi',             icon: '🏆', color: 'gold' },
  eco_warrior:      { label: 'Eko pārdevējs',     description: '20+ bezmaksas sludinājumi',          icon: '🌱', color: 'green' },
  auction_master:   { label: 'Izsoles meistars',  description: '10+ veiksmīgas izsoles',             icon: '🔨', color: 'purple' },
};
```

- [ ] **Step 3: Pievienot awardBadge helper funkciju (server.ts)**

```ts
function awardBadgeIfEarned(userId: number, badgeId: string) {
  try {
    db.prepare('INSERT OR IGNORE INTO user_achievements (user_id, badge_id) VALUES (?, ?)').run(userId, badgeId);
  } catch (e) {}
}

function checkAndAwardBadges(userId: number) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) return;

  // verified_seller
  if (user.is_verified) awardBadgeIfEarned(userId, 'verified_seller');

  // trusted_seller — 10+ completed orders + avg rating
  const orderCount = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE seller_id = ? AND status = "completed"').get(userId) as any).c;
  const avgRating = (db.prepare('SELECT AVG(rating) as r FROM reviews WHERE seller_id = ?').get(userId) as any).r;
  if (orderCount >= 10 && avgRating >= 4.5) awardBadgeIfEarned(userId, 'trusted_seller');

  // top_seller_2026
  if (orderCount >= 50) awardBadgeIfEarned(userId, 'top_seller_2026');

  // eco_warrior
  const giveawayCount = (db.prepare('SELECT COUNT(*) as c FROM listings WHERE user_id = ? AND listing_type = "giveaway" AND status = "sold"').get(userId) as any).c;
  if (giveawayCount >= 20) awardBadgeIfEarned(userId, 'eco_warrior');

  // auction_master
  const auctionCount = (db.prepare('SELECT COUNT(*) as c FROM orders WHERE seller_id = ? AND status = "completed" AND listing_id IN (SELECT id FROM listings WHERE is_auction = 1)').get(userId) as any).c;
  if (auctionCount >= 10) awardBadgeIfEarned(userId, 'auction_master');
}
```

- [ ] **Step 4: Izsaukt checkAndAwardBadges() pēc pasūtījuma pabeigšanas**

Server.ts, `order_confirmation` endpointā (kur `status='completed'` tiek iestatīts, ap rinda ~726):
```ts
// Pēc db.prepare('UPDATE orders SET status = "completed"...')
checkAndAwardBadges(order.seller_id);
```

Un pēc Smart-ID verifikācijas (kur `is_verified = 1`):
```ts
checkAndAwardBadges(decoded.userId);
```

- [ ] **Step 5: Pievienot GET /api/users/:id/badges endpoint**

```ts
app.get('/api/users/:id/badges', (req, res) => {
  const badges = db.prepare('SELECT badge_id, earned_at FROM user_achievements WHERE user_id = ? ORDER BY earned_at DESC').all(req.params.id) as any[];
  res.json(badges.map(b => ({ ...b, ...BADGE_DEFINITIONS[b.badge_id] })));
});
```

- [ ] **Step 6: Pievienot badges displejs Profile.tsx**

Profile.tsx lietotāja info sadaļā (ap vietu kur ir avatar/vārds):

```tsx
// Pie profila info (pievienot fetch useEffect sākumā):
const [badges, setBadges] = useState<any[]>([]);

useEffect(() => {
  if (user) {
    fetch(`/api/users/${user.id}/badges`)
      .then(r => r.json())
      .then(setBadges);
  }
}, [user]);

// Renderēšanā, zem lietotāja vārda:
{badges.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mt-2">
    {badges.map(badge => (
      <span key={badge.badge_id} title={badge.description}
        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
        {badge.icon} {badge.label}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 7: Pievienot badges ListingDetails.tsx pārdevēja kartē**

Pārdevēja info sadaļā:
```tsx
// Fetch badges for listing seller
const [sellerBadges, setSellerBadges] = useState<any[]>([]);

useEffect(() => {
  if (listing?.user_id) {
    fetch(`/api/users/${listing.user_id}/badges`)
      .then(r => r.json())
      .then(setSellerBadges);
  }
}, [listing?.user_id]);

// Renderēšanā zem pārdevēja vārda:
{sellerBadges.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {sellerBadges.map(b => (
      <span key={b.badge_id} title={b.description}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
        {b.icon} {b.label}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 8: Commit**
```bash
git add server/db.ts server.ts src/pages/Profile.tsx src/pages/ListingDetails.tsx
git commit -m "feat(badges): add achievement/badge system with 6 badge types and profile display"
```

---

## FĀZE 4: B2B VEIKALU VITRĪNAS (STOREFRONTS)
*Requires: esošs `user_type='b2b'`, `company_name`, `company_reg_number` — visi jau DB*

### Task 4.1: DB schema un backend endpoints

**Files:**
- Modify: `server/db.ts`
- Modify: `server.ts`

- [ ] **Step 1: Pievienot stores tabulu server/db.ts**

```ts
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      banner_url TEXT,
      logo_url TEXT,
      tagline TEXT,
      description TEXT,
      website TEXT,
      phone TEXT,
      working_hours TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
} catch (e) {}
```

- [ ] **Step 2: GET /api/stores/:slug — publiski skatāms veikals**

```ts
app.get('/api/stores/:slug', (req, res) => {
  const store = db.prepare(`
    SELECT s.*, u.name, u.company_name, u.company_reg_number, u.company_vat,
           (SELECT AVG(r.rating) FROM reviews r WHERE r.seller_id = u.id) as avg_rating,
           (SELECT COUNT(*) FROM reviews r WHERE r.seller_id = u.id) as review_count,
           (SELECT COUNT(*) FROM listings l WHERE l.user_id = u.id AND l.status = 'active') as active_listings_count
    FROM stores s JOIN users u ON s.user_id = u.id
    WHERE s.slug = ?
  `).get(req.params.slug) as any;

  if (!store) return res.status(404).json({ error: 'Veikals nav atrasts' });

  const listings = db.prepare(`
    SELECT * FROM listings WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 50
  `).all(store.user_id);

  res.json({ ...store, listings });
});
```

- [ ] **Step 3: POST /api/stores — izveidot/atjaunināt savu veikalu (b2b only)**

```ts
app.post('/api/stores', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (user.user_type !== 'b2b') return res.status(403).json({ error: 'Tikai B2B konti var izveidot veikalu' });

  const { slug, banner_url, logo_url, tagline, description, website, phone, working_hours } = req.body;
  if (!slug || !/^[a-z0-9-]{3,50}$/.test(slug)) {
    return res.status(400).json({ error: 'Slug: 3-50 simboli, tikai mazie burti, cipari un defises' });
  }

  const existing = db.prepare('SELECT id FROM stores WHERE user_id = ?').get(userId);
  if (existing) {
    db.prepare(`UPDATE stores SET slug=?, banner_url=?, logo_url=?, tagline=?, description=?, website=?, phone=?, working_hours=?, updated_at=CURRENT_TIMESTAMP WHERE user_id=?`)
      .run(slug, banner_url, logo_url, tagline, description, website, phone, working_hours, userId);
  } else {
    db.prepare(`INSERT INTO stores (user_id, slug, banner_url, logo_url, tagline, description, website, phone, working_hours) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(userId, slug, banner_url, logo_url, tagline, description, website, phone, working_hours);
  }

  const store = db.prepare('SELECT * FROM stores WHERE user_id = ?').get(userId);
  res.json(store);
});
```

- [ ] **Step 4: GET /api/stores/my — sava veikala dati (b2b only)**

```ts
app.get('/api/stores/my', requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const store = db.prepare('SELECT * FROM stores WHERE user_id = ?').get(userId);
  res.json(store || null);
});
```

### Task 4.2: Frontend /store/:slug lapa

**Files:**
- Create: `src/pages/StorePage.tsx`
- Modify: `src/App.tsx` vai galvenā Router fails (pievienot route)

- [ ] **Step 1: Izveidot StorePage.tsx**

```tsx
// src/pages/StorePage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stores/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setStore(data); setLoading(false); });
  }, [slug]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-2 border-[#E64415] border-t-transparent rounded-full" /></div>;
  if (!store) return <div className="text-center py-20 text-slate-500">Veikals nav atrasts.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{store.company_name || store.name} | BalticMarket</title>
        <meta name="description" content={store.tagline || store.description?.slice(0, 160)} />
        {store.logo_url && <meta property="og:image" content={store.logo_url} />}
      </Helmet>

      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-r from-slate-800 to-slate-600 overflow-hidden">
        {store.banner_url && <img src={store.banner_url} alt="banner" className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 flex items-end p-6 gap-4">
          {store.logo_url && <img src={store.logo_url} alt="logo" className="w-16 h-16 rounded-xl border-2 border-white object-cover bg-white" />}
          <div>
            <h1 className="text-2xl font-bold text-white">{store.company_name || store.name}</h1>
            {store.tagline && <p className="text-slate-200 text-sm">{store.tagline}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2 text-sm">
              {store.description && <p className="text-slate-600">{store.description}</p>}
              {store.phone && <p className="text-slate-700"><span className="font-semibold">Tel:</span> {store.phone}</p>}
              {store.website && <a href={store.website} className="text-[#E64415] hover:underline" target="_blank" rel="noreferrer">{store.website}</a>}
              {store.working_hours && <p className="text-slate-700"><span className="font-semibold">Darba laiks:</span> {store.working_hours}</p>}
              {store.company_reg_number && <p className="text-slate-500 text-xs">Reģ. Nr: {store.company_reg_number}</p>}
              {store.avg_rating > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-amber-500">★</span>
                  <span className="font-semibold">{Number(store.avg_rating).toFixed(1)}</span>
                  <span className="text-slate-400">({store.review_count} atsauksmes)</span>
                </div>
              )}
            </div>
          </div>

          {/* Listings grid */}
          <div className="lg:col-span-3">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Aktīvie sludinājumi ({store.active_listings_count})
            </h2>
            {store.listings.length === 0 ? (
              <p className="text-slate-400 text-sm">Nav aktīvu sludinājumu.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {store.listings.map((listing: any) => (
                  <Link key={listing.id} to={`/listing/${listing.id}`}
                    className="bg-white border border-slate-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                    {listing.image_urls?.[0] && (
                      <img src={JSON.parse(listing.image_urls)[0]} alt={listing.title} className="w-full h-28 object-cover" />
                    )}
                    <div className="p-2">
                      <p className="text-xs font-semibold text-slate-800 truncate">{listing.title}</p>
                      <p className="text-sm font-bold text-[#E64415]">{listing.price}€</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pievienot route App.tsx/Router**

Atrast galveno router konfigurāciju (meklēt `<Route path="/listing/` vai `createBrowserRouter`). Pievienot:

```tsx
import StorePage from './pages/StorePage';
// ...
<Route path="/store/:slug" element={<StorePage />} />
```

- [ ] **Step 3: Pievienot "Mans veikals" sadaļu Profile.tsx b2b lietotājiem**

Profile.tsx, esošo sadaļu sarakstā, pēc pārbaudes `user.user_type === 'b2b'`:

```tsx
{user?.user_type === 'b2b' && activeTab === 'company' && (
  <StoreEditor userId={user.id} />
)}
```

Komponents `StoreEditor` (tajā pašā failā vai atsevišķā):

```tsx
function StoreEditor({ userId }: { userId: number }) {
  const [store, setStore] = useState<any>(null);
  const [form, setForm] = useState({ slug: '', tagline: '', description: '', website: '', phone: '', working_hours: '' });

  useEffect(() => {
    fetch('/api/stores/my', { headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } })
      .then(r => r.json()).then(data => { if (data) { setStore(data); setForm(data); } });
  }, []);

  const save = async () => {
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
      body: JSON.stringify(form)
    });
    if (res.ok) { const data = await res.json(); setStore(data); }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <h3 className="font-bold text-slate-800">Veikala iestatījumi</h3>
      {[
        { key: 'slug', label: 'URL (piem.: mans-veikals)', placeholder: 'mans-veikals' },
        { key: 'tagline', label: 'Tagline', placeholder: 'Jūsu veikala moto' },
        { key: 'website', label: 'Mājaslapa', placeholder: 'https://' },
        { key: 'phone', label: 'Tālrunis', placeholder: '+371...' },
        { key: 'working_hours', label: 'Darba laiks', placeholder: 'P-P: 9:00-18:00' },
      ].map(f => (
        <div key={f.key}>
          <label className="text-xs font-semibold text-slate-500 uppercase">{f.label}</label>
          <input value={(form as any)[f.key] || ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder} className="w-full border border-slate-200 rounded-lg p-2 text-sm mt-1" />
        </div>
      ))}
      <textarea value={form.description || ''} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Veikala apraksts..." rows={3} className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
      <button onClick={save} className="bg-[#E64415] text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-[#c73d13]">
        Saglabāt
      </button>
      {store?.slug && (
        <p className="text-xs text-slate-500">Veikala lapa: <a href={`/store/${store.slug}`} className="text-[#E64415]">/store/{store.slug}</a></p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Pievienot "Veikals" pogu ListingDetails.tsx pārdevēja kartē**

Pēc pārdevēja vārda, ja ir store:
```tsx
// useEffect, kur tiek ielādēts listing, pievienot:
const [sellerStore, setSellerStore] = useState<any>(null);

// pēc listing ielādes:
fetch(`/api/stores/by-user/${listing.user_id}`) // jāpievieno šis endpoint
  .then(r => r.ok ? r.json() : null).then(setSellerStore);

// Renderēšanā:
{sellerStore && (
  <Link to={`/store/${sellerStore.slug}`} className="text-xs text-[#E64415] hover:underline font-semibold">
    Skatīt veikalu →
  </Link>
)}
```

Pievienot `GET /api/stores/by-user/:userId` endpoint server.ts:
```ts
app.get('/api/stores/by-user/:userId', (req, res) => {
  const store = db.prepare('SELECT * FROM stores WHERE user_id = ?').get(req.params.userId);
  if (!store) return res.status(404).json({ error: 'Nav veikala' });
  res.json(store);
});
```

- [ ] **Step 5: Commit**
```bash
git add server/db.ts server.ts src/pages/StorePage.tsx src/pages/Profile.tsx src/pages/ListingDetails.tsx
git commit -m "feat(b2b): add storefront system with /store/:slug pages and store editor in profile"
```

---

## FĀZE 5: PIEGĀDES INTEGRĀCIJA (OMNIVA)
*Omniva publiski pieejams API pakomātu atrašanās vietām — bez API atslēgas*

### Task 5.1: Omniva pakomātu saraksts un izvēle checkout plūsmā

**Files:**
- Modify: `server.ts` (cache Omniva datus)
- Modify: `src/pages/ListingDetails.tsx` (piegādes izvēles UI pasūtīšanas posmā)

**Omniva publiskais API:** `https://omniva.lv/locations.json` — atgriež visus pakomātus Latvijā (bez auth)

- [ ] **Step 1: Pievienot Omniva datu cache endpoint server.ts**

```ts
let omnivaLocationsCache: any[] | null = null;
let omnivaLastFetch = 0;

app.get('/api/shipping/omniva-locations', async (req, res) => {
  const now = Date.now();
  if (!omnivaLocationsCache || now - omnivaLastFetch > 24 * 60 * 60 * 1000) {
    try {
      const response = await fetch('https://omniva.lv/locations.json');
      const data = await response.json();
      // Filtrē tikai Latvijas pakomātus (country: 'LV') un noformē
      omnivaLocationsCache = data
        .filter((loc: any) => loc.A0_NAME === 'LV')
        .map((loc: any) => ({
          id: loc.ZIP,
          name: loc.NAME,
          address: loc.A2_NAME + (loc.A3_NAME ? ', ' + loc.A3_NAME : '') + ', ' + loc.A1_NAME,
          city: loc.A1_NAME,
        }));
      omnivaLastFetch = now;
    } catch (e) {
      return res.status(503).json({ error: 'Nevar ielādēt Omniva lokācijas' });
    }
  }
  const city = req.query.city as string;
  const locations = city
    ? omnivaLocationsCache!.filter(l => l.city.toLowerCase().includes(city.toLowerCase()))
    : omnivaLocationsCache!.slice(0, 100);
  res.json(locations);
});
```

- [ ] **Step 2: Pievienot piegādes izvēles komponenti ListingDetails.tsx**

Atrast pasūtīšanas formu (kur ir "Pirkt" poga vai checkout flow). Pirms finālā "Apstiprināt" soļa pievienot:

```tsx
const [shippingMethod, setShippingMethod] = useState<'pickup' | 'omniva' | ''>('');
const [omnivaLocations, setOmnivaLocations] = useState<any[]>([]);
const [selectedLocker, setSelectedLocker] = useState<any>(null);
const [lockerSearch, setLockerSearch] = useState('');

const searchLockers = async (city: string) => {
  if (city.length < 2) return;
  const res = await fetch(`/api/shipping/omniva-locations?city=${encodeURIComponent(city)}`);
  const data = await res.json();
  setOmnivaLocations(data);
};

// Shipping method selector UI:
<div className="space-y-3">
  <p className="text-sm font-semibold text-slate-700">Piegādes veids</p>
  <div className="grid grid-cols-2 gap-2">
    {[
      { id: 'pickup', label: '🤝 Personīgi', desc: 'Vienosies ar pārdevēju' },
      { id: 'omniva', label: '📦 Omniva pakomāts', desc: 'Sūtījums uz pakomātu' },
    ].map(opt => (
      <button key={opt.id} type="button"
        onClick={() => setShippingMethod(opt.id as any)}
        className={`p-3 rounded-xl border-2 text-left transition-colors
          ${shippingMethod === opt.id ? 'border-[#E64415] bg-[#E64415]/5' : 'border-slate-100 hover:border-slate-200'}`}>
        <p className="text-sm font-semibold">{opt.label}</p>
        <p className="text-xs text-slate-500">{opt.desc}</p>
      </button>
    ))}
  </div>

  {shippingMethod === 'omniva' && (
    <div className="space-y-2">
      <input
        value={lockerSearch}
        onChange={e => { setLockerSearch(e.target.value); searchLockers(e.target.value); }}
        placeholder="Meklēt pilsētu (piem., Rīga)..."
        className="w-full border border-slate-200 rounded-lg p-2 text-sm"
      />
      <div className="max-h-48 overflow-y-auto space-y-1">
        {omnivaLocations.map(loc => (
          <button key={loc.id} type="button"
            onClick={() => setSelectedLocker(loc)}
            className={`w-full text-left p-2 rounded-lg text-xs transition-colors
              ${selectedLocker?.id === loc.id ? 'bg-[#E64415]/10 border border-[#E64415]' : 'hover:bg-slate-50'}`}>
            <p className="font-semibold">{loc.name}</p>
            <p className="text-slate-500">{loc.address}</p>
          </button>
        ))}
      </div>
      {selectedLocker && (
        <p className="text-xs text-green-600 font-semibold">✓ Izvēlēts: {selectedLocker.name}</p>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 3: Nodot shippingMethod un shippingAddress pasūtījuma izveidē**

Esošajā order creation fetch call (`/api/orders`), pievienot body:
```ts
body: JSON.stringify({
  listingId: listing.id,
  shippingMethod,
  shippingAddress: shippingMethod === 'omniva' && selectedLocker
    ? `Omniva: ${selectedLocker.name}, ${selectedLocker.address}`
    : 'Personīgi',
})
```

- [ ] **Step 4: Pievienot shipping info pasūtījuma skatā Profile.tsx**

Esošajā pasūtījumu sarakstā, pie katra pasūtījuma pievienot:
```tsx
{order.shipping_method && (
  <p className="text-xs text-slate-500">
    📦 {order.shipping_method === 'omniva' ? `Omniva: ${order.shipping_address}` : 'Personīgi'}
  </p>
)}
```

- [ ] **Step 5: Commit**
```bash
git add server.ts src/pages/ListingDetails.tsx src/pages/Profile.tsx
git commit -m "feat(shipping): add Omniva parcel locker selection in checkout flow"
```

---

## FĀZE 6: ĢEOMEKLĒŠANA UN KARTE
*Requires: leaflet instalēšana — vienīgā jauna dependency šajā plānā*

### Task 6.1: DB migrācija un geocoding

**Files:**
- Modify: `server/db.ts`
- Modify: `server.ts`

- [ ] **Step 1: Instalēt leaflet**
```bash
npm install leaflet @types/leaflet
```

- [ ] **Step 2: Pievienot lat/lng kolonnas listings tabulai (server/db.ts)**

```ts
try { db.exec('ALTER TABLE listings ADD COLUMN lat REAL'); } catch (e) {}
try { db.exec('ALTER TABLE listings ADD COLUMN lng REAL'); } catch (e) {}
```

- [ ] **Step 3: Pievienot geocoding helper server.ts (OpenStreetMap Nominatim, bez API key)**

```ts
async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  if (!location) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location + ', Latvia')}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'BalticMarket/1.0' } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {}
  return null;
}
```

- [ ] **Step 4: Izsaukt geocoding listing izveides laikā (POST /api/listings)**

Atrast listing izveides handleri. Pēc `INSERT INTO listings`:
```ts
if (location) {
  geocodeLocation(location).then(coords => {
    if (coords) {
      db.prepare('UPDATE listings SET lat = ?, lng = ? WHERE id = ?').run(coords.lat, coords.lng, newListingId);
    }
  });
}
```

- [ ] **Step 5: Pievienot geo radius filtru GET /api/listings**

Esošajā meklēšanas endpointā pievienot radius parametru:
```ts
const { lat, lng, radius } = req.query;
// Ja ir lat/lng/radius, pēc pamatfiltriem pievienot:
if (lat && lng && radius) {
  const latF = parseFloat(lat as string);
  const lngF = parseFloat(lng as string);
  const radiusKm = parseFloat(radius as string);
  // Haversine aproximācija (±5% precizitāte, pietiek lietotāju meklēšanai)
  const latDelta = radiusKm / 111.0;
  const lngDelta = radiusKm / (111.0 * Math.cos(latF * Math.PI / 180));
  whereConditions.push(`lat BETWEEN ${latF - latDelta} AND ${latF + latDelta}`);
  whereConditions.push(`lng BETWEEN ${lngF - lngDelta} AND ${lngF + lngDelta}`);
}
```

### Task 6.2: Karte ListingDetails.tsx

**Files:**
- Modify: `src/pages/ListingDetails.tsx`

- [ ] **Step 1: Pievienot kartes komponenti**

```tsx
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

function ListingMap({ lat, lng, location }: { lat: number; lng: number; location: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapInstance.current);
    L.marker([lat, lng]).addTo(mapInstance.current).bindPopup(location).openPopup();
  }, [lat, lng, location]);

  return <div ref={mapRef} style={{ height: '200px', borderRadius: '12px', zIndex: 0 }} />;
}
```

- [ ] **Step 2: Renderēt karti listing detaļu lapā**

Atrast vietu kur ir `listing.location` teksts. Zem tā pievienot:
```tsx
{listing.lat && listing.lng && (
  <div className="mt-3">
    <ListingMap lat={listing.lat} lng={listing.lng} location={listing.location} />
  </div>
)}
```

- [ ] **Step 3: Pievienot "Meklēt manā tuvumā" pogu Search.tsx**

```tsx
const [useGeo, setUseGeo] = useState(false);
const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);

const enableGeo = () => {
  navigator.geolocation.getCurrentPosition(pos => {
    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setUseGeo(true);
  });
};

// Search parametros pievienot:
if (useGeo && userCoords) {
  params.append('lat', String(userCoords.lat));
  params.append('lng', String(userCoords.lng));
  params.append('radius', '25'); // 25km radius
}

// UI:
<button onClick={enableGeo} className="text-sm text-[#E64415] font-semibold flex items-center gap-1">
  📍 Meklēt manā tuvumā (25 km)
</button>
```

- [ ] **Step 4: Commit**
```bash
git add server/db.ts server.ts src/pages/ListingDetails.tsx src/pages/Search.tsx
git commit -m "feat(geo): add lat/lng geocoding, leaflet map in listing detail, and geo radius search"
```

---

## FĀZE 7: VIDEO ATBALSTS SLUDINĀJUMOS

### Task 7.1: Video augšupielāde un atskaņošana

**Files:**
- Modify: `server.ts` (multer video, DB kolonna)
- Modify: `server/db.ts` (video_url kolonna)
- Modify: `src/pages/AddListing.tsx`
- Modify: `src/pages/ListingDetails.tsx`

- [ ] **Step 1: Pievienot video_url kolonna listings tabulai**

`server/db.ts`:
```ts
try { db.exec('ALTER TABLE listings ADD COLUMN video_url TEXT'); } catch (e) {}
```

- [ ] **Step 2: Paplašināt multer video failiem server.ts**

```ts
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only videos are allowed'));
  }
});

app.post('/api/upload/video', requireAuth, videoUpload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video file' });
  const filename = `video_${Date.now()}.${req.file.mimetype === 'video/mp4' ? 'mp4' : 'webm'}`;
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);
  res.json({ videoUrl: `/uploads/${filename}` });
});
```

- [ ] **Step 3: Video augšupielādes UI AddListing.tsx**

Esošajā attēlu augšupielādes sadaļā, pēc bildēm pievienot:
```tsx
const [videoUrl, setVideoUrl] = useState('');
const [isUploadingVideo, setIsUploadingVideo] = useState(false);

const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || file.size > 50 * 1024 * 1024) return;
  setIsUploadingVideo(true);
  const formData = new FormData();
  formData.append('video', file);
  const res = await fetch('/api/upload/video', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
    body: formData
  });
  const data = await res.json();
  if (data.videoUrl) setVideoUrl(data.videoUrl);
  setIsUploadingVideo(false);
};

// UI:
<div className="mt-3">
  <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 hover:text-[#E64415]">
    <span>🎬 Pievienot video (max 30s, 50MB)</span>
    <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
  </label>
  {isUploadingVideo && <p className="text-xs text-slate-400">Augšupielādē...</p>}
  {videoUrl && <p className="text-xs text-green-600">✓ Video pievienots</p>}
</div>
```

- [ ] **Step 4: Video atskaņotājs ListingDetails.tsx**

Pēc attēlu galerijas:
```tsx
{listing.video_url && (
  <div className="mt-4 rounded-xl overflow-hidden">
    <video controls className="w-full max-h-80 bg-black" preload="metadata">
      <source src={listing.video_url} type="video/mp4" />
    </video>
  </div>
)}
```

- [ ] **Step 5: Nodot video_url submit laikā**

Esošajā `handleSubmit` body pievienot `video_url: videoUrl` un serverī listing izveides INSERT iekļaut video_url lauku.

- [ ] **Step 6: Commit**
```bash
git add server/db.ts server.ts src/pages/AddListing.tsx src/pages/ListingDetails.tsx
git commit -m "feat(video): add video upload support for listings with player in detail view"
```

---

## FĀZE 8: EMAIL NOTIFIKĀCIJU DIENESTS
*Pēdējā fāze — citas fāzes darbojas bez emailiem*

### Task 8.1: Nodemailer integrācija

**Files:**
- Modify: `server.ts`

**Nav nepieciešams jauns fails** — izmantosim vides mainīgos SMTP konfigurācijai.

- [ ] **Step 1: Instalēt nodemailer**
```bash
npm install nodemailer @types/nodemailer
```

- [ ] **Step 2: Pievienot email helper server.ts**

```ts
import nodemailer from 'nodemailer';

const emailTransporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
}) : null;

async function sendEmail(to: string, subject: string, html: string) {
  if (!emailTransporter) {
    console.log(`[EMAIL SIMULATED] To: ${to}, Subject: ${subject}`);
    return;
  }
  await emailTransporter.sendMail({
    from: process.env.SMTP_FROM || 'BalticMarket <noreply@balticmarket.lv>',
    to, subject, html
  });
}
```

- [ ] **Step 3: Aizstāt `// Simulate email notification` komentārus ar `sendEmail()` izsaukumiem**

Atrast vismaz šīs vietas server.ts:
- Pēc saglabāta meklējuma match (saved_searches) — paziņojums par jaunu sludinājumu
- Pēc pasūtījuma statusa maiņas uz `shipped` — pircēja paziņojums
- Pēc pasūtījuma statusa maiņas uz `completed` — pārdevēja paziņojums

Katrā vietā aizstāt ar:
```ts
const user = db.prepare('SELECT email, name FROM users WHERE id = ?').get(recipientId) as any;
if (user?.email) {
  sendEmail(
    user.email,
    'Jauns sludinājums atbilst jūsu meklēšanai | BalticMarket',
    `<h2>Sveiks, ${user.name}!</h2><p>Ir pievienots jauns sludinājums kas atbilst jūsu saglabātajam meklējumam.</p>`
  );
}
```

- [ ] **Step 4: Pievienot .env.example**

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
SMTP_FROM=BalticMarket <noreply@balticmarket.lv>
```

- [ ] **Step 5: Commit**
```bash
git add server.ts .env.example
git commit -m "feat(email): add nodemailer integration replacing simulated email notifications"
```

---

## IEVIEŠANAS PRIORITĀŠU KOPSAVILKUMS

| Fāze | Uzdevums | Sarežģītība | Business value | Laika estimates |
|---|---|---|---|---|
| **1** | Admin Dispute Portal | Zema | Kritiski (izsaka uzticamību) | 2-3h |
| **2** | SEO Meta Tags | Ļoti zema | Augsta (organiskā plūsma) | 1h |
| **3** | Achievement Badges | Vidēja | Vidēja (gamifikācija) | 4-5h |
| **4** | B2B Storefronts | Vidēja | Augsta (B2B ieņēmumi) | 6-8h |
| **5** | Omniva Piegāde | Vidēja | Kritiski (trust & fulfillment) | 4-5h |
| **6** | Geo-search + Karte | Augsta | Vidēja (UX uzlabojums) | 6-8h |
| **7** | Video atbalsts | Vidēja | Vidēja (content quality) | 3-4h |
| **8** | Email notifikācijas | Zema | Augsta (user retention) | 2-3h |

**Sākuma rekomendācija:** Fāzes 1 → 2 → 8 → 3 → 5 → 4 → 6 → 7

---

## NETIEK IEVIESTAS ŠĀ PLĀNĀ (Pamatojums)

| Funkcija | Iemesls |
|---|---|
| Smart-ID reālā integrācija | Prasa Dokobit līgumu un juridiskas saistības |
| Stripe Connect (B2B payout) | Prasa juridisko KYC verifikāciju |
| Wolt Drive kurjers | Nav publiski pieejams API |
| DPD integrācija | Prasa DPD komerciālu līgumu; Omniva ir bez autentifikācijas |
| AI Visual Search | Augsts Gemini izmaksu risks bez rate-limiting arhitektūras |
| PostgreSQL migrācija | Arhitektūras maiņa ārpus plāna apjoma |
