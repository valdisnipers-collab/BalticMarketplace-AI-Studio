# Core Stability Fix Pack v1 — Implementation Report

**Status:** Implemented locally; pending user approval for commit & push.
**Session date:** 2026-04-24.
**Prerequisites:** Commits `70083ce` (security hardening) + `5fb384f` (frontend audit) from the earlier session of the same day. This fix pack builds on both.

---

## 1. Summary of fixed issues

The 10-phase stabilization brief was split into nine posmi (A–I). Every posm
ended with `npx tsc --noEmit` clean and `npm run build` green. The scope
stayed inside the existing architecture — no new external services, no
visual redesign, no breaking feature removal.

| Phase (brief) | Posm | Outcome |
|---|---|---|
| 1 — DB alignment | A | Schema synced with code; all ad-hoc ALTERs replaced by a proper migration runner. |
| 2 — Missing endpoints | C, D | 6 previously-404 endpoints added (company profile, view increment, saved-search update & toggle, two offer-list endpoints, offer status transition). |
| 3 — Offers flow | D | Full lifecycle (7 states) via `OfferService`; self-offer and status='active' guards; auto-reject competing on accept. |
| 4 — Auction safety | E | Bid insert now atomic under `SELECT … FOR UPDATE`; anti-sniping extension happens inside the same lock. |
| 5 — Auth / Socket / OTP | F | Legacy `'token'` key eliminated; shared `apiClient` added; OTP `123456` and Smart-ID simulation blocked in production. |
| 6 — Category normalization | B, I | `listing_type` canonicalized with `resolveListingType`; category IDs canonicalized in DB (migration 007) with backend translation layer, zero frontend churn. |
| 7 — Search / saved searches | C | Saved-search update and notification toggle endpoints added; pagination cap on `/api/listings`. |
| 8 — Ads / promotion | — | Already aligned in prior session; nothing to add. |
| 9 — Admin panel | — | Already aligned in prior session; nothing to add. |
| 10 — Testing | throughout | Typecheck + build after every posm. |

---

## 2. Changed files (37 total)

### New files

```
server/migrations/001_core_alignment.sql
server/migrations/002_ai_listing_fields.sql
server/migrations/003_messages_security_fields.sql
server/migrations/004_ads_stats_fields.sql
server/migrations/005_saved_searches_alignment.sql
server/migrations/006_offers_company_profile_alignment.sql
server/migrations/007_category_canonical_ids.sql
server/migrations/runner.ts
server/services/OfferService.ts
server/utils/categories.ts
src/constants/categories.ts
src/lib/apiClient.ts
docs/CORE_STABILITY_FIX_PACK_V1_REPORT.md   ← this file
```

### Modified files

```
package.json                          — adds `npm run migrate`
server.ts                             — runMigrations() in boot
server/schema.sql                     — all drift columns inlined
server/init-db.ts                     — delegates to migration runner
server/middleware/validate.ts         — listing_type enum now includes 'offer'
server/routes/auth.ts                 — production OTP + Smart-ID guards
server/routes/listings.ts             — category normalize, resolveListingType,
                                         view-increment, FOR UPDATE bid,
                                         pagination, self-offer guard
server/routes/offers.ts               — real endpoints (was placeholder)
server/routes/users.ts                — company GET/PUT, saved-search PUT,
                                         toggle-notifications, views fix
src/hooks/useListingDraft.ts          — token key → auth_token
src/pages/AddListing.tsx              — sends listing_type explicitly
src/pages/ListingDetails.tsx          — fires view-increment
```

---

## 3. Migration files

All migrations are idempotent and tracked in a new `schema_migrations`
bookkeeping table. Runner is at `server/migrations/runner.ts` and is called
automatically during `server.ts` boot so production deploys apply pending
migrations before serving traffic.

