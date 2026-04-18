# BalticMarket — Plāns B: Ārējie Servisi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aizstāt lokālo failu glabāšanu ar Cloudinary, pievienot Redis cache slāni (Upstash), nomainīt SMTP stub uz Resend, pievienot Web Push notifikācijas.

**Architecture:** Katrs serviss ir neatkarīgs modulis `server/services/` mapē. Cloudinary aizstāj multer+sharp pipeline — attēli un video tiek augšupielādēti tieši uz CDN. Upstash Redis nodrošina rate limiting, Omniva cache un session blacklist. Resend aizstāj nodemailer ar vienu API izsaukumu. Web Push izmanto VAPID atslēgas bez trešās puses servisa.

**Tech Stack:** `cloudinary`, `@upstash/redis`, `resend`, `web-push`, `@types/web-push`

**Priekšnoteikums:** Plāns A (PostgreSQL) ir izpildīts.

---

## SERVISU REĢISTRĀCIJA (manuāli)

### Task 1: Kontu izveide

- [ ] **Step 1: Cloudinary**

1. https://cloudinary.com → Free → Sign Up
2. Dashboard → kopēt: Cloud name, API Key, API Secret
3. Settings → Upload → Add upload preset:
   - Preset name: `balticmarket_listings`
   - Signing mode: **Signed**
   - Folder: `listings/`
   - Allowed formats: `jpg,jpeg,png,webp,gif,mp4,mov`
   - Max file size: 50MB
4. Otrais preset: `balticmarket_avatars`, folder: `avatars/`

- [ ] **Step 2: Upstash Redis**

1. https://upstash.com → Sign Up (bezmaksas, nav kartes)
2. Console → Create Database:
   - Name: `balticmarket-cache`
   - Region: **eu-west-1** (Ireland — tuvākais Latvijai)
   - Type: Regional
3. Nokopēt: `UPSTASH_REDIS_REST_URL` un `UPSTASH_REDIS_REST_TOKEN`

- [ ] **Step 3: Resend**

1. https://resend.com → Sign Up (bezmaksas, nav kartes)
2. API Keys → Create API Key: `balticmarket-prod`
3. Nokopēt: `RESEND_API_KEY`
4. Domains → Add Domain: `balticmarket.lv` (vai izmantot `onboarding@resend.dev` testēšanai)

- [ ] **Step 4: VAPID atslēgas (Web Push, bez konta)**

```bash
cd "c:/Users/HomeComputer/Downloads/BalticMarket AIStudio/BalticMarket"
npx web-push generate-vapid-keys
```

Sagaidāmais output:
```
Public Key: BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Abas atslēgas saglabāt `.env` failā (nākamajā solī).

- [ ] **Step 5: Atjaunināt .env**

```bash
# .env — pievienot:
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
```

- [ ] **Step 6: Atjaunināt .env.example**

```bash
# .env.example — pievienot:
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=BalticMarket <noreply@balticmarket.lv>

VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:admin@balticmarket.lv
```

---

## FĀZE 1: CLOUDINARY MEDIA UPLOADS

### Task 2: Instalēt Cloudinary un nomainīt upload pipeline

**Files:**
- Create: `server/services/cloudinary.ts`
- Modify: `server.ts` (upload endpoints ~rindas 227–320)

- [ ] **Step 1: Instalēt**

```bash
npm install cloudinary
npm uninstall sharp
```

- [ ] **Step 2: Izveidot server/services/cloudinary.ts**

```typescript
// server/services/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
}

export async function uploadImage(
  buffer: Buffer,
  options: { folder?: string; publicId?: string } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'listings',
        public_id: options.publicId,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadVideo(
  buffer: Buffer,
  options: { folder?: string } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? 'videos',
        resource_type: 'video',
        transformation: [
          { duration: '30' },       // maks 30 sekundes
          { quality: 'auto:good' },
          { format: 'mp4' },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(buffer);
  });
}

export async function uploadChatImage(buffer: Buffer): Promise<UploadResult> {
  return uploadImage(buffer, {
    folder: 'chat',
    // Mazāks izmērs chat attēliem
  });
}

export async function deleteFile(publicId: string, resourceType: 'image' | 'video' = 'image') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (e) {
    console.error('Cloudinary delete error:', e);
  }
}

