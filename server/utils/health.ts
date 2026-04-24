// server/utils/health.ts
//
// Snapshot of runtime configuration and service reachability for the
// Admin → System Health tab. Never returns actual secret values — only
// `configured: true/false` plus minimal telemetry.

import fs from 'node:fs';
import path from 'node:path';
import { pool } from '../pg';

export interface ServiceStatus {
  configured: boolean;
  ok?: boolean;
  note?: string;
}

export interface HealthSnapshot {
  db: ServiceStatus;
  ai: ServiceStatus;
  stripe: ServiceStatus;
  meilisearch: ServiceStatus;
  redis: ServiceStatus;
  cloudinary: ServiceStatus;
  twilio: ServiceStatus;
  email: ServiceStatus;
  push: ServiceStatus;
  uptime_seconds: number;
  node_env: string;
  version: string;
  last_migration: string | null;
}

function envSet(...keys: string[]): boolean {
  return keys.every(k => {
    const v = process.env[k];
    return typeof v === 'string' && v.length > 0;
  });
}

async function checkDb(): Promise<ServiceStatus> {
  try {
    await pool.query('SELECT 1');
    return { configured: true, ok: true };
  } catch (e: any) {
    return { configured: true, ok: false, note: e?.message?.slice(0, 200) };
  }
}

async function lastMigration(): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT name FROM schema_migrations ORDER BY executed_at DESC LIMIT 1`,
    );
    return result.rows[0]?.name ?? null;
  } catch {
    return null;
  }
}

function readVersion(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function collectHealth(): Promise<HealthSnapshot> {
  const [db, migration] = await Promise.all([checkDb(), lastMigration()]);
  return {
    db,
    ai: { configured: envSet('GEMINI_API_KEY') },
    stripe: { configured: envSet('STRIPE_SECRET_KEY') },
    meilisearch: { configured: envSet('MEILISEARCH_HOST') },
    redis: { configured: envSet('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN') },
    cloudinary: { configured: envSet('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET') },
    twilio: { configured: envSet('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_VERIFY_SERVICE_SID') },
    email: { configured: envSet('RESEND_API_KEY') },
    push: { configured: envSet('VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY') },
    uptime_seconds: Math.round(process.uptime()),
    node_env: process.env.NODE_ENV || 'development',
    version: readVersion(),
    last_migration: migration,
  };
}
