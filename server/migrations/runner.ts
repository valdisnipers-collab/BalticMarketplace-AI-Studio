// server/migrations/runner.ts
//
// Minimal, idempotent SQL migration runner. Reads every `.sql` file in this
// directory (alphabetically) and applies the ones not yet recorded in the
// `schema_migrations` bookkeeping table. Each migration runs inside its own
// transaction so partial failure cannot leave half-applied schema.
//
// Usage:
//   - `npm run migrate` — standalone entry via `tsx server/migrations/runner.ts`
//   - Imported by `server.ts` startup so production deploys auto-apply

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function appliedNames(): Promise<Set<string>> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations'
  );
  return new Set(rows.map((r) => r.name));
}

function listMigrationFiles(): string[] {
  return readdirSync(__dirname)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  await ensureTable();
  const applied = await appliedNames();
  const files = listMigrationFiles();

  const newlyApplied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = readFileSync(join(__dirname, file), 'utf-8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      newlyApplied.push(file);
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(`[migrate] FAILED ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  return { applied: newlyApplied, skipped };
}

// Allow running the file directly: `tsx server/migrations/runner.ts`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('runner.ts')) {
  runMigrations()
    .then(({ applied, skipped }) => {
      console.log(`[migrate] done. applied=${applied.length} skipped=${skipped.length}`);
      return pool.end();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] failed:', err);
      process.exit(1);
    });
}
