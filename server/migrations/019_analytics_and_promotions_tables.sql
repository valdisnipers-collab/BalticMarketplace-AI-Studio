-- 019_analytics_and_promotions_tables.sql
-- Three time-series / audit-lite tables:
--
--   * listing_view_stats — one row per (listing, day). Upserted by the
--     view-tracking endpoint so B2B sellers can graph real view trends.
--   * listing_promotions — full history of paid promotions so admins can
--     reconstruct who spent which points on what and when.
--   * user_daily_stats — seller-level daily totals (views, revenue)
--     populated by view-tracking and order-completion paths.
--
-- Also seeds three platform_settings keys for promotion pricing.
-- Idempotent.

CREATE TABLE IF NOT EXISTS listing_view_stats (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER NOT NULL DEFAULT 0,
  UNIQUE(listing_id, date)
);

CREATE INDEX IF NOT EXISTS listing_view_stats_listing_date_idx
  ON listing_view_stats(listing_id, date DESC);

CREATE TABLE IF NOT EXISTS listing_promotions (
  id BIGSERIAL PRIMARY KEY,
  listing_id BIGINT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  points_spent INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE listing_promotions DROP CONSTRAINT IF EXISTS listing_promotions_type_check;
ALTER TABLE listing_promotions ADD CONSTRAINT listing_promotions_type_check
  CHECK (type IN ('highlight','bump','auto_bump'));

CREATE INDEX IF NOT EXISTS listing_promotions_listing_idx
  ON listing_promotions(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS listing_promotions_expires_idx
  ON listing_promotions(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  views INTEGER DEFAULT 0,
  revenue DOUBLE PRECISION DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS user_daily_stats_user_date_idx
  ON user_daily_stats(user_id, date DESC);

-- Promotion price defaults. The admin Settings tab can override these.
INSERT INTO platform_settings (key, value, category, description) VALUES
  ('highlight_price_points', '100'::jsonb, 'monetization', 'Points to highlight a listing'),
  ('bump_price_points',      '50'::jsonb,  'monetization', 'Points to bump a listing to top'),
  ('auto_bump_price_points', '250'::jsonb, 'monetization', 'Points for weekly auto-bump')
ON CONFLICT (key) DO NOTHING;
