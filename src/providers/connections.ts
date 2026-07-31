import crypto from 'crypto';
import type Database from 'better-sqlite3';
import { getDB } from '../database.js';
import { encrypt, decrypt } from '../security/credentials/encrypt.js';
import { maskCredential, sanitizeError } from '../security/credentials/redact.js';

export type ProviderConnectionAuthType = 'api_key' | 'oauth' | 'cookie' | 'custom';
export type ProviderConnectionStatus = 'active' | 'disabled' | 'degraded' | 'cooldown' | 'expired' | 'error';

export interface ProviderConnectionMetadata {
  id: string; providerId: string; label: string; authType: ProviderConnectionAuthType;
  credentialVersion: string; credentialHint: string; status: ProviderConnectionStatus;
  priority: number; weight: number; accountRef: string | null; expiresAt: string | null;
  refreshable: boolean; cooldownUntil: string | null; lastSuccessAt: string | null;
  lastFailureAt: string | null; failureCount: number; quotaRemaining: number | null;
  quotaLimit: number | null; quotaResetAt: string | null; discoveredModels: string[];
  metadata: Record<string, unknown>; createdAt: string; updatedAt: string;
}

export interface CreateProviderConnectionInput {
  providerId: string; label?: string; authType: ProviderConnectionAuthType; rawCredential: string;
  credentialVersion?: string; status?: ProviderConnectionStatus; priority?: number; weight?: number;
  accountRef?: string | null; expiresAt?: string | null; refreshable?: boolean;
  cooldownUntil?: string | null; quotaRemaining?: number | null; quotaLimit?: number | null;
  quotaResetAt?: string | null; discoveredModels?: string[]; metadata?: Record<string, unknown>;
}

export type UpdateProviderConnectionMetadataInput = Partial<Omit<CreateProviderConnectionInput, 'rawCredential'>>;
interface Row extends Omit<ProviderConnectionMetadata, 'refreshable' | 'discoveredModels' | 'metadata'> { encryptedCredential: string; refreshable: number; discoveredModels: string; metadata: string; }
export interface LegacyProviderConnectionMapping { legacyId: string; providerId: string; label: string; authType: ProviderConnectionAuthType; status: ProviderConnectionStatus; accountRef: string | null; unmappableFields: string[]; }
let migrated = false;

export function isProviderConnectionRuntimeEnabled(): boolean { return process.env.PROVIDER_CONNECTION_RUNTIME_ENABLED === 'true'; }

export function ensureProviderConnectionsSchema(db: Database.Database = getDB()): void {
  if (migrated) return;
  db.transaction(() => db.exec(`
    CREATE TABLE IF NOT EXISTS provider_connections (
      id TEXT PRIMARY KEY,
      providerId TEXT NOT NULL,
      label TEXT NOT NULL,
      authType TEXT NOT NULL CHECK (authType IN ('api_key','oauth','cookie','custom')),
      encryptedCredential TEXT NOT NULL,
      credentialVersion TEXT NOT NULL DEFAULT 'enc:v1',
      credentialHint TEXT NOT NULL DEFAULT '****',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled','degraded','cooldown','expired','error')),
      priority INTEGER NOT NULL DEFAULT 100,
      weight INTEGER NOT NULL DEFAULT 1,
      accountRef TEXT,
      expiresAt TEXT,
      refreshable INTEGER NOT NULL DEFAULT 0,
      cooldownUntil TEXT,
      lastSuccessAt TEXT,
      lastFailureAt TEXT,
      failureCount INTEGER NOT NULL DEFAULT 0,
      quotaRemaining INTEGER,
      quotaLimit INTEGER,
      quotaResetAt TEXT,
      discoveredModels TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pc_provider ON provider_connections(providerId);
    CREATE INDEX IF NOT EXISTS idx_pc_status ON provider_connections(status);
    CREATE INDEX IF NOT EXISTS idx_pc_priority ON provider_connections(priority);
    CREATE INDEX IF NOT EXISTS idx_pc_cooldown ON provider_connections(cooldownUntil);
    CREATE INDEX IF NOT EXISTS idx_pc_expires ON provider_connections(expiresAt);
  `))();
  migrated = true;
}

