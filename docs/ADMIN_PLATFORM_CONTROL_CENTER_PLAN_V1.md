# Admin Platform Control Center — Plan v1

**Status:** Implementation in progress.
**Session date:** 2026-04-24.
**Related report (produced after implementation):** `docs/ADMIN_PLATFORM_CONTROL_CENTER_IMPLEMENTATION_REPORT_V1.md`.

## Goal

Lift BalticMarket's admin experience to a premium SaaS-style internal control
center. Platform owner must be able to manage users, listings, categories,
moderation, ads, orders, stores, AI, notifications, homepage content,
platform settings, audit log, and system health without connecting any new
external services.

## Constraints

- No new external services / dashboards.
- No new dependencies beyond what is already in `package.json`.
- Preserve current design direction (brand `#E64415`, Tailwind v4, shadcn/ui).
- Never reveal secret API key values; show `configured: true/false` only.
- Never allow non-admin to reach admin API (`requireAdmin` / `requireModerator`).
- Audit log every admin write action.
- Dangerous actions require confirmation.
- Prefer soft-archive over destructive delete.
- Admin panel must remain usable when AI / Stripe / Meilisearch / Redis / Twilio
  are not configured.

## Current state (audit findings)

Three parallel Explore agents audited the codebase on 2026-04-24.

### Backend (server/routes/admin.ts — 429 lines, 24 routes)

Already present:
- `/admin/stats` (4 counters)
- `/admin/users` GET / role / DELETE
- `/admin/listings` GET / approve / DELETE
- `/admin/reports` GET / resolve
- `/admin/disputes` GET / resolve
- `/admin/reindex`
- `/admin/ads` full CRUD + stats

Missing: user ban/suspend columns, moderator role, audit log, platform
settings endpoints, notification template management, platform content
management, AI feature-flag endpoints, system health endpoint, orders admin
view, stores admin management, bulk listing actions, admin user notes,
moderation unified queue, moderation action log.

### Frontend (`src/pages/AdminDashboard.tsx` — 1653-line monolith)

7 tabs present: Users, Listings, Reports, Settings (minimal), Ads, Disputes,
Moderation. 8 target modules completely absent: Overview (only 4 stat cards),
Categories, Orders, Stores, AI Controls, Notifications, Content, Audit Log,
System Health.

shadcn/ui primitives available: button, input, select, badge, checkbox, chip,
dialog, dropdown-menu, empty-state, filter-pill, radio-group, section-header,
skeleton, slider, table, card. Missing: tabs, pagination, confirm-dialog,
toast. recharts is already a dependency.

`window.confirm()` + `alert()` used instead of proper dialog/toast.

### Database (26 tables, 7 migrations applied)

Migration runner (`server/migrations/runner.ts`) and pattern are solid. The
existing `settings` table is simple K-V (4 seeded keys) and already consumed
by `wallet.ts`. Recommendation: keep it, add a richer `platform_settings`
table with JSONB value + category + updated_by. Same approach for audit log,
admin notes, moderation actions, system events, platform content,
notification templates.

User table has no ban/suspend columns today. Only `user`, `b2b`, and `admin`
roles exist; `moderator` must be added.

## Scope — 15 modules (all delivered in this session)

1. Overview — real stats + trends + top categories
2. Users — search, filter, ban, suspend, verify, notes, role change (incl. moderator)
3. Listings — search, filter, bulk, status lifecycle, soft-delete, highlight
4. Categories — edit labels/descriptions/flags (canonical IDs locked in code)
5. Moderation Center — unified queue (listings + reports + suspicious messages + disputes)
6. Reports & Disputes — resolve, escalate, admin notes
7. Ads & Promotions — CRUD + placement + CTR + campaign states
8. Orders & Payments — admin list, detail, manual review, notes
9. Stores / B2B — verify, suspend, approve
10. AI Controls — feature toggles, strictness, recent decisions, provider status
11. Notifications — template CRUD, multilingual, preview
12. Homepage / Content — hero, banners, footer links, maintenance notice
13. Platform Settings — ~20 settings grouped by category, typed validation
14. Audit Log — filtered, before/after diff
15. System Health — service configured/not configured (no secrets)

## Permission model

| Role | Tabs visible | Allowed actions |
|---|---|---|
| `admin` | all 15 | full |
| `moderator` | Moderation, Reports, Listings, Users | approve / reject / hide / suspend; no delete, no settings, no role changes |
| `b2b` | none | n/a |
| `user` | none | n/a |

Backend enforces with `requireAdmin` (most routes) or `requireModerator`
(moderation, reports, listing review, user suspend).

## Database changes

9 new migrations (008–016). All idempotent (`IF NOT EXISTS`), tracked via
`schema_migrations`. Seeds included where relevant.

## Implementation phases

Full detail lives in the working plan at
`C:\Users\HomeComputer\.claude\plans\gribu-lai-tu-piesledz-lazy-moler.md`.
This repo-level document is the durable record for future readers.

Phase 0 — Foundation (P1–P4): migrations, services, middleware, UI
primitives, AdminLayout split.
Phase 1 — Overview + Users + Audit Log (P5–P7).
Phase 2 — Listings + Moderation + Categories (P8–P10).
Phase 3 — Reports/Disputes + Orders + Stores (P11–P13).
Phase 4 — Ads + AI Controls (P14–P15).
Phase 5 — Notifications + Content + Settings (P16–P18).
Phase 6 — Health + Moderator completion + docs (P19–P22).

## Testing checklist

22 manual smoke-test steps are recorded in the working plan and mirrored in
the final implementation report.

Automated gates: `npx tsc --noEmit`, `npm run build`, and `npm run migrate`
(idempotent re-runs) after every phase.
