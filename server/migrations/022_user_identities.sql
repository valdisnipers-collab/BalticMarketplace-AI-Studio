-- SSO provider identities. Each row links one user in our DB to one
-- identity at a 3rd-party provider (Google now, Apple/GitHub later).
-- Lookup is primary by (provider, provider_uid); email_at_link is kept
-- for audit and for the email-based secondary linking path.

CREATE TABLE IF NOT EXISTS user_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,          -- 'google' | 'apple' | future
  provider_uid TEXT NOT NULL,      -- stable provider user id (Google `sub`)
  email_at_link TEXT,              -- email reported by provider at link time
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS user_identities_user_idx ON user_identities(user_id);
