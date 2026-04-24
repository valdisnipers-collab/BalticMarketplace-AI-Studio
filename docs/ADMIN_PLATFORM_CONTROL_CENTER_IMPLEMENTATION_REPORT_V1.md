# Admin Platform Control Center — Implementation Report v1

**Status:** Implemented locally; pending commit & push.
**Session date:** 2026-04-24.
**Plan:** `docs/ADMIN_PLATFORM_CONTROL_CENTER_PLAN_V1.md`.

## 1. Summary of implemented modules

All 15 target admin modules now have working implementations backed by real
endpoints and DB tables. Every admin write operation writes an
`admin_audit_log` row. `isAdmin` middleware now rejects banned accounts.
Legacy admin routes (`/api/admin/stats`, `/api/admin/users`, etc.) stay
untouched and keep working alongside the new sub-routers.

| # | Module | Backend | Frontend | Notes |
|---|---|---|---|---|
| 1 | Overview | `overview.ts` | `AdminOverviewTab.tsx` | Real counters + trends + top categories via recharts |
| 2 | Users | `users-extended.ts` | `AdminUsersTab.tsx` | Ban, suspend, unban, verify, notes, role change (incl. `moderator`) |
| 3 | Listings | `listings-extended.ts` | `AdminListingsTab.tsx` | Filters, status lifecycle, bulk actions with ConfirmDialog |
| 4 | Categories | `categories.ts` | `AdminCategoriesTab.tsx` | Editable labels; canonical ids locked |
| 5 | Moderation | `moderation.ts` | `AdminModerationTab.tsx` | Unified queue (listings + reports + messages + disputes) |
| 6 | Reports & Disputes | legacy `/admin/reports`, `/admin/disputes` | `AdminReportsTab.tsx` | Sub-tabs; dispute refund/release |
| 7 | Ads & Promotions | legacy `/admin/ads` | `AdminAdsTab.tsx` | CTR, toggle active, delete |
| 8 | Orders | `orders.ts` | `AdminOrdersTab.tsx` | Filters, manual review flag, admin notes |
| 9 | Stores | `stores.ts` | `AdminStoresTab.tsx` | Verify, suspend, reject, reactivate |
| 10 | AI Controls | `ai.ts` | `AdminAITab.tsx` | Feature toggles + strictness + recent decisions; shows banner if `GEMINI_API_KEY` missing |
| 11 | Notifications | `notifications.ts` | `AdminNotificationsTab.tsx` | Template CRUD + preview, per-lang subject/body, channel |
| 12 | Content | `content.ts` + `content.ts` public | `AdminContentTab.tsx` | JSON value editor for homepage/banner/footer |
| 13 | Platform Settings | `settings.ts` | `AdminSettingsTab.tsx` | Grouped, typed inputs, confirm on maintenance_mode / registration_enabled / listing_creation_enabled |
| 14 | Audit Log | `audit.ts` | `AdminAuditLogTab.tsx` | Filter by admin / action / target_type; before/after JSON diff |
| 15 | System Health | `health.ts` | `AdminHealthTab.tsx` | Configured/not-configured for 9 services; uptime; last migration; no secrets |

## 2. Changed files

New (35):
```
docs/ADMIN_PLATFORM_CONTROL_CENTER_PLAN_V1.md
docs/ADMIN_PLATFORM_CONTROL_CENTER_IMPLEMENTATION_REPORT_V1.md
server/migrations/008_users_ban_status.sql
server/migrations/009_admin_audit_log.sql
server/migrations/010_admin_user_notes.sql
server/migrations/011_moderation_actions.sql
server/migrations/012_system_events.sql
server/migrations/013_platform_content.sql
server/migrations/014_notification_templates.sql
server/migrations/015_platform_settings_rich.sql
server/migrations/016_moderator_role_and_stores.sql
server/middleware/requireAdmin.ts
server/middleware/requireModerator.ts
server/services/AuditLogService.ts
server/services/PlatformSettingsService.ts
server/services/NotificationTemplateService.ts
server/services/SystemEventLogger.ts
server/utils/health.ts
server/routes/admin/index.ts
server/routes/admin/overview.ts
server/routes/admin/users-extended.ts
server/routes/admin/listings-extended.ts
server/routes/admin/categories.ts
server/routes/admin/moderation.ts
server/routes/admin/orders.ts
server/routes/admin/stores.ts
server/routes/admin/ai.ts
server/routes/admin/notifications.ts
server/routes/admin/content.ts
server/routes/admin/settings.ts
server/routes/admin/audit.ts
server/routes/admin/health.ts
server/routes/content.ts
lib/apiClient.ts
components/ui/confirm-dialog.tsx
components/ui/pagination.tsx
src/pages/admin/AdminLayout.tsx
src/pages/admin/tabs/AdminOverviewTab.tsx
src/pages/admin/tabs/AdminUsersTab.tsx
src/pages/admin/tabs/AdminListingsTab.tsx
src/pages/admin/tabs/AdminCategoriesTab.tsx
src/pages/admin/tabs/AdminModerationTab.tsx
src/pages/admin/tabs/AdminReportsTab.tsx
src/pages/admin/tabs/AdminAdsTab.tsx
src/pages/admin/tabs/AdminOrdersTab.tsx
src/pages/admin/tabs/AdminStoresTab.tsx
src/pages/admin/tabs/AdminAITab.tsx
src/pages/admin/tabs/AdminNotificationsTab.tsx
src/pages/admin/tabs/AdminContentTab.tsx
src/pages/admin/tabs/AdminSettingsTab.tsx
src/pages/admin/tabs/AdminAuditLogTab.tsx
src/pages/admin/tabs/AdminHealthTab.tsx
```

