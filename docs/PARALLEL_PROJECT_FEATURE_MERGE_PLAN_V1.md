# Parallel Project Feature Merge — Plan v1

**Status:** Implemented locally; durable record of the 17-phase merge plan.
**Source:** `docs/BalticMarket-main (1).zip` (parallel reference project).

## Why

The parallel project ("BalticMarket-main") is a richer feature prototype
but uses an architecture we deliberately moved away from: SQLite, a
single-file monolithic server, and mixed route conventions. It cannot be
adopted wholesale. This plan extracts only the valuable product ideas
and ports them into the main modular PostgreSQL codebase without
regressing the architecture.

## What was imported and what was refused

Imported:
- Pricing page + Stripe subscription mode + Billing Portal endpoint
- Printable invoice HTML endpoint (rewritten with proper auth)
- Similar listings endpoint (reimplemented with real scoring)
- Listings batch fetch endpoint (to hydrate "Recently viewed")
- Recently-viewed listings client library (localStorage only)
- Unified `/promote` endpoint (highlight / bump / auto_bump)
- B2B auto-reply columns + service
- Listing_view_stats / user_daily_stats / listing_promotions tables
- B2B 30-day analytics history
- AI price guidance columns + wholesale MOQ columns
- ExtendedIcons library + dev-only /icons preview route
- Admin read-only dispute chat view

Refused (deliberately):
- SQLite migration (main is PostgreSQL)
- Monolithic server.ts (main is modular under `server/routes/`)
- `listings.views` naming (main uses canonical `view_count`)
- Parallel invoice-html endpoint (had no auth — unacceptable)
- Auto-switching `user_type='b2b'` when toggling auto-reply (parallel
  does this on line 548 of its server.ts; it surprises users)
- Parallel promote resetting `created_at` (destroys creation history;
  main uses `last_bumped_at`)
- Real Stripe refund inside dispute resolve (remains admin-only state
  change; refund stays manual)
- Auto-bump background scheduler (only timestamp-based expiry; no cron)

## Phases 1–17 vs. the user spec

| # | User's phase | Verdict |
|---|---|---|
| 1 | DB alignment | Extended with migrations 017–019 |
| 2 | Broken offer SQL | Already clean in main |
| 3 | Offers API | Already complete in main |
| 4 | Company + auto-reply | Company existed; auto-reply fields added |
| 5 | B2B AI auto-responder | Implemented via `AutoReplyService` |
| 6 | Listing view counter | Already implemented; extended with daily stats |
| 7 | Similar listings | Implemented |
| 8 | Recently viewed | Implemented (localStorage + batch endpoint) |
| 9 | Pricing + subscription | Implemented (Pricing.tsx + portal + webhook) |
| 10 | Invoice HTML | Implemented with buyer/seller/admin auth |
| 11 | Promotions | Implemented unified `/promote` + sort boost |
| 12 | Admin dispute chat | Implemented read-only modal |
| 13 | AddListing UI for free/exchange/wholesale | Implemented with 4-tile selector + B2B wholesale section |
| 14 | ExtendedIcons + /icons | Dev-only route + ExtendedIcons.tsx |
| 15 | Real B2B analytics | 30-day history via listing_view_stats + user_daily_stats |
| 16 | Route compatibility | Already canonical in main |
| 17 | Testing | Automated gates clean; manual checklist in report |

## Critical files changed

Backend:
- `server/migrations/017..019.sql` (new)
- `server/schema.sql` (inline new columns/tables)
- `server/services/PromotionService.ts` + `AutoReplyService.ts` (new)
- `server/routes/listings.ts` (promote, batch, similar, view stats, bump boost)
- `server/routes/users.ts` (auto-reply, analytics history)
- `server/routes/messages.ts` (auto-reply hook)
- `server/routes/orders.ts` (invoice endpoint, revenue stats upsert)
- `server/routes/payments.ts` (subscription webhook, portal)
- `server/routes/admin.ts` (dispute chat endpoint)

Frontend:
- `src/pages/Pricing.tsx` (new)
- `src/pages/IconPreview.tsx` (new, dev-only)
- `src/components/icons/ExtendedIcons.tsx` (new)
- `src/lib/recentlyViewed.ts` (new)
- `src/App.tsx` (/pricing + conditional /icons)
- `src/pages/ListingDetails.tsx` (similar, view tracking, promote UI)
- `src/pages/Profile.tsx` (recently-viewed tab, analytics tab)
- `src/pages/AddListing.tsx` (4-tile listing type selector + wholesale)
- `src/pages/admin/tabs/AdminReportsTab.tsx` (dispute chat modal)

## Security guarantees

1. Invoice HTML requires auth AND user must be buyer / seller / admin.
2. Billing portal requires `stripe_customer_id` on the user row.
3. Auto-reply flags incoming messages with `system_warning='auto_reply'`
   and refuses to reply to a message that already has that marker —
   cannot loop.
4. Promote is owner-only, active-listing-only, atomic transaction,
   and writes `points_history` for audit.
5. Similar + batch endpoints exclude rejected/archived/deleted listings.
6. Stripe signature verification unchanged from the main project's
   existing webhook.