| File | Purpose |
|---|---|
| `001_core_alignment.sql` | `listings.view_count`, `quality_score`, `users.trust_score`; backfill `listing_type` from `attributes.saleType`. |
| `002_ai_listing_fields.sql` | `listings.ai_moderation_status`, `ai_moderation_reason`, `ai_card_summary` + index. |
| `003_messages_security_fields.sql` | `messages.is_phishing_warning BOOLEAN`, `system_warning TEXT`. Fixes silent INSERT failure. |
| `004_ads_stats_fields.sql` | `ads.placement`, `budget_points`, `updated_at`; indexes. |
| `005_saved_searches_alignment.sql` | `saved_searches.subcategory`, `attributes JSONB`, `notification_enabled`, `updated_at`; best-effort backfill from legacy `filters` TEXT column. |
| `006_offers_company_profile_alignment.sql` | `offers.expires_at`, `parent_offer_id`, `order_id`; CHECK constraint enforcing the 7 canonical statuses. |
| `007_category_canonical_ids.sql` | Rewrites `listings.category` and `saved_searches.category` from Latvian labels (`'Transports'` etc.) to canonical IDs (`'transport'` etc.). |

Running manually:

```bash
npm run migrate
```

---

## 4. Added / fixed API endpoints

### New endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users/me/company` | Fetch the current user's company profile. |
| PUT | `/api/users/me/company` | Update company profile with COALESCE-style merge. |
| POST | `/api/listings/:id/view` | Increment `view_count` (excludes owner's own views). |
| PUT | `/api/users/me/saved-searches/:id` | Edit a saved search. |
| POST | `/api/users/me/saved-searches/:id/toggle-notifications` | Flip `notification_enabled`. |
| GET | `/api/users/me/offers/received` | Offers the user received as a seller. |
| GET | `/api/users/me/offers/sent` | Offers the user sent as a buyer. |
| PATCH | `/api/offers/:id/status` | Seller accept/reject; buyer cancel. Uses `OfferService`. |

### Behavior changes on existing endpoints

- `GET /api/listings` now accepts `limit` (default 50, hard cap 100) and
  `offset`; response body shape unchanged.
- `GET /api/listings` / `:id` / `/search` now emit both `category` (Latvian
  label, for legacy frontend) and `category_id` (canonical).
- `POST /api/listings` and `PUT /api/listings/:id` accept either a canonical
  category id or a Latvian label; normalize before storing.
- `POST /api/listings/:id/offers` blocks self-offers and non-active listings.
- `POST /api/listings/:id/bids` wraps the highest-bid check + INSERT + anti-
  sniping extension in a single transaction under `SELECT FOR UPDATE`.
- `POST /api/auth/request-otp`, `/verify-otp`: `(simulated)` path now 503s
  in production. Dev still accepts `123456`.
- All `/api/auth/smart-id/*` endpoints: 503 in production without
  `SMART_ID_PROVIDER_URL`; dev keeps simulating.

---

## 5. Remaining risks / unfinished items

1. **Meilisearch reindex required after deploy.** Migration 007 rewrites
   DB category strings. Meilisearch's existing index still holds Latvian
   labels until reindexed. Run `POST /api/admin/reindex` after the first
   deploy that contains this migration. Until then, search by category will
   return stale results.
2. **Order creation on offer accept** is not wired. `OfferService.acceptOffer`
   flips the status, rejects competing offers, but stops short of creating
   an `orders` row. The orders table's Stripe/shipping fields need their
   own flow; left for a follow-up session.
3. **Expired offers.** `expireStaleOffers()` exists in `OfferService` but
   isn't called yet. Hook it into a 5-minute interval in `server.ts` or a
   separate worker when ready.
4. **`src/lib/apiClient.ts` is introduced but not adopted everywhere.**
   Existing `fetch()` call sites keep working; migrate them opportunistically.
5. **Frontend still uses Latvian labels as internal category keys.** The
   canonical id system is live end-to-end in the DB and API; frontend
   migration to `src/constants/categories.ts` is a separate, lower-risk
   session.
6. **PG pool error surfaces during server shutdown** only if Meilisearch is
   unreachable at boot; the migration runner still completes first, so no
   data-loss risk.

---

## 6. Commands to run

```bash
# one-time, after pulling this branch
npm install

# typecheck
npm run lint       # (alias for tsc --noEmit)

# apply DB migrations manually (server also runs them on boot)
npm run migrate

# build for production
npm run build

# dev server (applies migrations then serves)
npm run dev

# after first production deploy: reindex Meilisearch
curl -X POST "$API/api/admin/reindex" -H "Authorization: Bearer <admin-token>"
```

---

## 7. Manual test checklist

Run through these after deploying to verify nothing regresses. Mark each
pass/fail as you go.

| # | Step | Expected |
|---|---|---|
| 1 | Boot server with `JWT_SECRET` unset in production | Process exits with a clear message. |
| 2 | Boot server with `JWT_SECRET` set | Migrations log `applied=N skipped=M`; server listens on :3000. |
| 3 | Register phone user in production without Twilio env | `/request-otp` returns 503, not a simulated success. |
| 4 | Login in dev with Twilio not configured | `123456` still works; `000000` rejected. |
| 5 | Hit `/api/auth/smart-id/login/init` in production without `SMART_ID_PROVIDER_URL` | 503. |
| 6 | Create listing (sale) | DB row has `listing_type='sale'`, `category` canonical id. |
| 7 | Create auction listing | DB row has `listing_type='auction'`; also `is_auction=1`. |
| 8 | Open a listing as anonymous | `view_count` increments; as owner, it doesn't. |
| 9 | Concurrent bids on one auction | Exactly one succeeds; other returns `BID_TOO_LOW`. |
| 10 | Bid `Infinity` | 400 from `parseFiniteNumber`. |
| 11 | Bid seconds after `auction_end_date` | 400 with "Izsole jau ir noslēgusies". |
| 12 | Buyer sends offer on active listing | Row in `offers` with `status='pending'`. |
| 13 | Buyer sends offer on sold listing | 400 with "Piedāvājumus var sūtīt tikai aktīviem sludinājumiem". |
| 14 | Buyer tries to offer on own listing (forged `buyerId`) | 400. |
| 15 | Seller accepts offer with 2 competing pending offers | Target → accepted; others → rejected automatically. |
| 16 | Buyer tries to cancel accepted offer | 409 INVALID_TRANSITION. |
| 17 | `GET /api/users/me/offers/received` | Array of offers on the user's own listings. |
| 18 | `GET /api/users/me/company` | Current company fields. |
| 19 | `PUT /api/users/me/company` | Row updated, GET reflects changes. |
| 20 | `PUT /api/users/me/saved-searches/:id` | Values persist; GET returns new values. |
| 21 | `POST .../toggle-notifications` | `notification_enabled` flips. |
| 22 | `GET /api/listings?limit=10` | Max 10 items. |
| 23 | `GET /api/listings?limit=500` | Capped at 100. |
| 24 | `GET /api/listings/:id` | Response includes both `category` (Latvian) and `category_id` (canonical). |
| 25 | Socket connect without token | Connection accepted but no `user_<id>` join. |
| 26 | Socket connect with token | Auto-joined to `user_<verifiedId>`. |
| 27 | `io.emit('auction_ended')` test | Only clients in `auction_<id>` room receive it. |
| 28 | OFFER status change via PATCH | Counterparty receives `offer_status_changed` socket event. |

---

## 8. Environment variables to verify in production

Required:
- `DATABASE_URL` — Neon Postgres, SSL required.
- `JWT_SECRET` — min 16 chars. Server refuses to boot without it in production.

Recommended:
- `GEMINI_API_KEY` — without it, AI moderation / suggestions / compare /
  VIN / image decode silently no-op. Not a security issue but a UX cliff.
- `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY` — without them the system falls
  back to Postgres FTS automatically. Remember to call `POST /admin/reindex`
  after migration 007 lands.

Production-gated (features off without them):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` —
  phone OTP. Missing → 503 in production.
- `SMART_ID_PROVIDER_URL` — currently just a feature flag; Smart-ID endpoints
  503 in production until this is set. Integration is still simulated.

Unchanged from before:
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
- `NODE_ENV` — must be `production` on prod, anything else acts as dev.

---

**End of report.**
