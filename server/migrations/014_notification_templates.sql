-- 014_notification_templates.sql
-- Admin-editable notification subjects/bodies for email / push / in-app /
-- SMS. NotificationTemplateService.render performs simple {{var}}
-- substitution against a variables map provided by the caller.
--
-- Runtime fallback: if a template is missing or disabled, the caller keeps
-- the hardcoded legacy text in server/services/email.ts. The DB is an
-- override, never a hard dependency.

CREATE TABLE IF NOT EXISTS notification_templates (
  key TEXT PRIMARY KEY,
  title_lv TEXT,
  body_lv TEXT,
  title_ru TEXT,
  body_ru TEXT,
  title_en TEXT,
  body_en TEXT,
  channel TEXT NOT NULL DEFAULT 'email',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notification_templates DROP CONSTRAINT IF EXISTS notification_templates_channel_check;
ALTER TABLE notification_templates ADD CONSTRAINT notification_templates_channel_check
  CHECK (channel IN ('email','push','in_app','sms'));

INSERT INTO notification_templates (key, title_lv, body_lv, title_en, body_en, channel) VALUES
  ('welcome',
    'Laipni lūdzam BalticMarket',
    'Sveiki {{userName}}! Paldies, ka pievienojies BalticMarket. Izveido pirmo sludinājumu, lai sāktu.',
    'Welcome to BalticMarket',
    'Hi {{userName}}! Thanks for joining BalticMarket. Post your first listing to get started.',
    'email'),
  ('listing_approved',
    'Sludinājums apstiprināts',
    'Tavs sludinājums "{{listingTitle}}" ir apstiprināts un redzams platformā.',
    'Listing approved',
    'Your listing "{{listingTitle}}" has been approved and is now live.',
    'email'),
  ('listing_rejected',
    'Sludinājums noraidīts',
    'Tavs sludinājums "{{listingTitle}}" tika noraidīts. Iemesls: {{reason}}.',
    'Listing rejected',
    'Your listing "{{listingTitle}}" was rejected. Reason: {{reason}}.',
    'email'),
  ('offer_received',
    'Jauns piedāvājums',
    'Saņemts piedāvājums €{{amount}} par "{{listingTitle}}".',
    'New offer received',
    'New offer of €{{amount}} on "{{listingTitle}}".',
    'in_app'),
  ('offer_accepted',
    'Piedāvājums pieņemts',
    'Tavs piedāvājums €{{amount}} par "{{listingTitle}}" ir pieņemts.',
    'Offer accepted',
    'Your offer of €{{amount}} on "{{listingTitle}}" was accepted.',
    'in_app'),
  ('offer_rejected',
    'Piedāvājums noraidīts',
    'Tavs piedāvājums par "{{listingTitle}}" tika noraidīts.',
    'Offer rejected',
    'Your offer on "{{listingTitle}}" was rejected.',
    'in_app'),
  ('auction_outbid',
    'Cits pārsolījums',
    'Cits dalībnieks pārsolīja tevi izsolē "{{listingTitle}}". Jaunā likme: €{{amount}}.',
    'You have been outbid',
    'Someone outbid you on "{{listingTitle}}". New bid: €{{amount}}.',
    'push'),
  ('auction_won',
    'Izsole uzvarēta',
    'Apsveicam! Tu uzvarēji izsolē "{{listingTitle}}" ar €{{amount}}.',
    'Auction won',
    'Congratulations! You won the auction "{{listingTitle}}" at €{{amount}}.',
    'email'),
  ('order_created',
    'Jauns pasūtījums',
    'Saņemts jauns pasūtījums #{{orderId}} par "{{listingTitle}}".',
    'New order',
    'New order #{{orderId}} received for "{{listingTitle}}".',
    'email'),
  ('payment_received',
    'Maksājums saņemts',
    'Maksājums €{{amount}} par pasūtījumu #{{orderId}} ir saņemts.',
    'Payment received',
    'Payment of €{{amount}} for order #{{orderId}} received.',
    'email'),
  ('dispute_opened',
    'Atvērts strīds',
    'Pircējs atvēra strīdu par pasūtījumu #{{orderId}}. Iemesls: {{reason}}.',
    'Dispute opened',
    'A dispute was opened on order #{{orderId}}. Reason: {{reason}}.',
    'email')
ON CONFLICT (key) DO NOTHING;
