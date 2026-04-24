// server/services/PlatformSettingsService.ts
//
// Typed wrapper around the platform_settings table with a short-lived
// in-memory cache so hot-path feature checks (isFeatureEnabled) don't hit
// the DB on every request. Writes invalidate the cache and append to the
// admin audit log.

import type { Request } from 'express';
import db from '../pg';
import * as AuditLogService from './AuditLogService';

export interface SettingRow {
  key: string;
  value: unknown;
  category: string;
  description: string | null;
  is_public: boolean;
  updated_by: number | null;
  updated_at: string;
}

interface CacheEntry {
  value: unknown;
  expires_at: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function invalidate(key?: string) {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function get<T = unknown>(key: string, defaultValue?: T): Promise<T | undefined> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires_at > now) return hit.value as T;

  const row = await db.get<{ value: unknown }>(
    `SELECT value FROM platform_settings WHERE key = ?`,
    [key],
  );
  if (!row) return defaultValue;

  cache.set(key, { value: row.value, expires_at: now + CACHE_TTL_MS });
  return row.value as T;
}

export async function getAll(category?: string): Promise<SettingRow[]> {
  if (category) {
    return (await db.all<SettingRow>(
      `SELECT * FROM platform_settings WHERE category = ? ORDER BY key ASC`,
      [category],
    )) ?? [];
  }
  return (await db.all<SettingRow>(
    `SELECT * FROM platform_settings ORDER BY category ASC, key ASC`,
  )) ?? [];
}

export async function getPublic(): Promise<Record<string, unknown>> {
  const rows = await db.all<{ key: string; value: unknown }>(
    `SELECT key, value FROM platform_settings WHERE is_public = true`,
  );
  const out: Record<string, unknown> = {};
  for (const r of rows ?? []) out[r.key] = r.value;
  return out;
}

export interface SetArgs {
  key: string;
  value: unknown;
  adminId: number;
  req?: Request;
}

export async function set({ key, value, adminId, req }: SetArgs): Promise<void> {
  const before = await db.get<{ value: unknown }>(
    `SELECT value FROM platform_settings WHERE key = ?`,
    [key],
  );
  await db.run(
    `UPDATE platform_settings
       SET value = ?::jsonb,
           updated_by = ?,
           updated_at = NOW()
     WHERE key = ?`,
    [JSON.stringify(value), adminId, key],
  );
  invalidate(key);
  await AuditLogService.log({
    adminId,
    action: 'settings_update',
    targetType: 'setting',
    targetId: key,
    before: before?.value,
    after: value,
    req,
  });
}

export async function isFeatureEnabled(flag: string): Promise<boolean> {
  const v = await get<boolean>(flag);
  return v === true;
}

// Exposed so admin write endpoints that modify many keys at once can reset
// the cache after a transactional batch.
export function invalidateCache(key?: string) {
  invalidate(key);
}
