-- 008_users_ban_status.sql
-- Soft-suspension / ban support on users. Previously the only way to remove
-- a bad actor was DELETE, which orphans all their listings/orders/messages.
-- After this migration admins can suspend (time-limited) or ban (permanent)
-- without destroying data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_reason TEXT;

CREATE INDEX IF NOT EXISTS users_is_banned_idx
  ON users(is_banned) WHERE is_banned = true;

CREATE INDEX IF NOT EXISTS users_suspension_idx
  ON users(suspension_until) WHERE suspension_until IS NOT NULL;
