# Parallel Project Feature Merge — Implementation Report v1

**Status:** Implemented locally; pending commit & push.
**Companion:** `docs/PARALLEL_PROJECT_FEATURE_MERGE_PLAN_V1.md`.

## 1. Summary of implemented features

| Feature | Backend | Frontend | Notes |
|---|---|---|---|
| DB columns + 3 new tables | migrations 017–019 | — | idempotent, runs on boot |
| Promotion engine (highlight / bump / auto_bump) | `PromotionService`, `/listings/:id/promote` | `ListingDetails.tsx` compact UI | reads prices from platform_settings |
| Search promo boost | `listings.ts` ORDER BY | — | currently-promoted listings float to top |
| B2B auto-reply | `AutoReplyService`, messages hook | `Profile.tsx` company tab (lauki) | loop-safe via `system_warning='auto_reply'` |
| Analytics history | `users.ts` 30-day JOIN | `Profile.tsx` analytics tab | empty state when no data |
| Listing view tracking (daily) | view endpoint + 2 upserts | `ListingDetails.tsx` per-day localStorage gate | view_count + today_views shown to owners |
| Similar listings | `GET /:id/similar` | `ListingDetails.tsx` section | ordered by highlighted + price proximity |
| Recently viewed | `POST /listings/batch` | `lib/recentlyViewed.ts`, Profile tab | anonymous-friendly, max 12 |
| Pricing page + subscription | webhook + portal | `Pricing.tsx` | 3 plans + 4 points packages |
| Stripe Billing Portal | `POST /create-portal-session` | TODO Profile CTA | safe 400 / 503 fallbacks |
| Invoice HTML | `GET /orders/:id/invoice-html` | — | auth required, buyer/seller/admin only |
| AddListing types (free/exchange/wholesale) | listings create/update accept new fields | `AddListing.tsx` 4-tile selector | B2B-only wholesale section |
| Admin dispute chat | `GET /admin/disputes/:id/chat` | Modal in AdminReportsTab | read-only |
| ExtendedIcons + preview | — | `IconPreview.tsx` + route | dev-only, stripped in prod via `import.meta.env.DEV` |

## 2. Changed files

New (11):
```
docs/PARALLEL_PROJECT_FEATURE_MERGE_PLAN_V1.md
docs/PARALLEL_PROJECT_FEATURE_MERGE_REPORT_V1.md
server/migrations/017_listings_ai_pricing_and_wholesale.sql
server/migrations/018_users_b2b_stripe_autoreply.sql
server/migrations/019_analytics_and_promotions_tables.sql
server/services/PromotionService.ts
server/services/AutoReplyService.ts
src/lib/recentlyViewed.ts
src/pages/Pricing.tsx
src/pages/IconPreview.tsx
src/components/icons/ExtendedIcons.tsx
src/vite-env.d.ts
```

Modified:
```
server/schema.sql                 — inlined new tables/columns
server/routes/listings.ts         — /promote, /batch, /:id/similar, view stats, promo sort
server/routes/users.ts            — auto-reply fields, analytics history
server/routes/messages.ts         — AutoReplyService fire-and-forget hook
server/routes/orders.ts           — invoice-html, user_daily_stats revenue upsert
server/routes/payments.ts         — subscription webhook, create-portal-session
server/routes/admin.ts            — /admin/disputes/:id/chat
src/App.tsx                       — /pricing + conditional /icons
src/pages/ListingDetails.tsx      — similar section, view tracking, promote UI
src/pages/Profile.tsx             — recently-viewed + analytics tabs
src/pages/AddListing.tsx          — 4 listing-type tiles + B2B wholesale section
src/pages/admin/tabs/AdminReportsTab.tsx — dispute chat modal
```

## 3. Added migrations

| File | What it does |
|---|---|
| 017 | listings: ai_min_price, ai_max_price, ai_price_explanation, moq, wholesale_price, promoted_until, auto_bump_until, last_bumped_at + partial indexes |
| 018 | users: auto_reply_enabled, auto_reply_text, stripe_customer_id, stripe_subscription_id, b2b_subscription_status |
| 019 | tables listing_view_stats, listing_promotions (CHECK type), user_daily_stats + indexes + seed 3 platform_settings keys (highlight_price_points, bump_price_points, auto_bump_price_points) |

## 4. Added / fixed backend endpoints

```
POST   /api/listings/:id/promote          — unified promotion
POST   /api/listings/batch                — fetch up to 12 listings
GET    /api/listings/:id/similar          — 4 similar listings
GET    /api/orders/:id/invoice-html       — printable invoice, auth required
POST   /api/create-portal-session         — Stripe Billing Portal
GET    /api/admin/disputes/:id/chat       — admin read-only message thread
```

Behavior changes on existing endpoints:
- `POST /api/listings/:id/view` — additionally upserts `listing_view_stats`
  and `user_daily_stats`, returns `{ success, view_count, today_views }`.
- `GET /api/users/me/analytics` — returns `history: [{date, views, revenue}]`
  of 30 days, or `[]` if user has no data.
- `PUT /api/users/me/company` — accepts and persists `auto_reply_enabled`
  and `auto_reply_text` with validation.
- `POST /api/messages` — fires and forgets `maybeAutoReply(...)` after
  successful send.
- Stripe webhook — additionally handles `checkout.session.completed` when
  `mode === 'subscription'` (persists customer+subscription id) and
  `customer.subscription.deleted` (clears status).
