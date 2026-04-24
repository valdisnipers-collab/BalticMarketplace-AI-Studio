// server/routes/admin/settings.ts — platform_settings CRUD for the admin UI.
import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as PlatformSettings from '../../services/PlatformSettingsService';

export function createSettingsRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', async (req, res) => {
    try {
      const category = req.query.category ? String(req.query.category) : undefined;
      const rows = await PlatformSettings.getAll(category);
      // Group by category for the UI.
      const grouped: Record<string, any[]> = {};
      for (const r of rows) {
        (grouped[r.category] ||= []).push(r);
      }
      res.json(grouped);
    } catch (error) {
      console.error('[admin/settings] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/:key', async (req: any, res) => {
    try {
      const key = req.params.key;
      if (!('value' in (req.body ?? {}))) {
        return res.status(400).json({ error: 'value required' });
      }
      await PlatformSettings.set({
        key, value: req.body.value, adminId: req.userId, req,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/settings/:key] PUT', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
