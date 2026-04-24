-- 011_moderation_actions.sql
-- Fine-grained history of moderation decisions (who, what, why). This is
-- domain-specific whereas admin_audit_log is generic — keeping them
-- separate lets the moderation UI render a focused timeline without
-- JOINing the entire audit table.

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep enums in sync with the moderation UI / AdminModerationTab component.
ALTER TABLE moderation_actions DROP CONSTRAINT IF EXISTS moderation_actions_target_check;
ALTER TABLE moderation_actions ADD CONSTRAINT moderation_actions_target_check
  CHECK (target_type IN ('listing','user','message','report','dispute','store'));

ALTER TABLE moderation_actions DROP CONSTRAINT IF EXISTS moderation_actions_action_check;
ALTER TABLE moderation_actions ADD CONSTRAINT moderation_actions_action_check
  CHECK (action IN (
    'approve','reject','flag','hide','unhide',
    'suspend','ban','unban','warn',
    'delete','restore','request_changes',
    'resolve','dismiss','escalate','note'
  ));

CREATE INDEX IF NOT EXISTS moderation_actions_target_idx
  ON moderation_actions(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_admin_idx
  ON moderation_actions(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_actions_action_idx
  ON moderation_actions(action, created_at DESC);
