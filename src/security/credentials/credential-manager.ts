// 8Router — Provider Credential Management
// CRUD for encrypted provider credentials stored in SQLite.

import { getDB, type ConnectionRow } from '../../database.js';
import { encrypt, decrypt, isEncrypted } from './encrypt.js';
import { maskCredential, sanitizeError } from './redact.js';
import crypto from 'crypto';

export interface SafeCredential {
  id: string;
  provider: string;
  displayName: string;
  credentialHint: string;
  credentialType: string;
  baseUrl: string | null;
  status: string;
  isEnabled: boolean;
  lastTestedAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialInput {
  provider: string;
  displayName?: string;
  apiKey: string;
  baseUrl?: string;
  isEnabled?: boolean;
}

export interface UpdateCredentialInput {
  displayName?: string;
  baseUrl?: string;
  isEnabled?: boolean;
  apiKey?: string; // if provided, rotate credential
}

// ─── Column migration ────────────────────────────────────────────────

let migrated = false;

function ensureColumns(): void {
  if (migrated) return;
  const db = getDB();
  // Add new columns if they don't exist
  const pragma = db.prepare('PRAGMA table_info(connections)').all() as { name: string }[];
  const cols = new Set(pragma.map(c => c.name));
  if (!cols.has('encryptedCredential')) {
    db.exec('ALTER TABLE connections ADD COLUMN encryptedCredential TEXT');
  }
  if (!cols.has('credentialHint')) {
    db.exec('ALTER TABLE connections ADD COLUMN credentialHint TEXT');
  }
  if (!cols.has('credentialType')) {
    db.exec("ALTER TABLE connections ADD COLUMN credentialType TEXT DEFAULT 'api_key'");
  }
  migrated = true;
}

// ─── CRUD ────────────────────────────────────────────────────────────

export function getAllCredentials(): SafeCredential[] {
  ensureColumns();
  const db = getDB();
  const rows = db.prepare(
    'SELECT id, provider, name, credentialHint, credentialType, baseUrl, testStatus, isActive, lastError, lastErrorAt, createdAt, updatedAt FROM connections ORDER BY provider, createdAt'
  ).all() as any[];
  return rows.map(toSafeCredential);
}

export function getCredentialsByProvider(provider: string): SafeCredential[] {
  ensureColumns();
  const db = getDB();
  const rows = db.prepare(
    'SELECT id, provider, name, credentialHint, credentialType, baseUrl, testStatus, isActive, lastError, lastErrorAt, createdAt, updatedAt FROM connections WHERE provider = ? ORDER BY createdAt'
  ).all(provider) as any[];
  return rows.map(toSafeCredential);
}

export function getCredentialById(id: string): SafeCredential | null {
  ensureColumns();
  const db = getDB();
  const row = db.prepare(
    'SELECT id, provider, name, credentialHint, credentialType, baseUrl, testStatus, isActive, lastError, lastErrorAt, createdAt, updatedAt FROM connections WHERE id = ?'
  ).get(id) as any;
  return row ? toSafeCredential(row) : null;
}

export function getDecryptedCredential(id: string): string | null {
  ensureColumns();
  const db = getDB();
  const row = db.prepare('SELECT apiKey, encryptedCredential FROM connections WHERE id = ?').get(id) as any;
  if (!row) return null;
  // New encrypted path
  if (row.encryptedCredential && isEncrypted(row.encryptedCredential)) {
    return decrypt(row.encryptedCredential);
  }
  // Legacy plain text (auto-migrate)
  if (row.apiKey && !isEncrypted(row.apiKey)) {
    return row.apiKey;
  }
  return null;
}

export function createCredential(input: CreateCredentialInput): SafeCredential {
  ensureColumns();
  const db = getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const encrypted = encrypt(input.apiKey);
  const hint = maskCredential(input.apiKey);
  const credType = input.baseUrl && !input.apiKey ? 'local_endpoint' : 'api_key';

  db.prepare(`
    INSERT INTO connections (id, provider, name, authType, apiKey, encryptedCredential, credentialHint, credentialType, baseUrl, isActive, testStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.provider,
    input.displayName || input.provider,
    'apikey',
    'encrypted', // overwrite plaintext placeholder
    encrypted,
    hint,
    credType,
    input.baseUrl || null,
    input.isEnabled !== false ? 1 : 0,
    'untested',
    now, now
  );

  return getCredentialById(id)!;
}

export function updateCredential(id: string, input: UpdateCredentialInput): SafeCredential | null {
  ensureColumns();
  const db = getDB();
  const now = new Date().toISOString();
  const sets: string[] = [];
  const values: any[] = [];

  if (input.displayName !== undefined) {
    sets.push('name = ?');
    values.push(input.displayName);
  }
  if (input.baseUrl !== undefined) {
    sets.push('baseUrl = ?');
    values.push(input.baseUrl);
  }
  if (input.isEnabled !== undefined) {
    sets.push('isActive = ?');
    values.push(input.isEnabled ? 1 : 0);
  }
  if (input.apiKey !== undefined) {
    // Rotate credential
    sets.push('encryptedCredential = ?');
    values.push(encrypt(input.apiKey));
    sets.push('credentialHint = ?');
    values.push(maskCredential(input.apiKey));
    sets.push('apiKey = ?');
    values.push('encrypted');
    sets.push('testStatus = ?');
    values.push('untested');
  }

  if (sets.length === 0) return getCredentialById(id);
  sets.push('updatedAt = ?');
  values.push(now);
  values.push(id);

  db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getCredentialById(id);
}

export function deleteCredential(id: string): boolean {
  ensureColumns();
  const db = getDB();
  const result = db.prepare('DELETE FROM connections WHERE id = ?').run(id);
  return result.changes > 0;
}

export function setCredentialStatus(id: string, status: string, error?: string): void {
  ensureColumns();
  const db = getDB();
  const now = new Date().toISOString();
  if (status === 'connected') {
    db.prepare(
      'UPDATE connections SET testStatus = ?, lastError = NULL, lastErrorAt = NULL, updatedAt = ? WHERE id = ?'
    ).run(status, now, id);
  } else {
    db.prepare(
      'UPDATE connections SET testStatus = ?, lastError = ?, lastErrorAt = ?, updatedAt = ? WHERE id = ?'
    ).run(status, sanitizeError(error || 'Unknown error'), now, now, id);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function toSafeCredential(row: any): SafeCredential {
  return {
    id: row.id,
    provider: row.provider,
    displayName: row.name || row.provider,
    credentialHint: row.credentialHint || '****',
    credentialType: row.credentialType || 'api_key',
    baseUrl: row.baseUrl || null,
    status: row.testStatus || 'untested',
    isEnabled: row.isActive === 1,
    lastTestedAt: null,
    lastSuccessAt: null,
    lastErrorAt: row.lastErrorAt || null,
    lastErrorMessage: row.lastError ? sanitizeError(row.lastError) : null,
    createdAt: row.createdAt || new Date().toISOString(),
    updatedAt: row.updatedAt || new Date().toISOString(),
  };
}
