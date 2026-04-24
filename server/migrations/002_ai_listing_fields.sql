-- 002_ai_listing_fields.sql
-- AI moderation + card summary fields on listings. The backend
-- (server/routes/listings.ts moderateListing) already writes these —
-- previously they were ALTER-added at runtime which is fragile.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_moderation_status TEXT
  DEFAULT 'pending';

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_moderation_reason TEXT;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_card_summary TEXT;

-- Index for admin flagged listing filter
CREATE INDEX IF NOT EXISTS listings_ai_moderation_idx
  ON listings(ai_moderation_status);
