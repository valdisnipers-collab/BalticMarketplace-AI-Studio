-- Password reset tokens — one-time use, 1h TTL, SHA-256 hash stored (never plaintext)
-- so a DB dump alone does not expose usable reset links.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prt_user_idx
  ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS prt_expires_idx
  ON password_reset_tokens(expires_at)
  WHERE used_at IS NULL;