- `GET /api/listings` and `/search` now ORDER BY a "promo boost" first,
  so currently-promoted listings appear above standard ones regardless of
  the user's sort choice.
- `POST /api/listings` and `PUT /:id` accept `moq`, `wholesale_price`,
  `exchange_for`, and validate per-type rules (free → price=0, exchange
  → exchange_for required).

## 5. Updated frontend pages

- `Pricing.tsx` (new): 3 plan cards + 4 point packages, wires to the
  existing checkout endpoint.
- `ListingDetails.tsx`: promote UI for owner, similar section (hidden
  when empty), per-day view tracking with localStorage gate.
- `Profile.tsx`: two new tabs — "Nesen skatītie" (batch + recentlyViewed)
  and "Analītika" (B2B only; real 30-day chart from the new analytics
  endpoint). Empty states are explicit and avoid mock data.
- `AddListing.tsx`: 4-tile listing-type selector (Fixed / Auction /
  Free / Exchange) + B2B-only wholesale section for MOQ and
  wholesale price. Submit body now includes `listing_type`,
  `exchange_for`, `moq`, `wholesale_price`.
- `AdminReportsTab.tsx`: "Skatīt saraksti" button on dispute rows opens
  a read-only modal with the buyer–seller conversation about the
  disputed listing.

## 6. Known limitations

1. **Auto-bump scheduler not implemented.** The `auto_bump_until`
   column is set by `PromotionService`, but no background job actively
   bumps listings until expiry. Listings are sorted higher while the
   timestamp is in the future — "passive" auto-bump, not scheduled
   re-posting. Documented in the plan.
2. **Portal CTA not yet added to Profile.** The backend endpoint
   exists; the `/profile` page currently lacks a "Pārvaldīt abonementu"
   button that calls it. One-line follow-up.
3. **CarListingWizard listing types.** The wizard still emits sale /
   auction only. Adding free / exchange to its flow is deliberately
   deferred to avoid regressing the car-creation path.
4. **Stripe Price IDs are placeholders.** `Pricing.tsx` references
   `price_pro_monthly` / `price_sniper_monthly`. Wiring real Stripe Price
   IDs is a deploy-time config task, not code.
5. **Analytics history uses a simple CSS bar chart** to avoid pulling
   in recharts on the Profile route. recharts is already in use
   elsewhere (Admin Overview) — swapping in a real chart later is easy.
6. **Auto-reply does not currently honor a per-listing context
   override** (e.g. per-category boilerplate). Only the global
   `auto_reply_text` field is used.

## 7. Commands

```bash
npm install
npm run lint          # alias for tsc --noEmit
npm run migrate       # applies 017–019 on first run, idempotent after
npm run build
npm run dev
```

Production deploy auto-applies migrations on boot via the existing
runner (`server/migrations/runner.ts`). No separate manual step needed.

## 8. Manual test checklist (45 steps)

Reproduced from the user's spec Phase 17:

Core (1–5): app starts, login/register, main, search — unchanged,
pre-merge baseline.

Offers (6–11): pre-existing OfferService. Re-verified endpoint paths.
Pass/fail: _run manually after deploy_.

Company/B2B (12–15):
- Save company profile — auto-reply fields persist after refresh.
- Enable auto-reply → send message to B2B account from another account
  → single auto-reply appears, no loop.

Views (16–18):
- Open a listing incognito → `view_count` increments once.
- Reload same tab → no second increment today.
- `/me/analytics` returns non-zero `total_views`.

Similar / recent (19–23):
- Listing details shows 3–4 similar items, same category, current
  listing excluded.
- Recently-viewed localStorage grows to max 12.
- Profile "Nesen skatītie" tab renders hydrated cards.
- "Notīrīt vēsturi" empties it.

Pricing / subscriptions (24–28):
- `/pricing` renders.
- Points checkout redirects to Stripe.
- Subscription checkout redirects to Stripe; webhook writes
  `stripe_customer_id` on success.
- Portal endpoint 400 for users without customer id.
- Portal endpoint 503 when `STRIPE_SECRET_KEY` missing.

Invoice (29–32):
- Buyer sees invoice HTML.
- Seller sees invoice HTML.
- Unrelated user sees 403.
- Admin sees invoice HTML.

Promotions (33–37):
- Owner sees promo buttons on listing details.
- Highlight / bump deduct points; `points_history` row appended.
- Non-owner → 403.
- Insufficient points → 400.

Admin (38–40):
- Status update via existing admin tab.
- Dispute chat modal opens with buyer ↔ seller messages.
- Non-admin → 403 on admin endpoints.

AddListing (41–45):
- Fixed price → stored `listing_type='sale'`.
- Auction → stored `listing_type='auction'`, bid flow works.
- Free → stored `listing_type='free'`, price accepted at 0.
- Exchange → `exchange_for` required; stored.
- B2B user → `moq` and `wholesale_price` stored.

Automated gates (run locally before push):

- `npx tsc --noEmit` → clean
- `npm run build` → succeeded (last run: ~478 KB gzipped, 13s)
- `npm run migrate` → 3 applied fresh, 19 skipped on repeat run

## 9. Environment notes

No new env vars introduced. Behavior:
- `GEMINI_API_KEY` missing → AutoReplyService uses the hardcoded Latvian
  fallback text; everything still works.
- `STRIPE_SECRET_KEY` missing → subscription checkout + portal return
  503 with a clear error.
- `STRIPE_WEBHOOK_SECRET` missing → webhook stays disabled (unchanged).

**End of report.**
