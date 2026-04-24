-- TOTP 2FA: adds opt-in second factor to the users table plus a table of
-- one-time recovery codes. The TOTP secret is stored encrypted (AES-256-GCM)
-- so a DB dump alone cannot be used to generate codes.

ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret_enc TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS totp_recovery_codes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS totp_recovery_user_idx
  ON totp_recovery_codes(user_id)
  WHERE used_at IS NULL;