function json(v: unknown): string { return JSON.stringify(v ?? null); }
function arr(s: string): string[] { try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v.map(String) : []; } catch { return []; } }
function obj(s: string): Record<string, unknown> { try { const v = JSON.parse(s || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; } }
function meta(r: Row): ProviderConnectionMetadata { return { id:r.id, providerId:r.providerId, label:r.label, authType:r.authType, credentialVersion:r.credentialVersion, credentialHint:r.credentialHint || '****', status:r.status, priority:r.priority, weight:r.weight, accountRef:r.accountRef, expiresAt:r.expiresAt, refreshable:r.refreshable===1, cooldownUntil:r.cooldownUntil, lastSuccessAt:r.lastSuccessAt, lastFailureAt:r.lastFailureAt, failureCount:r.failureCount, quotaRemaining:r.quotaRemaining, quotaLimit:r.quotaLimit, quotaResetAt:r.quotaResetAt, discoveredModels:arr(r.discoveredModels), metadata:obj(r.metadata), createdAt:r.createdAt, updatedAt:r.updatedAt }; }

export function createConnection(input: CreateProviderConnectionInput): ProviderConnectionMetadata {
  ensureProviderConnectionsSchema();
  if (!input.rawCredential) throw new Error('Provider connection credential is required');
  const now = new Date().toISOString(); const id = crypto.randomUUID();
  const row = { id, providerId: input.providerId, label: input.label || input.providerId, authType: input.authType, encryptedCredential: encrypt(input.rawCredential), credentialVersion: input.credentialVersion || 'enc:v1', credentialHint: maskCredential(input.rawCredential), status: input.status || 'active', priority: input.priority ?? 100, weight: input.weight ?? 1, accountRef: input.accountRef ?? null, expiresAt: input.expiresAt ?? null, refreshable: input.refreshable ? 1 : 0, cooldownUntil: input.cooldownUntil ?? null, lastSuccessAt: null, lastFailureAt: null, failureCount: 0, quotaRemaining: input.quotaRemaining ?? null, quotaLimit: input.quotaLimit ?? null, quotaResetAt: input.quotaResetAt ?? null, discoveredModels: json(input.discoveredModels || []), metadata: json(input.metadata || {}), createdAt: now, updatedAt: now };
  getDB().prepare(`INSERT INTO provider_connections (id,providerId,label,authType,encryptedCredential,credentialVersion,credentialHint,status,priority,weight,accountRef,expiresAt,refreshable,cooldownUntil,lastSuccessAt,lastFailureAt,failureCount,quotaRemaining,quotaLimit,quotaResetAt,discoveredModels,metadata,createdAt,updatedAt) VALUES (@id,@providerId,@label,@authType,@encryptedCredential,@credentialVersion,@credentialHint,@status,@priority,@weight,@accountRef,@expiresAt,@refreshable,@cooldownUntil,@lastSuccessAt,@lastFailureAt,@failureCount,@quotaRemaining,@quotaLimit,@quotaResetAt,@discoveredModels,@metadata,@createdAt,@updatedAt)`).run(row);
  return getConnectionMetadataById(id)!;
}

export function getConnectionMetadataById(id: string): ProviderConnectionMetadata | null { ensureProviderConnectionsSchema(); const r = getDB().prepare('SELECT * FROM provider_connections WHERE id = ?').get(id) as Row | undefined; return r ? meta(r) : null; }
export function listConnections(): ProviderConnectionMetadata[] { ensureProviderConnectionsSchema(); return (getDB().prepare('SELECT * FROM provider_connections ORDER BY priority ASC, weight DESC, createdAt ASC').all() as Row[]).map(meta); }
export function listConnectionsByProvider(providerId: string): ProviderConnectionMetadata[] { ensureProviderConnectionsSchema(); return (getDB().prepare('SELECT * FROM provider_connections WHERE providerId = ? ORDER BY priority ASC, weight DESC, createdAt ASC').all(providerId) as Row[]).map(meta); }

export function updateConnectionMetadata(id: string, input: UpdateProviderConnectionMetadataInput): ProviderConnectionMetadata | null {
  ensureProviderConnectionsSchema(); const sets: string[] = []; const vals: unknown[] = [];
  const add = (k: string, v: unknown) => { sets.push(`${k} = ?`); vals.push(v); };
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || k === 'rawCredential') continue;
    if (k === 'refreshable') add(k, v ? 1 : 0); else if (k === 'discoveredModels' || k === 'metadata') add(k, json(v)); else add(k, v);
  }
  if (!sets.length) return getConnectionMetadataById(id);
  add('updatedAt', new Date().toISOString()); vals.push(id);
  getDB().prepare(`UPDATE provider_connections SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return getConnectionMetadataById(id);
}
export function updateCredential(id: string, rawCredential: string, credentialVersion = 'enc:v1'): ProviderConnectionMetadata | null { if (!rawCredential) throw new Error('Provider connection credential is required'); ensureProviderConnectionsSchema(); getDB().prepare('UPDATE provider_connections SET encryptedCredential = ?, credentialVersion = ?, credentialHint = ?, updatedAt = ? WHERE id = ?').run(encrypt(rawCredential), credentialVersion, maskCredential(rawCredential), new Date().toISOString(), id); return getConnectionMetadataById(id); }
export const enableConnection = (id: string) => updateConnectionMetadata(id, { status: 'active' });
export const disableConnection = (id: string) => updateConnectionMetadata(id, { status: 'disabled' });
export function markSuccess(id: string): ProviderConnectionMetadata | null { const now = new Date().toISOString(); getDB().prepare("UPDATE provider_connections SET status = 'active', lastSuccessAt = ?, failureCount = 0, cooldownUntil = NULL, updatedAt = ? WHERE id = ?").run(now, now, id); return getConnectionMetadataById(id); }
export function markFailure(id: string, status: ProviderConnectionStatus = 'error'): ProviderConnectionMetadata | null { const now = new Date().toISOString(); getDB().prepare('UPDATE provider_connections SET status = ?, lastFailureAt = ?, failureCount = failureCount + 1, updatedAt = ? WHERE id = ?').run(status, now, now, id); return getConnectionMetadataById(id); }
export const setCooldown = (id: string, cooldownUntil: string) => updateConnectionMetadata(id, { status: 'cooldown', cooldownUntil });
export const clearCooldown = (id: string) => updateConnectionMetadata(id, { status: 'active', cooldownUntil: null });
export const updateQuota = (id: string, q: { quotaRemaining?: number | null; quotaLimit?: number | null; quotaResetAt?: string | null }) => updateConnectionMetadata(id, q);
export const updateDiscoveredModels = (id: string, discoveredModels: string[]) => updateConnectionMetadata(id, { discoveredModels });
export function deleteConnection(id: string): boolean { ensureProviderConnectionsSchema(); return getDB().prepare('DELETE FROM provider_connections WHERE id = ?').run(id).changes > 0; }
export function getDecryptedCredentialForRuntime(id: string): string | null { ensureProviderConnectionsSchema(); const r = getDB().prepare('SELECT encryptedCredential FROM provider_connections WHERE id = ?').get(id) as { encryptedCredential: string } | undefined; if (!r) return null; try { return decrypt(r.encryptedCredential); } catch (e) { throw new Error(sanitizeError(e)); } }
export function isConnectionEligible(c: ProviderConnectionMetadata, now = new Date()): boolean { if (c.status === 'disabled' || c.status === 'error' || c.status === 'cooldown') return false; if (c.cooldownUntil && new Date(c.cooldownUntil).getTime() > now.getTime()) return false; if (c.expiresAt && new Date(c.expiresAt).getTime() <= now.getTime() && !c.refreshable) return false; if (c.status === 'expired' && !c.refreshable) return false; return c.status === 'active' || c.status === 'degraded' || (c.status === 'expired' && c.refreshable); }
export function dryRunMapLegacyCredentials(): LegacyProviderConnectionMapping[] { const rows = getDB().prepare('SELECT id, provider, name, authType, isActive, testStatus, baseUrl, proxyUrl, region FROM connections ORDER BY provider, createdAt').all() as any[]; return rows.map(r => ({ legacyId:r.id, providerId:r.provider, label:r.name || r.provider, authType:r.authType === 'oauth' ? 'oauth' : 'api_key', status:r.isActive === 1 ? 'active' : 'disabled', accountRef:r.baseUrl || null, unmappableFields:['proxyUrl','region','testStatus'].filter(k => r[k] != null) })); }
