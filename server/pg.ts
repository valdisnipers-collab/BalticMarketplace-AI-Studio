import { Pool, PoolClient } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

function parameterize(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const db = {
  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const { rows } = await pool.query(parameterize(sql), params);
    return (rows[0] as T) ?? null;
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const { rows } = await pool.query(parameterize(sql), params);
    return rows as T[];
  },

  async run(sql: string, params: any[] = []): Promise<{ lastInsertRowid: number; changes: number }> {
    const returningSQL = sql.trim().toUpperCase().startsWith('INSERT')
      ? parameterize(sql) + ' RETURNING id'
      : parameterize(sql);
    const result = await pool.query(returningSQL, params);
    return {
      lastInsertRowid: result.rows[0]?.id ?? 0,
      changes: result.rowCount ?? 0,
    };
  },

  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async query(sql: string, params: any[] = []) {
    return pool.query(parameterize(sql), params);
  },

  clientGet: async <T = any>(client: PoolClient, sql: string, params: any[] = []): Promise<T | null> => {
    const { rows } = await client.query(parameterize(sql), params);
    return (rows[0] as T) ?? null;
  },

  clientRun: async (client: PoolClient, sql: string, params: any[] = []) => {
    const returningSQL = sql.trim().toUpperCase().startsWith('INSERT')
      ? parameterize(sql) + ' RETURNING id'
      : parameterize(sql);
    const result = await client.query(returningSQL, params);
    return { lastInsertRowid: result.rows[0]?.id ?? 0, changes: result.rowCount ?? 0 };
  },
};

export default db;
