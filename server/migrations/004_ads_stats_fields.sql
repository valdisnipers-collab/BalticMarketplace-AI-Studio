-- 004_ads_stats_fields.sql
-- Placement / budget fields on ads table so the admin dashboard can filter
-- by placement and show spend/remaining credits. These are additive — the
-- existing view/click tracking lives in the ad_stats table (unchanged).

ALTER TABLE ads ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'default';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS budget_points INTEGER DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS ads_status_idx ON ads(status);
CREATE INDEX IF NOT EXISTS ads_placement_idx ON ads(placement);