Modified:
```
server/schema.sql              — inlined new tables
server/utils/auth.ts           — isAdmin now rejects banned accounts
server.ts                      — mounts extended admin router + public content router
src/pages/AdminDashboard.tsx   — reduced to thin <AdminLayout /> wrapper
```

## 3. New migrations

| File | Purpose |
|---|---|
| 008 | users.is_banned, banned_at, suspension_until, banned_reason |
| 009 | admin_audit_log |
| 010 | admin_user_notes |
| 011 | moderation_actions (+ CHECK constraints for target/action) |
| 012 | system_events |
| 013 | platform_content (+ seed: home.hero.*, home.search.placeholder, footer.links, banners.maintenance_notice) |
| 014 | notification_templates (+ seed 11 templates: welcome, listing_approved, listing_rejected, offer_*, auction_*, order_*, payment_received, dispute_opened) |
| 015 | platform_settings (+ seed ~30 settings across general / listings / monetization / trust / ai / payments) |
| 016 | users.role CHECK, stores.verification_status + verified_at + verified_by, orders.manual_review + admin_notes |

Run manually:
```bash
npm run migrate
```
(Also runs automatically at server boot via the existing runner.)

## 4. New backend endpoints (45+)

Overview:
- GET /api/admin/overview/stats
- GET /api/admin/overview/trends
- GET /api/admin/overview/top-categories

Users:
- GET /api/admin/users/search
- GET /api/admin/users/:id/detail
- POST /api/admin/users/:id/ban
- POST /api/admin/users/:id/unban
- POST /api/admin/users/:id/suspend
- POST /api/admin/users/:id/verify
- GET/POST /api/admin/users/:id/notes

Listings:
- GET /api/admin/listings/search
- POST /api/admin/listings/:id/status
- POST /api/admin/listings/:id/highlight and /unhighlight
- POST /api/admin/listings/bulk

Categories:
- GET /api/admin/categories
- PUT /api/admin/categories/:id

Moderation:
- GET /api/admin/moderation/queue
- POST /api/admin/moderation/:type/:id/action

Orders:
- GET /api/admin/orders
- GET /api/admin/orders/:id
- POST /api/admin/orders/:id/manual-review
- POST /api/admin/orders/:id/notes

Stores:
- GET /api/admin/stores
- POST /api/admin/stores/:id/verify
- POST /api/admin/stores/:id/suspend
- POST /api/admin/stores/:id/reject
- POST /api/admin/stores/:id/reactivate

AI:
- GET /api/admin/ai/settings
- PUT /api/admin/ai/settings
- GET /api/admin/ai/recent-decisions

Notifications:
- GET /api/admin/notifications/templates
- GET /api/admin/notifications/templates/:key
- PUT /api/admin/notifications/templates/:key
- POST /api/admin/notifications/templates/:key/preview

Content:
- GET /api/admin/content
- PUT /api/admin/content/:key
- GET /api/content/public (public-facing)

Settings:
- GET /api/admin/settings
- PUT /api/admin/settings/:key

Audit:
- GET /api/admin/audit
- GET /api/admin/audit/actions

Health:
- GET /api/admin/health
- GET /api/admin/health/events

## 5. Platform settings seeded (30 keys)

`general`: platform_name, default_language, maintenance_mode, registration_enabled, listing_creation_enabled, chat_enabled, offers_enabled, auctions_enabled, moderator_enabled.
`listings`: default_listing_expiry_days, max_images_per_listing, require_moderation_before_publish, allow_free_listings, allow_exchange_listings.
`monetization`: free_listing_limit_per_month, platform_fee_percent, highlight_price, top_listing_price, ad_campaigns_enabled, points_enabled.
`trust`: require_phone_verification, require_email_verification, smart_id_required_for_high_value, max_unverified_listing_price, auto_hide_reported_listing_threshold.
`ai`: ai_enabled, ai_moderation_enabled, ai_moderation_strictness, ai_title_generation_enabled, ai_description_enabled, ai_price_suggestions_enabled, ai_card_summary_enabled, ai_image_quality_check_enabled, ai_moderation_required_categories.
`payments`: payments_enabled, escrow_enabled, manual_payment_review_threshold.

