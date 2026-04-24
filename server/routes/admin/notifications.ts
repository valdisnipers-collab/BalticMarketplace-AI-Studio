// server/routes/admin/notifications.ts — notification template CRUD + preview.
import { Router } from 'express';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as TemplateService from '../../services/NotificationTemplateService';

export function createNotificationsRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/templates', async (_req, res) => {
    try {
      res.json(await TemplateService.list());
    } catch (error) {
      console.error('[admin/notifications/templates] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/templates/:key', async (req, res) => {
    try {
      const row = await TemplateService.getByKey(req.params.key);
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (error) {
      console.error('[admin/notifications/templates/:key] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/templates/:key', async (req: any, res) => {
    try {
      const updated = await TemplateService.update({
        key: req.params.key,
        fields: req.body ?? {},
        adminId: req.userId,
        req,
      });
      if (!updated) return res.status(404).json({ error: 'Not found' });
      res.json(updated);
    } catch (error) {
      console.error('[admin/notifications/templates/:key] PUT', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.post('/templates/:key/preview', async (req, res) => {
    try {
      const lang = (req.body?.lang ?? 'lv') as TemplateService.Lang;
      const variables = (req.body?.variables ?? {}) as Record<string, unknown>;
      const rendered = await TemplateService.render(req.params.key, lang, variables);
      if (!rendered) return res.status(404).json({ error: 'Template not available for that language' });
      res.json(rendered);
    } catch (error) {
      console.error('[admin/notifications/templates/:key/preview]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
