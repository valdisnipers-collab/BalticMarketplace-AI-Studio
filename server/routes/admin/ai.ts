// server/routes/admin/ai.ts — AI feature flags + recent moderation decisions.
import { Router } from 'express';
import db from '../../pg';
import { requireAdmin } from '../../middleware/requireAdmin';
import * as PlatformSettings from '../../services/PlatformSettingsService';

const AI_FLAG_KEYS = [
  'ai_enabled',
  'ai_moderation_enabled',
  'ai_moderation_strictness',
  'ai_title_generation_enabled',
  'ai_description_enabled',
  'ai_price_suggestions_enabled',
  'ai_card_summary_enabled',
  'ai_image_quality_check_enabled',
  'ai_moderation_required_categories',
];

export function createAIRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get('/settings', async (_req, res) => {
    try {
      const out: Record<string, unknown> = {};
      for (const k of AI_FLAG_KEYS) out[k] = await PlatformSettings.get(k);
      out.provider_configured = !!process.env.GEMINI_API_KEY;
      res.json(out);
    } catch (error) {
      console.error('[admin/ai/settings] GET', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.put('/settings', async (req: any, res) => {
    try {
      const updates = req.body ?? {};
      for (const k of AI_FLAG_KEYS) {
        if (k in updates) {
          await PlatformSettings.set({ key: k, value: updates[k], adminId: req.userId, req });
        }
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('[admin/ai/settings] PUT', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/recent-decisions', async (_req, res) => {
    try {
      const rows = await db.all(
        `SELECT id, title, category, ai_moderation_status, ai_moderation_reason,
                ai_trust_score, created_at, updated_at
         FROM listings
         WHERE ai_moderation_status IS NOT NULL
           AND ai_moderation_status <> 'pending'
         ORDER BY updated_at DESC
         LIMIT 50`,
      );
      res.json(rows ?? []);
    } catch (error) {
      console.error('[admin/ai/recent-decisions]', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
}
