import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function initDb() {
  console.log('Initializing PostgreSQL schema...');
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  try {
    await pool.query(schema);
    console.log('✓ Schema created successfully');
  } catch (error) {
    console.error('Schema error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initDb();
