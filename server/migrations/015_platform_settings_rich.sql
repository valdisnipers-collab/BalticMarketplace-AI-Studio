-- 015_platform_settings_rich.sql
-- Richer sibling of the legacy `settings` K-V table. `settings` keeps
-- serving wallet.ts / early_access flows for backward compatibility;
-- `platform_settings` is where the admin Settings tab reads and writes
-- structured values (JSONB) grouped by category.
--
-- Every setting has a safe default here. Callers always go through
-- PlatformSettingsService.get(key, fallback) so the app works even if a
-- row is missing.

CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_settings_category_idx ON platform_settings(category);

INSERT INTO platform_settings (key, value, category, description, is_public) VALUES
  -- General
  ('platform_name',                    '"BalticMarket"'::jsonb,     'general',    'Platform display name',                                 true),
  ('default_language',                 '"lv"'::jsonb,               'general',    'Default UI language code',                              true),
  ('maintenance_mode',                 'false'::jsonb,              'general',    'When true, public site shows maintenance message',      true),
  ('registration_enabled',             'true'::jsonb,               'general',    'Allow new user registration',                            false),
  ('listing_creation_enabled',         'true'::jsonb,               'general',    'Allow new listings to be created',                       false),
  ('chat_enabled',                     'true'::jsonb,               'general',    'Allow users to send chat messages',                      false),
  ('offers_enabled',                   'true'::jsonb,               'general',    'Allow buyers to send offers',                            false),
  ('auctions_enabled',                 'true'::jsonb,               'general',    'Allow auction-type listings',                            false),
  -- Listings
  ('default_listing_expiry_days',      '90'::jsonb,                 'listings',   'How long a listing stays active by default',             false),
  ('max_images_per_listing',           '10'::jsonb,                 'listings',   'Hard cap on images per listing',                         false),
  ('require_moderation_before_publish','false'::jsonb,              'listings',   'New listings must be approved before they are visible',  false),
  ('allow_free_listings',              'true'::jsonb,               'listings',   'Allow listings with price 0',                            false),
  ('allow_exchange_listings',          'true'::jsonb,               'listings',   'Allow exchange-type listings',                           false),
  -- Monetization
  ('free_listing_limit_per_month',     '0'::jsonb,                  'monetization','0 disables the limit',                                  false),
  ('platform_fee_percent',             '5'::jsonb,                  'monetization','Platform fee on completed orders (percent)',            false),
  ('highlight_price',                  '100'::jsonb,                'monetization','Point cost to highlight a listing',                     false),
  ('top_listing_price',                '500'::jsonb,                'monetization','Point cost for top placement',                          false),
  ('ad_campaigns_enabled',             'true'::jsonb,               'monetization','Allow internal ad campaigns',                           false),
  ('points_enabled',                   'true'::jsonb,               'monetization','Enable the points/rewards system',                      false),
  -- Trust and safety
  ('require_phone_verification',       'false'::jsonb,              'trust',      'Users must verify phone before posting',                 false),
  ('require_email_verification',       'false'::jsonb,              'trust',      'Users must verify email before posting',                 false),
  ('smart_id_required_for_high_value', 'false'::jsonb,              'trust',      'Smart-ID required for listings above max_unverified_listing_price', false),
  ('max_unverified_listing_price',     'null'::jsonb,               'trust',      'Price threshold above which extra verification kicks in (null = no threshold)', false),
  ('auto_hide_reported_listing_threshold', '3'::jsonb,              'trust',      'Auto-hide listing after this many pending reports',      false),
  -- AI
  ('ai_enabled',                       'true'::jsonb,               'ai',         'Master AI switch',                                       false),
  ('ai_moderation_enabled',            'true'::jsonb,               'ai',         'Run AI moderation on new listings',                      false),
  ('ai_moderation_strictness',         '"medium"'::jsonb,           'ai',         'low / medium / high',                                    false),
  ('ai_title_generation_enabled',      'true'::jsonb,               'ai',         'Offer AI-generated titles during listing creation',      false),
  ('ai_description_enabled',           'true'::jsonb,               'ai',         'Offer AI-generated descriptions',                        false),
  ('ai_price_suggestions_enabled',     'true'::jsonb,               'ai',         'Offer AI-recommended prices',                            false),
  ('ai_card_summary_enabled',          'true'::jsonb,               'ai',         'Generate short AI summaries per listing card',           false),
  ('ai_image_quality_check_enabled',   'false'::jsonb,              'ai',         'Run AI image quality scoring',                           false),
  ('ai_moderation_required_categories','[]'::jsonb,                 'ai',         'Category ids where AI moderation is mandatory',          false),
  -- Payments
  ('payments_enabled',                 'true'::jsonb,               'payments',   'Allow Stripe-backed checkouts',                          false),
  ('escrow_enabled',                   'false'::jsonb,              'payments',   'Hold funds until buyer confirms delivery',               false),
  ('manual_payment_review_threshold',  '1000'::jsonb,               'payments',   'Flag orders above this amount for manual review',        false),
  -- Moderator role toggle (consumed by AdminLayout for showing the role)
  ('moderator_enabled',                'true'::jsonb,               'general',    'Allow moderator role assignments',                        false)
ON CONFLICT (key) DO NOTHING;
