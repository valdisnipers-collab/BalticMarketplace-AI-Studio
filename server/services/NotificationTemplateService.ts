// server/services/NotificationTemplateService.ts
//
// Thin DB-backed override layer for notification copy (email subjects and
// bodies, push titles, in-app messages). When a template is disabled or
// missing the caller keeps its hardcoded fallback — the DB is a pure
// customization layer, never a hard dependency.

import type { Request } from 'express';
import db from '../pg';
import * as AuditLogService from './AuditLogService';

export type Lang = 'lv' | 'ru' | 'en';
export type Channel = 'email' | 'push' | 'in_app' | 'sms';

export interface TemplateRow {
  key: string;
  title_lv: string | null;
  body_lv: string | null;
  title_ru: string | null;
  body_ru: string | null;
  title_en: string | null;
  body_en: string | null;
  channel: Channel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function list(): Promise<TemplateRow[]> {
  return (await db.all<TemplateRow>(
    `SELECT * FROM notification_templates ORDER BY key ASC`,
  )) ?? [];
}

export async function getByKey(key: string): Promise<TemplateRow | null> {
  return (await db.get<TemplateRow>(
    `SELECT * FROM notification_templates WHERE key = ?`,
    [key],
  )) ?? null;
}

function pickLang(row: TemplateRow, lang: Lang): { title: string; body: string } | null {
  const title = row[`title_${lang}` as const] ?? row.title_lv;
  const body = row[`body_${lang}` as const] ?? row.body_lv;
  if (!title && !body) return null;
  return { title: title ?? '', body: body ?? '' };
}

function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name) => {
    const v = variables[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

export interface RenderResult {
  title: string;
  body: string;
  channel: Channel;
}

/**
 * Attempt to render a template by key. Returns null if the template is
 * missing, disabled, or has no content for the requested language — caller
 * should then fall back to its hardcoded text.
 */
export async function render(
  key: string,
  lang: Lang,
  variables: Record<string, unknown> = {},
): Promise<RenderResult | null> {
  const row = await getByKey(key);
  if (!row || !row.is_enabled) return null;
  const picked = pickLang(row, lang);
  if (!picked) return null;
  return {
    title: interpolate(picked.title, variables),
    body: interpolate(picked.body, variables),
    channel: row.channel,
  };
}

export interface UpdateArgs {
  key: string;
  fields: Partial<Omit<TemplateRow, 'key' | 'created_at' | 'updated_at'>>;
  adminId: number;
  req?: Request;
}

export async function update({ key, fields, adminId, req }: UpdateArgs): Promise<TemplateRow | null> {
  const before = await getByKey(key);
  if (!before) return null;

  const allowed: (keyof TemplateRow)[] = [
    'title_lv','body_lv','title_ru','body_ru','title_en','body_en','channel','is_enabled',
  ];
  const sets: string[] = [];
  const params: any[] = [];
  for (const k of allowed) {
    if (k in fields) {
      sets.push(`${k} = ?`);
      params.push((fields as any)[k]);
    }
  }
  if (sets.length === 0) return before;
  sets.push(`updated_at = NOW()`);
  params.push(key);

  await db.run(
    `UPDATE notification_templates SET ${sets.join(', ')} WHERE key = ?`,
    params,
  );
  const after = await getByKey(key);
  await AuditLogService.log({
    adminId,
    action: 'notification_template_update',
    targetType: 'notification_template',
    targetId: key,
    before,
    after,
    req,
  });
  return after;
}
