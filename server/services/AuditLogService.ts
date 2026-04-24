// server/services/AuditLogService.ts
//
// Central entry point for writing admin_audit_log rows. Every admin
// write-endpoint calls AuditLogService.log(...) so the Admin → Audit Log
// tab has a complete trail of who did what, when, and why.
//
// Read helpers power the audit viewer UI with filtering.

import type { Request } from 'express';
import db from '../pg';

export interface AuditLogEntry {
  id: number;
  admin_id: number | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before_value: unknown;
  after_value: unknown;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogArgs {
  adminId: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | number | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  req?: Request;
}

function extractIp(req?: Request): string | null {
  if (!req) return null;
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0];
  return req.ip ?? null;
}

function extractUserAgent(req?: Request): string | null {
  if (!req) return null;
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua.slice(0, 512) : null;
}

export async function log(args: LogArgs): Promise<void> {
  const { adminId, action, targetType, targetId, before, after, reason, req } = args;
  try {
    await db.run(
      `INSERT INTO admin_audit_log
         (admin_id, action, target_type, target_id, before_value, after_value,
          reason, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, ?)`,
      [
        adminId,
        action,
        targetType ?? null,
        targetId != null ? String(targetId) : null,
        before !== undefined ? JSON.stringify(before) : null,
        after !== undefined ? JSON.stringify(after) : null,
        reason ?? null,
        extractIp(req),
        extractUserAgent(req),
      ],
    );
  } catch (e) {
    // Audit must never crash the actual action. Log and swallow.
    console.error('[audit-log]', e);
  }
}

export interface ListArgs {
  adminId?: number;
  action?: string;
  targetType?: string;
  targetId?: string | number;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditEntries(args: ListArgs = {}): Promise<AuditLogEntry[]> {
  const { adminId, action, targetType, targetId, from, to } = args;
  const limit = Math.min(Math.max(Number(args.limit) || 50, 1), 200);
  const offset = Math.max(Number(args.offset) || 0, 0);

  let sql = `SELECT * FROM admin_audit_log WHERE 1=1`;
  const params: any[] = [];
  if (adminId) { sql += ` AND admin_id = ?`; params.push(adminId); }
  if (action) { sql += ` AND action = ?`; params.push(action); }
  if (targetType) { sql += ` AND target_type = ?`; params.push(targetType); }
  if (targetId != null) { sql += ` AND target_id = ?`; params.push(String(targetId)); }
  if (from) { sql += ` AND created_at >= ?`; params.push(from); }
  if (to) { sql += ` AND created_at <= ?`; params.push(to); }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return (await db.all<AuditLogEntry>(sql, params)) ?? [];
}

export async function findByTarget(targetType: string, targetId: string | number): Promise<AuditLogEntry[]> {
  return (await db.all<AuditLogEntry>(
    `SELECT * FROM admin_audit_log
     WHERE target_type = ? AND target_id = ?
     ORDER BY created_at DESC
     LIMIT 100`,
    [targetType, String(targetId)],
  )) ?? [];
}

export async function listDistinctActions(): Promise<string[]> {
  const rows = await db.all<{ action: string }>(
    `SELECT DISTINCT action FROM admin_audit_log ORDER BY action ASC`,
  );
  return (rows ?? []).map(r => r.action);
}
