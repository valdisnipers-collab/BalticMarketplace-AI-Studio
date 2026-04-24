-- 016_moderator_role_and_stores.sql
-- Two small additions bundled together:
--   1. Enforce the role enum via a CHECK constraint so 'moderator' becomes
--      a first-class value alongside user / b2b / admin.
--   2. Add stores.verification_status so the admin Stores tab can manage
--      b2b verification (unverified / pending / verified / rejected /
--      suspended) without shadow-state in memory.

-- Allowed roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user','b2b','admin','moderator'));

-- Store verification lifecycle
ALTER TABLE stores ADD COLUMN IF NOT EXISTS verification_status TEXT
  DEFAULT 'unverified';
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_verification_status_check;
ALTER TABLE stores ADD CONSTRAINT stores_verification_status_check
  CHECK (verification_status IN ('unverified','pending','verified','rejected','suspended'));
ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS verified_by BIGINT
  REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stores_verification_status_idx
  ON stores(verification_status);

-- Order manual-review flag used by AdminOrdersTab
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_review BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;