## 6. Audit log actions wired

- user_ban, user_unban, user_suspend, user_verify
- user_note_add
- listing_status_change, listing_highlight, listing_unhighlight, listing_bulk_*
- category_override_update
- moderation_approve / reject / hide / resolve / dismiss / …
- store_verified / suspended / rejected
- order_manual_review_toggle, order_note_update
- settings_update, content_update, notification_template_update

## 7. Manual test checklist

Automated gates:
- `npx tsc --noEmit` — clean
- `npm run build` — succeeds (3129 modules, ~16s, ~472 KB gzipped)
- `npm run migrate` — applied=9 fresh, skipped=16 on re-run

Manual smoke (22 steps):
1. Non-admin → /admin → redirected
2. Admin → /admin → 15-tab sidebar visible
3. Overview stats show real DB counts + trends + top categories
4. Users: search, ban, suspend, verify, notes → audit log entries appear
5. Listings: filter, single status change, bulk archive
6. Categories: edit LV label, save → GET reflects
7. Moderation queue shows 4 types merged
8. Reports & Disputes: resolve/refund/release → emails + notifications
9. Ads: list, CTR visible, toggle active
10. Orders: filter, flag manual review, add note
11. Stores: verify, suspend
12. AI: toggle moderation, change strictness → audit log
13. Notifications: edit welcome template, preview in LV
14. Content: update home.hero.title → GET /api/content/public returns new value
15. Settings: toggle maintenance_mode → confirm dialog; public site receives `maintenance_mode=true` from /api/content/public
16. Audit log: filter by action `user_ban`, expand row to see before/after
17. Health: all 9 services pill status, no secrets, uptime/version/last_migration visible
18. Dangerous actions (ban, delete, maintenance toggle) prompt ConfirmDialog
19. Moderator-role user → sees 4 tabs only (Overview, Users, Listings, Moderation, Reports)
20. NODE_ENV=production without GEMINI_API_KEY → AI tab shows red banner, admin panel does not crash
21. Public homepage continues to work with empty platform_content (hardcoded fallbacks used)
22. `npm run build` finishes clean

## 8. Remaining recommended improvements

- **Frontend adoption of public content.** `Home.tsx` (and similar) should read `/api/content/public` and merge into its i18n layer. Today it still uses hardcoded defaults — safe but means admin content edits only land on new pages that opt in.
- **Notification template rendering.** `server/services/email.ts` and push utilities should call `NotificationTemplateService.render(key, lang, variables)` and fall back to hardcoded templates when disabled/missing. Right now admin can edit templates but emails still use the legacy hardcoded text.
- **Moderator UI fine-tuning.** Frontend role filter is in place (`adminOnly` flag on tabs), but some moderation actions inside visible tabs (e.g. delete vs. pause) could be hidden for moderator UI. Backend `requireModerator` vs. `requireAdmin` on endpoints is the authoritative gate.
- **Store suspension side effects.** Suspending a store does not hide its listings yet. If desired, add a post-suspend step that flips store listings' `status='paused'`.
- **Bulk order CSV export.** Listed as optional; not implemented.
- **Stripe refund wiring.** Admin dispute resolution flow updates statuses and notifies users but does not trigger a real Stripe refund. This was out-of-scope per the prompt and remains a documented gap.
- **Fine-grained moderator subset inside each tab.** We hide entire tabs; per-action gating (e.g. moderator cannot change role) is enforced by the backend but UI still renders the control. Graying these out is a future polish pass.

## 9. Commands

```bash
npm install                   # if pulling fresh
npm run lint                  # alias for tsc --noEmit
npm run migrate               # apply pending migrations (also auto-applied at boot)
npm run dev                   # start dev server
npm run build                 # production build
```

## 10. Environment notes

No new env vars required. Behaviour:
- GEMINI_API_KEY missing → AI tab shows a red banner; AI endpoints no-op or return 503 as before.
- STRIPE_SECRET_KEY missing → payments module still required (legacy behaviour unchanged).
- MEILISEARCH_HOST / REDIS / TWILIO / RESEND / VAPID / CLOUDINARY — all optional, surfaced in Health tab as "OPTIONAL" or "MISSING".
- JWT_SECRET remains mandatory in production (enforced since Core Stability pack).

**End of report.**
