-- 001_core_alignment.sql
-- Core schema alignment: columns that the backend already writes to but which
-- were missing from schema.sql. Idempotent — safe to re-run.

-- Listings: view_count (view analytics), quality_score (0-100 calculated),
-- backfill listing_type from legacy attributes.saleType if column empty.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0;

-- Users: trust_score (0-100, default 50), already added via ad-hoc ALTERs
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;

-- Backfill listing_type from attributes.saleType for legacy rows
UPDATE listings
SET listing_type = CASE
  WHEN attributes IS NOT NULL
    AND attributes::text ~ '"saleType"\s*:\s*"auction"'
  THEN 'auction'
  ELSE COALESCE(listing_type, 'sale')
END
WHERE listing_type IS NULL OR listing_type = '';
