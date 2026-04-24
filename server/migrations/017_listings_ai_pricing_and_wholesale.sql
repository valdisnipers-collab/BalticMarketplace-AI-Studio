-- 017_listings_ai_pricing_and_wholesale.sql
-- Adds AI price-guidance columns, B2B wholesale fields, and promotion
-- timestamp columns on listings. All idempotent.
--
-- Pricing guidance (ai_min_price, ai_max_price, ai_price_explanation) is
-- filled by the recommend-price endpoint; UI displays as a hint next to
-- the user's entered price.
--
-- Wholesale (moq, wholesale_price) is only meaningful for b2b sellers;
-- the AddListing UI conditionally exposes it.
--
-- Promotion timestamps (promoted_until, auto_bump_until, last_bumped_at)
-- are written by PromotionService so the ORDER BY in search can prefer
-- currently-promoted listings without a cross-table JOIN.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_min_price DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_max_price DOUBLE PRECISION;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_price_explanation TEXT;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS moq INTEGER DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS wholesale_price DOUBLE PRECISION;

ALTER TABLE listings ADD COLUMN IF NOT EXISTS promoted_until TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS auto_bump_until TIMESTAMPTZ;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS listings_promoted_until_idx
  ON listings(promoted_until)
  WHERE promoted_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_auto_bump_until_idx
  ON listings(auto_bump_until)
  WHERE auto_bump_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS listings_last_bumped_at_idx
  ON listings(last_bumped_at DESC)
  WHERE last_bumped_at IS NOT NULL;
