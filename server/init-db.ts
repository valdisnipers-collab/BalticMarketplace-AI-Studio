import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pg';

if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: init-db must not run in production. Aborting.');
  process.exit(1);
}

if (!process.argv.includes('--force')) {
  console.error('FATAL: init-db DROPS ALL DATA. Run with --force flag only on an empty database.');
  console.error('For schema migrations only, edit runMigrations() directly.');
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  // listing_drafts (Phase 2)
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

  // quality_score uz listings (Phase 2)
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT 0
  `);

  // trust_score uz users (Phase 2)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50
  `);

  console.log('[MIGRATION] Phase 2 schema additions applied');

  // view_count for popular sort (Phase 3)
  await pool.query(`
    ALTER TABLE listings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0
  `);
  console.log('[MIGRATION] view_count column added');
}

async function initDb() {
  console.log('Initializing PostgreSQL schema...');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await pool.query(schema);
    console.log('✓ Schema created successfully');
    await runMigrations();
  } catch (error) {
    console.error('Schema error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
