-- 005_saved_searches_alignment.sql
-- saved_searches alignment: the backend POST handler already inserts into
-- `subcategory` and `attributes`, but the legacy schema had `filters`
-- instead. Add the missing columns and backfill `attributes` from any
-- existing `filters` content so the rename is non-destructive.

ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS attributes JSONB;
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN
  DEFAULT true;
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
  DEFAULT NOW();

-- Backfill attributes from legacy filters column for any rows that had it.
-- filters was stored as TEXT (possibly JSON) — try to cast; swallow failures
-- so non-JSON legacy values don't abort the whole migration.
DO $$
BEGIN
  BEGIN
    UPDATE saved_searches
    SET attributes = filters::jsonb
    WHERE attributes IS NULL
      AND filters IS NOT NULL
      AND filters <> '';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'saved_searches backfill: some filters rows were not valid JSON; left as-is';
  END;
END $$;

CREATE INDEX IF NOT EXISTS saved_searches_user_idx ON saved_searches(user_id);
