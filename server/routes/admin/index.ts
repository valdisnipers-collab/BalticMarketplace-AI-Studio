// server/routes/admin/index.ts
//
// Admin Control Center — additional sub-routers for the 15-module control
// center that are NOT already covered by the legacy server/routes/admin.ts
// file. Legacy admin.ts keeps handling overview/stats, basic users, basic
// listings, reports, disputes, ads, and reindex. Everything new lives here.
//
// Mounted in server.ts as `app.use('/api/admin', createAdminExtendedRouter({io}))`
// — URLs stay under `/api/admin/...` to match the existing convention.

import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';

import { createAuditRouter } from './audit';
import { createSettingsRouter } from './settings';
import { createContentRouter } from './content';
import { createNotificationsRouter as createAdminNotificationsRouter } from './notifications';
import { createModerationRouter } from './moderation';
import { createStoresRouter as createAdminStoresRouter } from './stores';
import { createAIRouter } from './ai';
import { createHealthRouter } from './health';
import { createOrdersRouter as createAdminOrdersRouter } from './orders';
import { createUsersExtendedRouter } from './users-extended';
import { createListingsExtendedRouter } from './listings-extended';
import { createCategoriesRouter } from './categories';
import { createOverviewRouter } from './overview';

export function createAdminExtendedRouter(deps: { io: SocketIOServer }) {
  const router = Router();

  // Overview — enhanced stats + trends (separate from legacy /admin/stats)
  router.use('/admin/overview', createOverviewRouter());

  // Users extended — ban / suspend / verify / notes
  router.use('/admin/users', createUsersExtendedRouter({ io: deps.io }));

  // Listings extended — bulk / status lifecycle
  router.use('/admin/listings', createListingsExtendedRouter());

  // Categories label overrides (canonical IDs remain code-locked)
  router.use('/admin/categories', createCategoriesRouter());

  // Moderation unified queue
  router.use('/admin/moderation', createModerationRouter());

  // Orders admin view
  router.use('/admin/orders', createAdminOrdersRouter());

  // Stores admin management
  router.use('/admin/stores', createAdminStoresRouter());

  // AI controls (feature flags + recent decisions)
  router.use('/admin/ai', createAIRouter());

  // Notification templates
  router.use('/admin/notifications', createAdminNotificationsRouter());

  // Platform content (homepage, banners, footer)
  router.use('/admin/content', createContentRouter());

  // Platform settings
  router.use('/admin/settings', createSettingsRouter());

  // Audit log viewer
  router.use('/admin/audit', createAuditRouter());

  // System health
  router.use('/admin/health', createHealthRouter());

  return router;
}
