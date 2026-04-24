-- 012_system_events.sql
-- Lightweight internal event/log table for admin "System Health" view.
-- Filled by SystemEventLogger from error handlers, migration failures,
-- rate-limit triggers, etc. NOT a full logging infrastructure — just
-- enough to surface recent issues in the admin UI without shipping logs
-- out to an external service.

CREATE TABLE IF NOT EXISTS system_events (
  id BIGSERIAL PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_level_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_level_check
  CHECK (level IN ('debug','info','warning','error','critical'));

CREATE INDEX IF NOT EXISTS system_events_created_idx
  ON system_events(created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_level_idx
  ON system_events(level, created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_source_idx
  ON system_events(source, created_at DESC);
