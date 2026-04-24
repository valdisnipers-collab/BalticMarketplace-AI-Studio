-- 006_offers_company_profile_alignment.sql
-- Offer lifecycle states + expiration + status check constraint.
-- Plus: confirm company profile columns on users (they already exist in
-- schema.sql, but verified here for idempotent reruns).

-- Offers: support the full lifecycle per stabilization plan Phase 3.
-- Allowed statuses: pending, accepted, rejected, countered, expired,
-- cancelled, converted_to_order.
ALTER TABLE offers ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS parent_offer_id BIGINT
  REFERENCES offers(id) ON DELETE SET NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS order_id BIGINT
  REFERENCES orders(id) ON DELETE SET NULL;

-- Drop previous constraint (if any) before (re)adding to stay idempotent.
ALTER TABLE offers DROP CONSTRAINT IF EXISTS offers_status_check;
ALTER TABLE offers ADD CONSTRAINT offers_status_check CHECK (status IN (
  'pending', 'accepted', 'rejected', 'countered',
  'expired', 'cancelled', 'converted_to_order'
));

CREATE INDEX IF NOT EXISTS offers_parent_idx ON offers(parent_offer_id);
CREATE INDEX IF NOT EXISTS offers_expires_at_idx ON offers(expires_at);

-- Company profile: columns already exist on users table (see schema.sql).
-- No schema changes needed here; endpoints will be added in route layer.
