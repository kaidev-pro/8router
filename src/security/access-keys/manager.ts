// 8Router — Access Key Manager
// CRUD operations for virtual 8Router access keys.

import { randomUUID } from 'node:crypto';
import { getDB, type AccessKeyRow } from '../../database.js';
import { generateAccessKey } from './generate.js';
import { assertAccessKeyHashReady, hashAccessKey } from './hash.js';
import { maskAccessKey } from './mask.js';

// ─── Types ────────────────────────────────────────────────────────────

export interface SafeAccessKey {
  id: string;
  name: string;
  keyHint: string;
  status: string;
  isEnabled: boolean;
  projectName: string;
  defaultModelAlias: string;
  allowedProviders: string[];
  allowedModels: string[];
  routingMode: string;
  dailyRequestLimit: number | null;
  monthlyRequestLimit: number | null;
  rateLimitPerMinute: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccessKeyInput {
  name: string;
  projectName?: string;
  defaultModelAlias?: string;
  allowedProviders?: string[];
  allowedModels?: string[];
  routingMode?: string;
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
  rateLimitPerMinute?: number;
  expiresAt?: string;
  isEnabled?: boolean;
}

export interface UpdateAccessKeyInput {
  name?: string;
  projectName?: string;
  defaultModelAlias?: string;
  allowedProviders?: string[];
  allowedModels?: string[];
  routingMode?: string;
  dailyRequestLimit?: number | null;
  monthlyRequestLimit?: number | null;
  rateLimitPerMinute?: number | null;
  expiresAt?: string | null;
  isEnabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function toSafe(row: AccessKeyRow): SafeAccessKey {
  return {
    id: row.id,
    name: row.name,
    keyHint: row.keyHint,
    status: row.status,
    isEnabled: row.isEnabled === 1,
    projectName: row.projectName,
    defaultModelAlias: row.defaultModelAlias,
    allowedProviders: tryParse(row.allowedProviders, []),
    allowedModels: tryParse(row.allowedModels, []),
    routingMode: row.routingMode,
    dailyRequestLimit: row.dailyRequestLimit,
    monthlyRequestLimit: row.monthlyRequestLimit,
    rateLimitPerMinute: row.rateLimitPerMinute,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function tryParse<T>(val: string, fallback: T): T {
  try { return JSON.parse(val); } catch { return fallback; }
}

// ─── CRUD ─────────────────────────────────────────────────────────────

/**
 * Create a new virtual access key.
 * Returns safe record + raw key (shown only once).
 */
export function createAccessKey(input: CreateAccessKeyInput): { accessKey: SafeAccessKey; rawKey: string } {
  assertAccessKeyHashReady();
  const { rawKey, keyPrefix, keyHint } = generateAccessKey();
  const keyHash = hashAccessKey(rawKey);
  const id = randomUUID();
  const now = new Date().toISOString();

  const db = getDB();
  db.prepare(`INSERT INTO access_keys (
    id, userId, name, keyPrefix, keyHash, keyHint, status, isEnabled,
    projectName, defaultModelAlias, allowedProviders, allowedModels,
    routingMode, dailyRequestLimit, monthlyRequestLimit, rateLimitPerMinute,
    expiresAt, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id,
    'local',
    input.name,
    keyPrefix,
    keyHash,
    keyHint,
    'active',
    input.isEnabled !== false ? 1 : 0,
    input.projectName || '',
    input.defaultModelAlias || '8router/auto',
    JSON.stringify(input.allowedProviders || []),
    JSON.stringify(input.allowedModels || []),
    input.routingMode || 'auto',
    input.dailyRequestLimit || null,
    input.monthlyRequestLimit || null,
    input.rateLimitPerMinute || null,
    input.expiresAt || null,
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow;
  return { accessKey: toSafe(row), rawKey };
}

/**
 * List all access keys for a user. Safe fields only.
 */
export function listAccessKeys(): SafeAccessKey[] {
  const db = getDB();
  const rows = db.prepare('SELECT * FROM access_keys ORDER BY createdAt DESC').all() as AccessKeyRow[];
  return rows.map(toSafe);
}

/**
 * Get a single access key by ID.
 */
export function getAccessKeyById(id: string): SafeAccessKey | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow | undefined;
  return row ? toSafe(row) : null;
}

/**
 * Update access key metadata/policy fields.
 */
export function updateAccessKey(id: string, input: UpdateAccessKeyInput): SafeAccessKey | null {
  const db = getDB();
  const existing = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow | undefined;
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: string[] = [];
  const params: any[] = [];

  if (input.name !== undefined) { updates.push('name = ?'); params.push(input.name); }
  if (input.projectName !== undefined) { updates.push('projectName = ?'); params.push(input.projectName); }
  if (input.defaultModelAlias !== undefined) { updates.push('defaultModelAlias = ?'); params.push(input.defaultModelAlias); }
  if (input.allowedProviders !== undefined) { updates.push('allowedProviders = ?'); params.push(JSON.stringify(input.allowedProviders)); }
  if (input.allowedModels !== undefined) { updates.push('allowedModels = ?'); params.push(JSON.stringify(input.allowedModels)); }
  if (input.routingMode !== undefined) { updates.push('routingMode = ?'); params.push(input.routingMode); }
  if (input.dailyRequestLimit !== undefined) { updates.push('dailyRequestLimit = ?'); params.push(input.dailyRequestLimit); }
  if (input.monthlyRequestLimit !== undefined) { updates.push('monthlyRequestLimit = ?'); params.push(input.monthlyRequestLimit); }
  if (input.rateLimitPerMinute !== undefined) { updates.push('rateLimitPerMinute = ?'); params.push(input.rateLimitPerMinute); }
  if (input.expiresAt !== undefined) { updates.push('expiresAt = ?'); params.push(input.expiresAt); }
  if (input.isEnabled !== undefined) { updates.push('isEnabled = ?'); params.push(input.isEnabled ? 1 : 0); }

  if (updates.length === 0) return toSafe(existing);

  updates.push('updatedAt = ?');
  params.push(now);
  params.push(id);

  db.prepare(`UPDATE access_keys SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const row = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow;
  return toSafe(row);
}

/**
 * Revoke an access key (soft disable).
 */
export function revokeAccessKey(id: string): boolean {
  const db = getDB();
  const now = new Date().toISOString();
  const result = db.prepare(
    `UPDATE access_keys SET status = 'revoked', isEnabled = 0, revokedAt = ?, updatedAt = ? WHERE id = ?`
  ).run(now, now, id);
  return result.changes > 0;
}

/**
 * Rotate an access key: generate new key, store new hash, return raw key once.
 */
export function rotateAccessKey(id: string): { accessKey: SafeAccessKey; rawKey: string } | null {
  assertAccessKeyHashReady();
  const db = getDB();
  const existing = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow | undefined;
  if (!existing) return null;

  const { rawKey, keyPrefix, keyHint } = generateAccessKey();
  const keyHash = hashAccessKey(rawKey);
  const now = new Date().toISOString();

  db.prepare(
    `UPDATE access_keys SET keyPrefix = ?, keyHash = ?, keyHint = ?, updatedAt = ? WHERE id = ?`
  ).run(keyPrefix, keyHash, keyHint, now, id);

  const row = db.prepare('SELECT * FROM access_keys WHERE id = ?').get(id) as AccessKeyRow;
  return { accessKey: toSafe(row), rawKey };
}

/**
 * Hard delete an access key.
 */
export function deleteAccessKey(id: string): boolean {
  const db = getDB();
  const result = db.prepare('DELETE FROM access_keys WHERE id = ?').run(id);
  return result.changes > 0;
}
