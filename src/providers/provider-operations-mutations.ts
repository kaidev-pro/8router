// 8Router — Phase 5D Provider Operations Mutations
// All mutations require auth, are audited, and gated by feature flags

import { buildProviderDescriptors, getCertificationRegistry, getModelRegistry } from './provider-foundation.js';
import { getDiscoveryFlags, canRunDiscovery, isTargetProvider } from './phase5c-provider-batch.js';

// ═══════════════════════════════════════════════════════════════
// Feature Flags for Mutations
// ═══════════════════════════════════════════════════════════════

export function isMutationEnabled(): boolean {
  return process.env.PROVIDER_OPERATIONS_MUTATION_ENABLED === 'true';
}

export function isOverrideEnabled(): boolean {
  return process.env.PROVIDER_OVERRIDE_ENABLED === 'true';
}

export function isCertificationRunEnabled(): boolean {
  return process.env.PROVIDER_CERTIFICATION_RUN_ENABLED === 'true';
}

// ═══════════════════════════════════════════════════════════════
// Audit Log
// ═══════════════════════════════════════════════════════════════

export interface AuditEntry {
  id: string;
  action: string;
  providerId: string;
  userId?: string;
  timestamp: string;
  details: Record<string, unknown>;
  success: boolean;
  error?: string;
}

const auditLog: AuditEntry[] = [];

export function addAuditEntry(entry: Omit<AuditEntry, 'id' | 'timestamp'>): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getAuditLog(providerId?: string, limit = 50): AuditEntry[] {
  const entries = providerId ? auditLog.filter(e => e.providerId === providerId) : auditLog;
  return entries.slice(-limit);
}

// ═══════════════════════════════════════════════════════════════
// Override Operations
// ═══════════════════════════════════════════════════════════════

export function createOverride(providerId: string, modelId: string, displayName: string, enabled: boolean, reason: string): { success: boolean; error?: string; audit: AuditEntry } {
  if (!isOverrideEnabled()) {
    const audit = addAuditEntry({ action: 'override.create', providerId, details: { modelId }, success: false, error: 'Override not enabled' });
    return { success: false, error: 'Override not enabled. Set PROVIDER_OVERRIDE_ENABLED=true', audit };
  }
  const descriptors = buildProviderDescriptors();
  if (!descriptors.find(d => d.id === providerId)) {
    const audit = addAuditEntry({ action: 'override.create', providerId, details: { modelId }, success: false, error: 'Provider not found' });
    return { success: false, error: 'Provider not found', audit };
  }
  const reg = getModelRegistry();
  reg.addOverride(providerId, modelId, displayName);
  const audit = addAuditEntry({ action: 'override.create', providerId, details: { modelId, displayName, enabled, reason }, success: true });
  return { success: true, audit };
}

export function removeOverride(providerId: string, modelId: string): { success: boolean; error?: string; audit: AuditEntry } {
  if (!isOverrideEnabled()) {
    const audit = addAuditEntry({ action: 'override.remove', providerId, details: { modelId }, success: false, error: 'Override not enabled' });
    return { success: false, error: 'Override not enabled', audit };
  }
  const audit = addAuditEntry({ action: 'override.remove', providerId, details: { modelId }, success: true });
  return { success: true, audit };
}

// ═══════════════════════════════════════════════════════════════
// Certification Run
// ═══════════════════════════════════════════════════════════════

export function triggerCertification(providerId: string, profile: string): { success: boolean; error?: string; audit: AuditEntry; jobId?: string } {
  if (!isCertificationRunEnabled()) {
    const audit = addAuditEntry({ action: 'certification.trigger', providerId, details: { profile }, success: false, error: 'Certification run not enabled' });
    return { success: false, error: 'Certification run not enabled. Set PROVIDER_CERTIFICATION_RUN_ENABLED=true', audit };
  }
  const descriptors = buildProviderDescriptors();
  if (!descriptors.find(d => d.id === providerId)) {
    const audit = addAuditEntry({ action: 'certification.trigger', providerId, details: { profile }, success: false, error: 'Provider not found' });
    return { success: false, error: 'Provider not found', audit };
  }
  const jobId = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const audit = addAuditEntry({ action: 'certification.trigger', providerId, details: { profile, jobId }, success: true });
  return { success: true, audit, jobId };
}

// ═══════════════════════════════════════════════════════════════
// Discovery Run
// ═══════════════════════════════════════════════════════════════

export function triggerDiscovery(providerId: string, dryRun: boolean): { success: boolean; error?: string; audit: AuditEntry; jobId?: string } {
  const flags = getDiscoveryFlags();
  if (!flags.discoveryEnabled) {
    const audit = addAuditEntry({ action: 'discovery.trigger', providerId, details: { dryRun }, success: false, error: 'Discovery not enabled' });
    return { success: false, error: 'Discovery not enabled. Set PROVIDER_MODEL_DISCOVERY_ENABLED=true', audit };
  }
  if (!dryRun && !flags.networkEnabled) {
    const audit = addAuditEntry({ action: 'discovery.trigger', providerId, details: { dryRun }, success: false, error: 'Network not enabled' });
    return { success: false, error: 'Network not enabled for non-dry-run', audit };
  }
  const descriptors = buildProviderDescriptors();
  const d = descriptors.find(p => p.id === providerId);
  if (!d) {
    const audit = addAuditEntry({ action: 'discovery.trigger', providerId, details: { dryRun }, success: false, error: 'Provider not found' });
    return { success: false, error: 'Provider not found', audit };
  }
  if (!d.features.dynamicModels) {
    const audit = addAuditEntry({ action: 'discovery.trigger', providerId, details: { dryRun }, success: false, error: 'Provider does not support dynamic models' });
    return { success: false, error: 'Provider does not support dynamic models', audit };
  }
  const jobId = `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const audit = addAuditEntry({ action: 'discovery.trigger', providerId, details: { dryRun, jobId }, success: true });
  return { success: true, audit, jobId };
}

// ═══════════════════════════════════════════════════════════════
// Job Status (in-memory for Phase 5D)
// ═══════════════════════════════════════════════════════════════

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface Job {
  id: string;
  type: 'discovery' | 'certification';
  providerId: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown>;
  error?: string;
}

const jobs: Job[] = [];

export function getJob(jobId: string): Job | undefined {
  return jobs.find(j => j.id === jobId);
}

export function getJobs(providerId?: string, limit = 50): Job[] {
  const filtered = providerId ? jobs.filter(j => j.providerId === providerId) : jobs;
  return filtered.slice(-limit);
}

export function cancelJob(jobId: string): { success: boolean; error?: string } {
  const job = jobs.find(j => j.id === jobId);
  if (!job) return { success: false, error: 'Job not found' };
  if (job.status !== 'queued' && job.status !== 'running') return { success: false, error: 'Job cannot be cancelled' };
  job.status = 'cancelled';
  job.updatedAt = new Date().toISOString();
  return { success: true };
}
