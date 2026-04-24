-- 003_messages_security_fields.sql
-- messages.ts POST / INSERT writes these two columns for AI anti-phishing,
-- but they were missing from the production schema, causing silent INSERT
-- failures.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_phishing_warning BOOLEAN
  DEFAULT false;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS system_warning TEXT;
