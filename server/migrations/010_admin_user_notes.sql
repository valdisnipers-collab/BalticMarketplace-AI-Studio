-- 010_admin_user_notes.sql
-- Free-form private notes admins can leave on a user (e.g. context behind a
-- ban, ongoing investigation, past warnings). Not shown to the user.

CREATE TABLE IF NOT EXISTS admin_user_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_user_notes_user_idx
  ON admin_user_notes(user_id, created_at DESC);
