// server/services/SystemEventLogger.ts
//
// Fire-and-forget INSERT into system_events. Callers should NOT await the
// returned promise on hot paths — a broken DB connection must not take
// down the code that tried to log the event.

import db from '../pg';

export type Level = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface LogArgs {
  level: Level;
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export function log(args: LogArgs): Promise<void> {
  const { level, source, message, metadata } = args;
  return db.run(
    `INSERT INTO system_events (level, source, message, metadata)
     VALUES (?, ?, ?, ?::jsonb)`,
    [level, source, message.slice(0, 1000), metadata ? JSON.stringify(metadata) : null],
  ).then(() => undefined)
   .catch(err => {
     // Last-resort console fallback so we don't lose critical signals.
     // eslint-disable-next-line no-console
     console.error('[system-events] insert failed', err);
   });
}

export interface ListArgs {
  level?: Level;
  source?: string;
  limit?: number;
}

export async function listRecent(args: ListArgs = {}): Promise<any[]> {
  const limit = Math.min(Math.max(Number(args.limit) || 100, 1), 500);
  let sql = `SELECT * FROM system_events WHERE 1=1`;
  const params: any[] = [];
  if (args.level) { sql += ` AND level = ?`; params.push(args.level); }
  if (args.source) { sql += ` AND source = ?`; params.push(args.source); }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);
  return (await db.all(sql, params)) ?? [];
}
