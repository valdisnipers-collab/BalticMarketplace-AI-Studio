import 'dotenv/config';
import { pool } from '../server/pg';

async function main() {
  console.log('[MIGRATE] Running Phase 2 migrations...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listing_drafts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS listing_drafts_user_idx ON listing_drafts(user_id)
  `);
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50
  `);

  console.log('[MIGRATE] Phase 2 migrations applied successfully');
  await pool.end();
  process.exit(0);
}

main().catch(e => {
  console.error('[MIGRATE] Failed:', e);
  process.exit(1);
});