export default cloudinary;
```

- [ ] **Step 3: Nomainīt POST /api/upload endpoint**

Atrast `app.post('/api/upload', ...)` server.ts (~rinda 227). Aizstāt ar:

```typescript
app.post('/api/upload', upload.single('image'), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await uploadImage(req.file.buffer, { folder: 'listings' });
    res.json({ url: result.url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

- [ ] **Step 4: Nomainīt POST /api/upload/chat-image**

```typescript
app.post('/api/upload/chat-image', upload.single('image'), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await uploadChatImage(req.file.buffer);
    res.json({ url: result.url });
  } catch (error) {
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

- [ ] **Step 5: Nomainīt POST /api/upload/multiple**

```typescript
app.post('/api/upload/multiple', upload.array('images', 10), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploads = await Promise.all(
      req.files.map(file => uploadImage(file.buffer, { folder: 'listings' }))
    );
    res.json({ urls: uploads.map(u => u.url) });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

- [ ] **Step 6: Nomainīt POST /api/upload/video**

```typescript
app.post('/api/upload/video', videoUpload.single('video'), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await uploadVideo(req.file.buffer, { folder: 'videos' });
    res.json({ videoUrl: result.url });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

- [ ] **Step 7: Pievienot importu server.ts augšā**

```typescript
import { uploadImage, uploadVideo, uploadChatImage } from './server/services/cloudinary';
```

- [ ] **Step 8: Dzēst uploads/ statisko route (vairs nav vajadzīga)**

Atrast `app.use('/uploads', express.static(...))` un dzēst šo rindu.

- [ ] **Step 9: Pārbaudīt**

```bash
npx tsc --noEmit 2>&1
```

Sagaidāmais: 0 kļūdas.

- [ ] **Step 10: Testēt upload**

```bash
npm run dev
# Atvērt http://localhost:3000 → pievienot sludinājumu → augšupielādēt attēlu
# Pārbaudīt Cloudinary dashboard → Media Library → listings/
```

- [ ] **Step 11: Commit**

```bash
git add server/services/cloudinary.ts server.ts package.json package-lock.json
git commit -m "feat(media): replace local uploads with Cloudinary CDN"
```

---

## FĀZE 2: UPSTASH REDIS CACHE

### Task 3: Redis cache slānis

**Files:**
- Create: `server/services/redis.ts`
- Modify: `server.ts` (Omniva cache, rate limiting)

- [ ] **Step 1: Instalēt**

```bash
npm install @upstash/redis
```

- [ ] **Step 2: Izveidot server/services/redis.ts**

```typescript
// server/services/redis.ts
import { Redis } from '@upstash/redis';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('UPSTASH_REDIS_REST_URL/TOKEN not set — Redis cache disabled');
}

export const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

const SECOND = 1;
const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;

export const TTL = {
  omnivaLocations: DAY,        // Omniva pakomāti — 24h
  listingsHome: 5 * MINUTE,   // Sākumlapa listings — 5 min
  userProfile: 10 * MINUTE,   // Lietotāja profils — 10 min
  settings: HOUR,             // Platformas iestatījumi — 1h
  tokenBlacklist: 7 * 24 * HOUR, // JWT blacklist — 7 dienas
};

// Iegūt no cache vai izpildīt fn un saglabāt
export async function cached<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  if (!redis) return fn();

  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

// Invalīdēt cache atslēgu vai maskas
export async function invalidate(key: string) {
  if (!redis) return;
  await redis.del(key);
}

export async function invalidatePattern(pattern: string) {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

// Rate limiting: atgriež { allowed: boolean, remaining: number, resetIn: number }
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  if (!redis) return { allowed: true, remaining: limit, resetIn: windowSeconds };

  const key = `rl:${identifier}`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);

  const ttl = await redis.ttl(key);
  const remaining = Math.max(0, limit - current);
  return {
    allowed: current <= limit,
    remaining,
    resetIn: ttl,
  };
}
```

- [ ] **Step 3: Nomainīt Omniva in-memory cache uz Redis**

Atrast server.ts, kur ir `omnivaLocationsCache` mainīgais (~rinda 2580). Aizstāt visu bloku:

```typescript
// DZĒST šīs 2 rindas:
// let omnivaLocationsCache: any[] | null = null;
// let omnivaLastFetch = 0;

// Nomainīt app.get('/api/shipping/omniva-locations', ...) ar:
app.get('/api/shipping/omniva-locations', async (req, res) => {
  try {
    const city = req.query.city as string | undefined;
    const cacheKey = city ? `omniva:city:${city.toLowerCase()}` : 'omniva:all';

    const locations = await cached(cacheKey, TTL.omnivaLocations, async () => {
      const response = await fetch('https://omniva.lv/locations.json');
      const data = await response.json() as any[];
      const latvian = data
        .filter((loc: any) => loc.A0_NAME === 'LV')
        .map((loc: any) => ({
          id: loc.ZIP,
          name: loc.NAME,
          address: loc.A2_NAME + (loc.A3_NAME ? ', ' + loc.A3_NAME : '') + ', ' + loc.A1_NAME,
          city: loc.A1_NAME,
        }));
      return city
        ? latvian.filter((l: any) => l.city.toLowerCase().includes(city.toLowerCase()))
        : latvian.slice(0, 100);
    });

    res.json(locations);
  } catch (e) {
    res.status(503).json({ error: 'Nevar ielādēt Omniva lokācijas' });
  }
});
```

- [ ] **Step 4: Pievienot rate limiting middleware**

Atrast `startServer()` funkcijā, pirms pirmā `app.use()` izsaukuma, pievienot:

```typescript
import { checkRateLimit } from './server/services/redis';

// Rate limiting middleware — pievienot pirms app.use(express.json())
app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip static files un health check
  if (req.path === '/api/health' || !req.path.startsWith('/api/')) return next();

  const identifier = req.ip ?? 'unknown';
  
  // Stingrāks limits autentifikācijas endpointiem (brute force aizsardzība)
  const isAuthEndpoint = req.path.startsWith('/api/auth/');
  const limit = isAuthEndpoint ? 10 : 200;
  const window = isAuthEndpoint ? 60 : 60; // sekundes

  const { allowed, remaining, resetIn } = await checkRateLimit(
    `${identifier}:${isAuthEndpoint ? 'auth' : 'api'}`,
    limit,
    window
  );

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetIn);

  if (!allowed) {
    return res.status(429).json({
      error: 'Pārāk daudz pieprasījumu. Mēģiniet vēlāk.',
      resetIn,
    });
  }
  next();
});
```

- [ ] **Step 5: Cache invalidācija pēc listing izveides/dzēšanas**

Listing izveides handler pēc `res.json(...)`:
```typescript
// Pēc listing izveides — invalīdēt homepage cache
await invalidatePattern('listings:home:*');
```

Listing dzēšanas handler pēc dzēšanas:
```typescript
await invalidatePattern('listings:home:*');
await invalidate(`listing:${listingId}`);
```

- [ ] **Step 6: Pievienot importus server.ts**

```typescript
import { cached, invalidate, invalidatePattern, TTL } from './server/services/redis';
```

- [ ] **Step 7: Pārbaudīt**

```bash
npm run dev
curl http://localhost:3000/api/shipping/omniva-locations?city=Rīga
# Pirmais pieprasījums: ~2s (Omniva API)
# Otrais pieprasījums: ~50ms (Redis cache)
```

- [ ] **Step 8: Commit**

```bash
git add server/services/redis.ts server.ts package.json package-lock.json
git commit -m "feat(cache): add Upstash Redis for rate limiting and Omniva cache"
```

---

## FĀZE 3: RESEND EMAIL

### Task 4: Aizstāt nodemailer ar Resend

**Files:**
- Create: `server/services/email.ts`
- Modify: `server.ts` (dzēst nodemailer kodu, importēt jauno servisu)

- [ ] **Step 1: Instalēt**

```bash
npm install resend
npm uninstall nodemailer @types/nodemailer
```

- [ ] **Step 2: Izveidot server/services/email.ts**

```typescript
// server/services/email.ts
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM ?? 'BalticMarket <noreply@balticmarket.lv>';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.log(`[EMAIL SIMULATED] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error('[EMAIL ERROR]', e);
  }
}

// Gatavie email template'i
export const emailTemplates = {
  newListingMatch: (userName: string, listingTitle: string, listingPrice: number, listingId: number) => ({
    subject: 'Jauns sludinājums atbilst jūsu meklēšanai | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Jauns sludinājums!</h2>
        <p>Sveiks, <strong>${userName}</strong>!</p>
        <p>Ir pievienots jauns sludinājums <strong>"${listingTitle}"</strong> 
           par <strong>€${listingPrice}</strong>, kas atbilst jūsu saglabātajam meklējumam.</p>
        <a href="${process.env.APP_URL}/listing/${listingId}"
           style="display: inline-block; background: #E64415; color: white; 
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt sludinājumu
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          BalticMarket — Latvijas sludinājumu portāls
        </p>
      </div>
    `,
  }),

  orderShipped: (buyerName: string, listingTitle: string, orderId: number) => ({
    subject: 'Jūsu pasūtījums ir nosūtīts | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">📦 Pasūtījums nosūtīts!</h2>
        <p>Sveiks, <strong>${buyerName}</strong>!</p>
        <p>Jūsu pasūtījums <strong>"${listingTitle}"</strong> ir nodots piegādei.</p>
        <a href="${process.env.APP_URL}/profile?tab=orders"
           style="display: inline-block; background: #E64415; color: white; 
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt pasūtījumu #${orderId}
        </a>
      </div>
    `,
  }),

  orderCompleted: (sellerName: string, listingTitle: string, amount: number) => ({
    subject: 'Pārdevums pabeigts — nauda ieskaitīta | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #22c55e;">✅ Nauda ieskaitīta!</h2>
        <p>Sveiks, <strong>${sellerName}</strong>!</p>
        <p>Pircējs apstiprinājis saņemšanu. <strong>€${amount}</strong> 
           par "${listingTitle}" ir ieskaitīti jūsu kontā.</p>
        <a href="${process.env.APP_URL}/profile?tab=wallet"
           style="display: inline-block; background: #22c55e; color: white; 
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt maku
        </a>
      </div>
    `,
  }),

  disputeResolved: (userName: string, resolution: 'refund' | 'release', orderId: number) => ({
    subject: 'Strīds atrisināts | BalticMarket',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E64415;">Strīds atrisināts</h2>
        <p>Sveiks, <strong>${userName}</strong>!</p>
        <p>${resolution === 'refund'
          ? 'Lēmums pieņemts jūsu labā — nauda tiek atmaksāta.'
          : 'Lēmums pieņemts pārdevēja labā — nauda pārskaitīta.'}
        </p>
        <a href="${process.env.APP_URL}/profile?tab=orders"
           style="display: inline-block; background: #E64415; color: white; 
                  padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          Skatīt pasūtījumu #${orderId}
        </a>
      </div>
    `,
  }),
};
```

- [ ] **Step 3: Nomainīt sendEmail izsaukumus server.ts**

Atrast esošo `nodemailer` importu un `emailTransporter` kodu server.ts augšā. Aizstāt ar:

```typescript
// DZĒST:
// import nodemailer from 'nodemailer';
// const emailTransporter = ...
// async function sendEmail(to, subject, html) { ... }

// PIEVIENOT:
import { sendEmail, emailTemplates } from './server/services/email';
```

- [ ] **Step 4: Atjaunināt sendEmail izsaukumus ar template'iem**

Atrast visas `sendEmail(...)` vietas server.ts un nomainīt uz typed template'iem:

**Saved search match (~rinda 1740):**
```typescript
// PIRMS:
sendEmail(user.email, 'Jauns sludinājums...', `<h2>Sveiks...`);

// PĒC:
const tmpl = emailTemplates.newListingMatch(user.name, listingData.title, listingData.price, listingId);
sendEmail(user.email, tmpl.subject, tmpl.html);
```

**Order shipped (~rinda 820):**
```typescript
const tmpl = emailTemplates.orderShipped(buyer.name, listing?.title ?? 'Prece', orderId);
sendEmail(buyer.email, tmpl.subject, tmpl.html);
```

**Order completed (~rinda 845):**
```typescript
const tmpl = emailTemplates.orderCompleted(seller.name, completedListing?.title ?? 'Prece', order.amount);
sendEmail(seller.email, tmpl.subject, tmpl.html);
```

- [ ] **Step 5: Pārbaudīt**

```bash
npx tsc --noEmit 2>&1
```

Sagaidāmais: 0 kļūdas.

- [ ] **Step 6: Testēt (ar Resend dev mode)**

```bash
npm run dev
# Izveidot pasūtījumu un nosūtīt — pārbaudīt Resend Dashboard → Logs
```

- [ ] **Step 7: Commit**

```bash
git add server/services/email.ts server.ts package.json package-lock.json
git commit -m "feat(email): replace nodemailer with Resend + typed email templates"
```

---

## FĀZE 4: WEB PUSH NOTIFIKĀCIJAS

### Task 5: Browser push notifikācijas (bez trešās puses servisa)

**Files:**
- Create: `server/services/push.ts`
- Modify: `server.ts` (pievienot subscription endpoints)
- Modify: `server/schema.sql` (pievienot push_subscriptions tabulu)
- Modify: `src/components/PushNotificationSetup.tsx` (jauns komponents)

- [ ] **Step 1: Instalēt**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

- [ ] **Step 2: Pievienot push_subscriptions tabulu schema.sql**

```sql
-- Pievienot server/schema.sql beigās:
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Palaist migrāciju:
```bash
npx tsx -e "
import 'dotenv/config';
import { pool } from './server/pg';
pool.query(\`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
\`).then(() => { console.log('✓ push_subscriptions table created'); pool.end(); });
"
```

- [ ] **Step 3: Izveidot server/services/push.ts**

```typescript
// server/services/push.ts
import webpush from 'web-push';
import db from '../pg';

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@balticmarket.lv',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<void> {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.log(`[PUSH SIMULATED] User ${userId}: ${payload.title}`);
    return;
  }

  const subscriptions = await db.all<{ endpoint: string; p256dh: string; auth: string }>(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon ?? '/icon-192.png',
    data: { url: payload.url ?? '/' },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload
        );
      } catch (err: any) {
        // 410 = subscription expired — dzēst no DB
        if (err.statusCode === 410) {
          await db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
        }
      }
    })
  );
}

export const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? '';
```

- [ ] **Step 4: Pievienot push subscription endpoints server.ts**

Pievienot pirms Ads Endpoints sadaļas:

```typescript
import { sendPushToUser, vapidPublicKey } from './server/services/push';

// GET /api/push/vapid-public-key — frontend vajag šo, lai reģistrētu subscription
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// POST /api/push/subscribe — saglabāt lietotāja push subscription
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }
    await db.run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/push/unsubscribe
app.delete('/api/push/unsubscribe', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { endpoint } = req.body;
    await db.run(
      'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?',
      [userId, endpoint]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});
```

- [ ] **Step 5: Pievienot push notifikācijas esošajiem event'iem**

Atrast Socket.IO `io.to(...)` izsaukumus un pievienot paralēlu push:

```typescript
// Pēc io.to(`user_${order.buyer_id}`).emit('order_shipped', ...) (~rinda 820):
sendPushToUser(order.buyer_id, {
  title: '📦 Pasūtījums nosūtīts',
  body: `"${listing?.title}" ir ceļā uz jums`,
  url: `/profile?tab=orders`,
});

// Pēc io.to(`user_${order.seller_id}`).emit('order_completed', ...) (~rinda 850):
sendPushToUser(order.seller_id, {
  title: '✅ Nauda ieskaitīta',
  body: `€${order.amount} no "${completedListing?.title}"`,
  url: `/profile?tab=wallet`,
});

// Pēc jauna message saglabāšanas (~rinda 1900):
sendPushToUser(receiverId, {
  title: '💬 Jauna ziņa',
  body: content.length > 60 ? content.slice(0, 60) + '...' : content,
  url: `/chat?userId=${senderId}`,
});
```

- [ ] **Step 6: Izveidot frontend Push setup komponentu**

```typescript
// src/components/PushNotificationSetup.tsx
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

export function PushNotificationSetup() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        const keyRes = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // Jau reģistrēts

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(subscription),
        });
      } catch (err) {
        // Silent fail — push nav kritiski
      }
    };

    setup();
  }, [user?.id]);

  return null; // Nav vizuāla elementa
}
```

- [ ] **Step 7: Izveidot service worker**

```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon ?? '/icon-192.png',
      data: { url: data.data?.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

- [ ] **Step 8: Reģistrēt service worker un PushNotificationSetup**

`src/main.tsx` — pievienot service worker reģistrāciju:

```typescript
// Esošais kods:
// import { HelmetProvider } from 'react-helmet-async';

// Pievienot zem importiem:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}
```

`src/App.tsx` — pievienot PushNotificationSetup:

```typescript
import { PushNotificationSetup } from './components/PushNotificationSetup';

// Router iekšā, pirms Routes:
<PushNotificationSetup />
```

- [ ] **Step 9: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Sagaidāmais: 0 kļūdas.

- [ ] **Step 10: Commit**

```bash
git add server/services/push.ts server.ts public/sw.js \
        src/components/PushNotificationSetup.tsx src/main.tsx src/App.tsx \
        server/schema.sql package.json package-lock.json
git commit -m "feat(push): add Web Push notifications with VAPID (no third-party service)"
```

---

## KOPSAVILKUMS — Plāns B rezultāts

Pēc Plāna B izpildes:

| Funkcija | Pirms | Pēc |
|---|---|---|
| Attēli | `uploads/` lokāli, WebP | Cloudinary CDN, auto-optimizācija |
| Video | `uploads/` lokāli, MP4 | Cloudinary, auto-transcode, max 30s |
| Cache | In-memory mainīgais | Upstash Redis, 24h TTL |
| Rate limiting | Nav | 200 req/min API, 10 req/min auth |
| Email | `console.log` simulācija | Resend, branded templates |
| Push notif. | Nav | Web Push, bez servisa maksas |

**Nākamais:** Plāns C — Meilisearch meklēšana + Security + Docker + Hetzner deployment.
