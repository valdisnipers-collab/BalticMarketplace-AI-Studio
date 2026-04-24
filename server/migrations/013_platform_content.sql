-- 013_platform_content.sql
-- Admin-editable homepage / footer / banner content. Frontend reads via
-- GET /api/content/public and falls back to current hardcoded defaults if
-- a key is missing, so the live homepage cannot break when content is
-- empty or a key is mistyped.

CREATE TABLE IF NOT EXISTS platform_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_content (key, value) VALUES
  ('home.hero.title',           '"Atklājiet Baltijas labākos piedāvājumus"'::jsonb),
  ('home.hero.subtitle',        '"Ekskluzīvi auto, nekustamie īpašumi un luksusa preces vienuviet."'::jsonb),
  ('home.search.placeholder',   '"Meklēt..."'::jsonb),
  ('banners.maintenance_notice', '""'::jsonb),
  ('footer.links',              '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;
