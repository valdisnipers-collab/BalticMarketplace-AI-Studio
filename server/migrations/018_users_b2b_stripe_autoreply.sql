-- 018_users_b2b_stripe_autoreply.sql
-- B2B / subscription / auto-reply user-level fields.
-- Idempotent.
--
-- auto_reply_enabled + auto_reply_text: consumed by AutoReplyService when
-- another user messages a B2B seller. We intentionally keep the column
-- names identical to the parallel reference project so any imported data
-- lines up one-for-one.
--
-- stripe_customer_id / stripe_subscription_id / b2b_subscription_status:
-- written by the Stripe webhook when a subscription checkout completes,
-- and read by the Stripe Billing Portal session endpoint so users can
-- self-manage their subscription.

ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_reply_enabled INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_reply_text TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS b2b_subscription_status TEXT DEFAULT 'none';

CREATE INDEX IF NOT EXISTS users_stripe_customer_idx
  ON users(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
