import 'dotenv/config';
import { pool } from '../server/pg';

const r = await pool.query('SELECT id, title FROM listings ORDER BY id');
r.rows.forEach((x: any) => console.log(`ID ${x.id}: ${x.title.substring(0, 50)}`));
await pool.end();
