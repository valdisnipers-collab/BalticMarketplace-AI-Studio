// server/routes/admin/categories.ts
//
// Admin can override the display labels and flags for the canonical
// categories defined in src/constants/categories.ts / server/utils/categories.ts.
// Canonical ids themselves are NOT editable from the UI — they are
// referenced in data (listings.category, saved_searches.category) and in
// migration 007. Editing them via the API would break those references.
//
// Overrides are stored in platform_content with keys
//   category_override.<id> = { label_lv, label_ru, label_en, description_lv,
//                               description_ru, sort_order, is_active,
//                               show_on_homepage, allowed_listing_types }

import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as AuditLogService from '../../services/AuditLogService';
import { CATEGORIES } from '../../utils/categories';

function overrideKey(id: string) {
  return `category_override.${id}`;
}

export function createCategoriesRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (_req, res) => {
    try {
      const rows = await db.all<{ key: string; value: any }>(
        `SELECT key, value FROM platform_content WHERE key LIKE 'category_override.%'`,
      );
      const overrides = new Map<string, any>();
      for (const r of rows ?? []) {
        const id = r.key.slice('category_override.'.length);
        overrides.set(id, r.value);
      }
      const out = CATEGORIES.map(c => ({
        ...c,
        is_active: overrides.get(c.id)?.is_active ?? true,
        show_on_homepage: overrides.get(c.id)?.show_on_homepage ?? true,
        sort_order: overrides.get(c.id)?.sort_order ?? null,
        description_lv: overrides.get(c.id)?.description_lv ?? null,
        description_ru: overrides.get(c.id)?.description_ru ?? null,
        allowed_listing_types: overrides.get(c.id)?.allowed_listing_types ?? null,
        // If labels were overridden, surface them
        label_lv: overrides.get(c.id)?.label_lv ?? c.label_lv,
        label_ru: overrides.get(c.id)?.label_ru ?? c.label_ru,
        label_en: overrides.get(c.id)?.label_en ?? c.label_en,
      }));
      res.json(out);
    } catch (error) {
      console.error('[admin/categories] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/:id', async (req: any, res) => {
    try {
      const id = String(req.params.id);
      if (!CATEGORIES.find(c => c.id === id)) return res.status(404).json({ error: 'Unknown category id' });

      const allowed = ['label_lv','label_ru','label_en','description_lv','description_ru','sort_order','is_active','show_on_homepage','allowed_listing_types'];
      const payload: Record<string, unknown> = {};
      for (const k of allowed) if (k in (req.body ?? {})) payload[k] = req.body[k];

      const key = overrideKey(id);
      const before = await db.get<{ value: any }>(`SELECT value FROM platform_content WHERE key = ?`, [key]);

      await db.run(
        `INSERT INTO platform_content (key, value, updated_by, updated_at)
         VALUES (?, ?::jsonb, ?, NOW())
         ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()
         RETURNING key`,
        [key, JSON.stringify(payload), req.userId],
      );

      await AuditLogService.log({
        adminId: req.userId, action: 'category_override_update',
        targetType: 'category', targetId: id, before: before?.value, after: payload, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/categories/:id] PUT', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
