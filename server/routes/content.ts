// server/routes/content.ts — public read of platform_content.
// Home.tsx and other public pages consume this to render admin-editable
// copy. Falls back gracefully when a key is missing so the frontend keeps
// working with its hardcoded defaults.

import { Router } from 'express';
import db from '../pg';
import * as PlatformSettings from '../services/PlatformSettingsService';

export function createPublicContentRouter() {
  const router = Router();

  // Aggregate: all content + public settings in one payload for the
  // homepage bootstrap.
  router.get('/public', async (_req, res) => {
    try {
      const rows = await db.all<{ key: string; value: any }>(
        `SELECT key, value FROM platform_content`,
      );
      const content: Record<string, unknown> = {};
      for (const r of rows ?? []) content[r.key] = r.value;
      const publicSettings = await PlatformSettings.getPublic();
      res.set('Cache-Control', 'public, max-age=30');
      res.json({ content, settings: publicSettings });
    } catch (error) {
      console.error('[content/public]', error);
      res.json({ content: {}, settings: {} });
    }
  });

  return router;
}
