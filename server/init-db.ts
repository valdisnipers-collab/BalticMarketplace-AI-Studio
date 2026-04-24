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

// init-db applies the base schema.sql (which DROPs the public schema) and
// then delegates incremental alignment to the migration runner. Prefer
// `npm run migrate` for routine updates; only run this script manually on a
// fresh/empty database.

async function initDb() {
  console.log('Initializing PostgreSQL schema...');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await pool.query(schema);
    console.log('✓ Base schema created successfully');

    // Apply every migration so a freshly initialised DB ends up at the same
    // alignment as a long-lived one.
    const { runMigrations } = await import('./migrations/runner');
    const { applied, skipped } = await runMigrations();
    console.log(`✓ Migrations: applied=${applied.length} skipped=${skipped.length}`);
  } catch (error) {
    console.error('Schema error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
