-- 009_admin_audit_log.sql
-- Records every admin write action so sensitive changes (role updates,
-- listing deletions, settings changes, dispute resolutions) can be
-- reviewed and, if necessary, reversed from database evidence.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_admin_idx
  ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx
  ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx
  ON admin_audit_log(action, created_at DESC);
