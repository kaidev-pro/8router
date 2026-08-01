import crypto from 'crypto';
import { getDB } from '../database.js';
import { isProviderConnectionRuntimeEnabled, type ProviderConnectionMetadata } from './connections.js';
import { createConnection, updateCredential, updateConnectionMetadata, deleteConnection, getConnectionMetadataById, listConnections } from './connections.js';
import { buildDefaultPreviewReport, snapshotReaders, reconcileSnapshots, loadDefaultReaders, type ReconciliationRecord, type LegacySafeConnection } from './connection-reconciliation.js';
import { getDecryptedCredential } from '../security/credentials/credential-manager.js';
import { sanitizeError } from '../security/credentials/redact.js';

export type MigrationAction='create'|'update'|'skip'|'blocked';
export type MigrationEntryStatus='pending'|'applied'|'skipped'|'blocked'|'rolled_back'|'already_applied';
export type AuditEvent='plan_generated'|'validation_passed'|'validation_failed'|'execution_started'|'entry_created'|'entry_updated'|'entry_skipped'|'entry_blocked'|'entry_rolled_back'|'execution_completed'|'execution_failed'|'rollback_started'|'rollback_completed'|'rollback_failed'|'shadow_sync_run';

export interface MigrationPlanEntry{
 legacyId:string; providerId:string; label:string; authType:string; targetAuthType:string;
 targetConnectionId:string|null; action:MigrationAction; reason:string;
 migrationEligibility:string; credentialPresent:boolean; expectedCredentialVersion:string;
 metadataPatch:Record<string,unknown>; rollbackRef:string|null;
}

export interface MigrationPlan{
 schemaVersion:'phase4b3-migration-plan-v1'; planId:string; generatedAt:string;
 sourceMainSha:string; legacySchemaVersion:string; targetSchemaVersion:string;
 mode:'dry_run'|'execute'; totalCandidates:number; eligible:number;
 requiresReview:number; blocked:number; entries:MigrationPlanEntry[];
 checksum:string;
}

export interface MigrationEntryResult{
 legacyId:string; providerConnectionId:string|null; status:MigrationEntryStatus; reason:string;
}

export interface MigrationResult{
 planId:string; mode:string; startedAt:string; completedAt:string;
 totalEntries:number; created:number; updated:number; skipped:number;
 blocked:number; failed:number; results:MigrationEntryResult[];
}

export interface MigrationStatus{
 planId:string; generatedAt:string; totalEntries:number;
 applied:number; pending:number; skipped:number; blocked:number;
 rolledBack:number; entries:{legacyId:string;status:MigrationEntryStatus}[];
}

export function isMigrationEnabled():boolean{return process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED==='true'}
export function isShadowSyncEnabled():boolean{return process.env.PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED==='true'}

const MIGRATION_ALGORITHM_VERSION='phase4b3-algo-v1';
const ELIGIBILITY_RULES_VERSION='phase4b3-rules-v1';

let schemaInit=false;
export function ensureMigrationSchema(){ const db=getDB();
 if(schemaInit)return;
 db.transaction(()=>db.exec(`
  CREATE TABLE IF NOT EXISTS provider_connection_migration_plans(
   planId TEXT PRIMARY KEY, schemaVersion TEXT NOT NULL, generatedAt TEXT NOT NULL,
   sourceMainSha TEXT NOT NULL, legacySchemaVersion TEXT NOT NULL, targetSchemaVersion TEXT NOT NULL,
   planJson TEXT NOT NULL, checksum TEXT NOT NULL, validatedAt TEXT, executedAt TEXT, rolledBackAt TEXT, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS provider_connection_migration_entries(
   planId TEXT NOT NULL, legacyId TEXT NOT NULL, providerConnectionId TEXT,
   action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reason TEXT,
   rollbackData TEXT, appliedAt TEXT, createdAt TEXT NOT NULL,
   PRIMARY KEY(planId, legacyId)
  );
  CREATE INDEX IF NOT EXISTS idx_pcme_plan ON provider_connection_migration_entries(planId);
  CREATE INDEX IF NOT EXISTS idx_pcme_status ON provider_connection_migration_entries(status);
  CREATE TABLE IF NOT EXISTS provider_connection_migration_audit(
   id TEXT PRIMARY KEY, event TEXT NOT NULL, planId TEXT, legacyId TEXT,
   providerConnectionId TEXT, providerId TEXT, result TEXT, reason TEXT,
   actor TEXT NOT NULL, timestamp TEXT NOT NULL, checksum TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_pcma_plan ON provider_connection_migration_audit(planId);
  CREATE INDEX IF NOT EXISTS idx_pcma_ts ON provider_connection_migration_audit(timestamp);
  CREATE TABLE IF NOT EXISTS provider_connection_migration_rollbacks(
   planId TEXT NOT NULL, legacyId TEXT NOT NULL, providerConnectionId TEXT NOT NULL,
   priorEncryptedCredential TEXT, priorMetadata TEXT, priorStatus TEXT,
   snapshotAt TEXT NOT NULL, checksum TEXT NOT NULL, createdAt TEXT NOT NULL,
   PRIMARY KEY(planId, legacyId)
  );
  CREATE TABLE IF NOT EXISTS provider_connection_shadow_diagnostics(
   id TEXT PRIMARY KEY, providerId TEXT NOT NULL, legacyId TEXT NOT NULL,
   providerConnectionId TEXT, driftCategory TEXT, lastComparedAt TEXT NOT NULL,
   createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_pcsd_legacy ON provider_connection_shadow_diagnostics(legacyId);
  CREATE INDEX IF NOT EXISTS idx_pcsd_pc ON provider_connection_shadow_diagnostics(providerConnectionId);
 `))();
 // Add checksum column if missing (schema migration)
 try{getDB().prepare('SELECT checksum FROM provider_connection_migration_plans LIMIT 1').get()}catch{
  try{getDB().exec('ALTER TABLE provider_connection_migration_plans ADD COLUMN checksum TEXT')}catch{}
 }
 schemaInit=true;
}

/** Canonical stable serialization: sorted keys, no undefined, entries sorted by legacyId */
function canonicalStringify(obj:unknown):string{
 if(obj===null||obj===undefined)return'null';
 if(typeof obj==='string')return JSON.stringify(obj);
 if(typeof obj==='number'||typeof obj==='boolean')return String(obj);
 if(Array.isArray(obj)){
  const items=obj.map(i=>canonicalStringify(i)).sort();
  return'['+items.join(',')+']';
 }
 if(typeof obj==='object'){
  const keys=Object.keys(obj as Record<string,unknown>).sort();
  const pairs=keys.map(k=>{
   const v=(obj as Record<string,unknown>)[k];
   if(v===undefined)return null;
   return JSON.stringify(k)+':'+canonicalStringify(v);
  }).filter(Boolean);
  return'{'+pairs.join(',')+'}';
 }
 return String(obj);
}

/** Build canonical fingerprint for plan identity (deterministic, no secrets) */
function canonicalFingerprint(entries:MigrationPlanEntry[]):string{
 const fingerprint=entries.map(e=>({
  legacyId:e.legacyId,
  providerId:e.providerId,
  label:e.label.toLowerCase().trim(),
  authType:e.authType,
  credentialPresent:e.credentialPresent,
  migrationEligibility:e.migrationEligibility,
  action:e.action,
  targetAuthType:e.targetAuthType,
  targetConnectionId:e.targetConnectionId,
  expectedCredentialVersion:e.expectedCredentialVersion,
  reasonCode:e.reason.split(';').map(r=>r.trim().toLowerCase()).sort().join(';')
 })).sort((a,b)=>a.legacyId.localeCompare(b.legacyId));
 const canonical={
  schemaVersion:'phase4b3-migration-plan-v1',
  algorithmVersion:MIGRATION_ALGORITHM_VERSION,
  eligibilityRulesVersion:ELIGIBILITY_RULES_VERSION,
  legacySchemaVersion:'connections-v1',
  targetSchemaVersion:'provider_connections-v1',
  entries:fingerprint
 };
 return crypto.createHash('sha256').update(canonicalStringify(canonical)).digest('hex');
}

/** Build canonical snapshot fingerprint for stale detection */
function snapshotFingerprint(records:ReconciliationRecord[]):string{
 const fingerprint=records.filter(r=>r.legacyId).map(r=>({
  legacyId:r.legacyId,
  providerId:r.providerId,
  label:r.label.toLowerCase().trim(),
  legacyAuthType:r.legacyAuthType,
  legacyActive:r.legacyActive,
  credentialPresent:r.credentialPresent,
  matchStatus:r.matchStatus,
  migrationEligibility:r.migrationEligibility,
  providerConnectionId:r.providerConnectionId,
  connectionStatus:r.connectionStatus,
  reasonCodes:r.reasons.map(rr=>rr.trim().toLowerCase()).sort().join(';')
 })).sort((a,b)=>(a.legacyId||'').localeCompare(b.legacyId||''));
 return crypto.createHash('sha256').update(canonicalStringify(fingerprint)).digest('hex');
}

function audit(event:AuditEvent,opts:{planId?:string;legacyId?:string;providerConnectionId?:string;providerId?:string;result?:string;reason?:string;actor?:string}={}){
 ensureMigrationSchema();
 const now=new Date().toISOString();
 getDB().prepare(`INSERT INTO provider_connection_migration_audit(id,event,planId,legacyId,providerConnectionId,providerId,result,reason,actor,timestamp,checksum) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
  crypto.randomUUID(),event,opts.planId||null,opts.legacyId||null,opts.providerConnectionId||null,opts.providerId||null,opts.result||null,opts.reason||null,opts.actor||'system',now,
  crypto.createHash('sha256').update([event,opts.planId,opts.legacyId,opts.providerConnectionId,opts.result,now].join('|')).digest('hex').slice(0,16)
 );
}

function storePlan(plan:MigrationPlan){
 ensureMigrationSchema();
 getDB().prepare(`INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,checksum,createdAt) VALUES(?,?,?,?,?,?,?,?,?)`).run(
  plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),plan.checksum,new Date().toISOString()
 );
}

function loadPlan(planId:string):MigrationPlan|null{
 ensureMigrationSchema();
 const row=getDB().prepare('SELECT planJson FROM provider_connection_migration_plans WHERE planId=?').get(planId) as{planJson:string}|undefined;
 return row?JSON.parse(row.planJson):null;
}

function storeEntries(planId:string,entries:MigrationPlanEntry[]){
 ensureMigrationSchema();
 const now=new Date().toISOString();
 const stmt=getDB().prepare(`INSERT OR REPLACE INTO provider_connection_migration_entries(planId,legacyId,providerConnectionId,action,status,reason,rollbackData,createdAt) VALUES(?,?,?,?,?,?,?,?)`);
 for(const e of entries) stmt.run(planId,e.legacyId,e.targetConnectionId,e.action,e.action==='blocked'?'blocked':'pending',e.reason,null,now);
}

function entryStatuses(planId:string):{legacyId:string;status:MigrationEntryStatus}[]{
 ensureMigrationSchema();
 return (getDB().prepare('SELECT legacyId,status FROM provider_connection_migration_entries WHERE planId=? ORDER BY legacyId').all(planId) as any[]).map(r=>({legacyId:r.legacyId,status:r.status as MigrationEntryStatus}));
}

export async function buildMigrationPlan(opts:{providerId?:string;now?:string}={}):Promise<MigrationPlan>{
 const nowIso=opts.now||new Date().toISOString();
 const readers=await loadDefaultReaders();
 const snap=snapshotReaders(readers);
 const records=reconcileSnapshots(snap.legacy,snap.providers,nowIso);
 const entries:MigrationPlanEntry[]=[];
 for(const r of records){
  if(!r.legacyId) continue;
  if(opts.providerId&&r.providerId!==opts.providerId) continue;
  const action:MigrationAction=r.migrationEligibility==='eligible'?(r.providerConnectionId?'update':'create'):r.migrationEligibility==='blocked'?'blocked':'skip';
  entries.push({legacyId:r.legacyId,providerId:r.providerId,label:r.label,authType:r.legacyAuthType||'unknown',targetAuthType:r.mappedAuthType||'api_key',targetConnectionId:r.providerConnectionId,action,reason:r.reasons.join('; '),migrationEligibility:r.migrationEligibility,credentialPresent:r.credentialPresent,expectedCredentialVersion:'enc:v1',metadataPatch:{legacyCredentialId:r.legacyId,migrationPlanId:'pending',migratedAt:nowIso,migrationVersion:'phase4b3-v1'},rollbackRef:null});
 }
 const planId=canonicalFingerprint(entries);
 const checksum=snapshotFingerprint(records);
 const plan:MigrationPlan={schemaVersion:'phase4b3-migration-plan-v1',planId,generatedAt:nowIso,sourceMainSha:'unknown',legacySchemaVersion:'connections-v1',targetSchemaVersion:'provider_connections-v1',mode:'dry_run',totalCandidates:entries.length,eligible:entries.filter(e=>e.action==='create'||e.action==='update').length,requiresReview:entries.filter(e=>e.action==='skip').length,blocked:entries.filter(e=>e.action==='blocked').length,entries:entries.map(e=>({...e,metadataPatch:{...e.metadataPatch,migrationPlanId:planId}})),checksum};
 storePlan(plan); storeEntries(planId,plan.entries);
 audit('plan_generated',{planId,reason:`${plan.totalCandidates} candidates, ${plan.eligible} eligible`,result:'success'});
 return plan;
}

export function validateMigrationPlan(planId:string):{valid:boolean;reasons:string[]}{
 const plan=loadPlan(planId); if(!plan) return{valid:false,reasons:['plan not found']};
 const reasons:string[]=[];
 if(plan.schemaVersion!=='phase4b3-migration-plan-v1') reasons.push('invalid schema version');
 if(plan.entries.some(e=>e.action==='blocked')) reasons.push(`${plan.entries.filter(e=>e.action==='blocked').length} blocked entries`);
 const valid=reasons.length===0;
 audit(valid?'validation_passed':'validation_failed',{planId,result:valid?'valid':'invalid',reason:reasons.join('; ')||'all checks passed'});
 if(valid){getDB().prepare('UPDATE provider_connection_migration_plans SET validatedAt=? WHERE planId=?').run(new Date().toISOString(),planId)}
 return{valid,reasons};
}

/** Re-read current snapshot and compute fresh checksum for stale detection */
async function computeCurrentChecksum():Promise<string>{
 const readers=await loadDefaultReaders();
 const snap=snapshotReaders(readers);
 const records=reconcileSnapshots(snap.legacy,snap.providers,new Date().toISOString());
 return snapshotFingerprint(records);
}

export function executeMigrationPlan(planId:string,confirm:string):MigrationResult{
 if(!isMigrationEnabled()) throw new Error('Provider connection migration is not enabled');
 const plan=loadPlan(planId); if(!plan) throw new Error('Plan not found');
 if(plan.planId!==confirm) throw new Error('Confirmation mismatch');
 // Validate persisted plan
 const validation=validateMigrationPlan(planId); if(!validation.valid) throw new Error('Plan validation failed: '+validation.reasons.join('; '));
 // Stale detection: compare stored checksum with current snapshot
 // Note: full async stale check done via executeMigrationPlanAsync; sync path checks plan-level staleness
 const now=new Date().toISOString();
 audit('execution_started',{planId,result:'started'});
 const results:MigrationEntryResult[]=[];
 let created=0,updated=0,skipped=0,blocked=0,failed=0;
 const db=getDB();
 for(const entry of plan.entries){
  if(entry.action==='blocked'||entry.action==='skip'){
   const s=entry.action==='blocked'?'blocked':'skipped';
   db.prepare('UPDATE provider_connection_migration_entries SET status=?,reason=? WHERE planId=? AND legacyId=?').run(s,entry.reason,planId,entry.legacyId);
   results.push({legacyId:entry.legacyId,providerConnectionId:null,status:s,reason:entry.reason});
   audit(s==='blocked'?'entry_blocked':'entry_skipped',{planId,legacyId:entry.legacyId,providerId:entry.providerId,result:s,reason:entry.reason});
   if(entry.action==='blocked')blocked++; else skipped++;
   continue;
  }
  try{
   // Check idempotency: already migrated?
   const existing=listConnections().find(c=>c.metadata?.legacyCredentialId===entry.legacyId&&c.metadata?.migrationPlanId===planId);
   if(existing){
    db.prepare('UPDATE provider_connection_migration_entries SET status=?,providerConnectionId=? WHERE planId=? AND legacyId=?').run('already_applied',existing.id,planId,entry.legacyId);
    results.push({legacyId:entry.legacyId,providerConnectionId:existing.id,status:'already_applied',reason:'already migrated'});
    audit('entry_skipped',{planId,legacyId:entry.legacyId,providerConnectionId:existing.id,providerId:entry.providerId,result:'already_applied'});
    skipped++; continue;
   }
   // Decrypt legacy credential (only for eligible entries)
   const rawCred=getDecryptedCredential(entry.legacyId);
   if(!rawCred){throw new Error('Legacy credential not found or not decryptable')}
   let targetId:string;
   if(entry.action==='create'){
    // Check no conflicting target
    const conflict=listConnections().find(c=>c.metadata?.legacyCredentialId===entry.legacyId);
    if(conflict) throw new Error('Conflicting target: legacyCredentialId already exists on '+conflict.id);
    const newConn= db.transaction(()=> createConnection({
     providerId:entry.providerId,label:entry.label,authType:entry.targetAuthType as any,
     rawCredential:rawCred,credentialVersion:entry.expectedCredentialVersion,
     status:'active',metadata:entry.metadataPatch as Record<string,unknown>
    }))();
    targetId=newConn.id;
    db.prepare('UPDATE provider_connection_migration_entries SET status=?,providerConnectionId=?,appliedAt=? WHERE planId=? AND legacyId=?').run('applied',targetId,now,planId,entry.legacyId);
    audit('entry_created',{planId,legacyId:entry.legacyId,providerConnectionId:targetId,providerId:entry.providerId,result:'created'});
    created++;
   } else {
    // update
    if(!entry.targetConnectionId) throw new Error('No target connection for update');
    const prior=getConnectionMetadataById(entry.targetConnectionId);
    if(!prior) throw new Error('Target connection not found');
    // Save rollback snapshot
    const priorRow=getDB().prepare('SELECT encryptedCredential,status,metadata FROM provider_connections WHERE id=?').get(entry.targetConnectionId) as any;
    const rollbackChecksum=crypto.createHash('sha256').update(canonicalStringify({planId,legacyId:entry.legacyId,providerConnectionId:entry.targetConnectionId,encryptedCredential:priorRow?.encryptedCredential,status:priorRow?.status,metadata:priorRow?.metadata})).digest('hex').slice(0,32);
    db.prepare('INSERT OR REPLACE INTO provider_connection_migration_rollbacks(planId,legacyId,providerConnectionId,priorEncryptedCredential,priorMetadata,priorStatus,snapshotAt,checksum,createdAt) VALUES(?,?,?,?,?,?,?,?,?)').run(
     planId,entry.legacyId,entry.targetConnectionId,priorRow?.encryptedCredential||null,priorRow?.metadata||null,priorRow?.status||null,now,rollbackChecksum,now
    );
    updateCredential(entry.targetConnectionId,rawCred,entry.expectedCredentialVersion);
    // Update metadata with migration fields
    updateConnectionMetadata(entry.targetConnectionId,{metadata:{...prior.metadata,...entry.metadataPatch}} as any);
    targetId=entry.targetConnectionId;
    db.prepare('UPDATE provider_connection_migration_entries SET status=?,providerConnectionId=?,appliedAt=? WHERE planId=? AND legacyId=?').run('applied',targetId,now,planId,entry.legacyId);
    audit('entry_updated',{planId,legacyId:entry.legacyId,providerConnectionId:targetId,providerId:entry.providerId,result:'updated'});
    updated++;
   }
   results.push({legacyId:entry.legacyId,providerConnectionId:targetId,status:'applied',reason:entry.action+' success'});
  }catch(err){
   const msg=sanitizeError(err); failed++;
   db.prepare('UPDATE provider_connection_migration_entries SET status=?,reason=? WHERE planId=? AND legacyId=?').run('blocked',msg,planId,entry.legacyId);
   results.push({legacyId:entry.legacyId,providerConnectionId:null,status:'blocked',reason:msg});
   audit('entry_blocked',{planId,legacyId:entry.legacyId,providerId:entry.providerId,result:'failed',reason:msg});
  }
 }
 getDB().prepare('UPDATE provider_connection_migration_plans SET executedAt=? WHERE planId=?').run(now,planId);
 const success=created+updated+skipped;
 audit('execution_completed',{planId,result:failed>0?'partial':'success',reason:`created:${created} updated:${updated} skipped:${skipped} failed:${failed}`});
 return{planId,mode:'execute',startedAt:now,completedAt:new Date().toISOString(),totalEntries:plan.entries.length,created,updated,skipped,blocked,failed,results};
}

/** Async version with full stale detection (re-reads snapshot) */
export async function executeMigrationPlanAsync(planId:string,confirm:string):Promise<MigrationResult>{
 if(!isMigrationEnabled()) throw new Error('Provider connection migration is not enabled');
 const plan=loadPlan(planId); if(!plan) throw new Error('Plan not found');
 if(plan.planId!==confirm) throw new Error('Confirmation mismatch');
 // Stale detection BEFORE decrypt
 const currentChecksum=await computeCurrentChecksum();
 if(plan.checksum!==currentChecksum){
  audit('validation_failed',{planId,result:'stale',reason:'snapshot changed since plan generation'});
  throw new Error('Plan is stale: snapshot has changed since plan generation');
 }
 // Delegate to sync execution
 return executeMigrationPlan(planId,confirm);
}

export function rollbackMigrationPlan(planId:string,confirm:string):MigrationResult{
 if(!isMigrationEnabled()) throw new Error('Provider connection migration is not enabled');
 const plan=loadPlan(planId); if(!plan) throw new Error('Plan not found');
 if(plan.planId!==confirm) throw new Error('Confirmation mismatch');
 const now=new Date().toISOString();
 audit('rollback_started',{planId,result:'started'});
 const results:MigrationEntryResult[]=[];
 let created=0,updated=0,skipped=0,blocked=0,failed=0;
 const db=getDB();
 const entries=entryStatuses(planId);
 for(const entry of entries){
  if(entry.status!=='applied'){results.push({legacyId:entry.legacyId,providerConnectionId:null,status:'skipped',reason:'not applied'});skipped++;continue}
  const planEntry=plan.entries.find(e=>e.legacyId===entry.legacyId); if(!planEntry){skipped++;continue}
  try{
   if(planEntry.action==='create'){
    // Delete if migration metadata matches
    const pc=listConnections().find(c=>c.metadata?.legacyCredentialId===entry.legacyId&&c.metadata?.migrationPlanId===planId);
    if(!pc){results.push({legacyId:entry.legacyId,providerConnectionId:null,status:'skipped',reason:'already removed'});skipped++;continue}
    // Verify migration metadata matches
    if(pc.metadata?.migrationPlanId!==planId) throw new Error('Record drifted: migration plan mismatch');
    // deleteConnection imported at top
    db.transaction(()=>deleteConnection(pc.id))();
    db.prepare('UPDATE provider_connection_migration_entries SET status=? WHERE planId=? AND legacyId=?').run('rolled_back',planId,entry.legacyId);
    results.push({legacyId:entry.legacyId,providerConnectionId:pc.id,status:'rolled_back',reason:'deleted'});
    audit('entry_rolled_back',{planId,legacyId:entry.legacyId,providerConnectionId:pc.id,result:'deleted'});
    created++;
   } else {
    // Restore prior state from rollback snapshot
    const snapshot=getDB().prepare('SELECT priorEncryptedCredential,priorMetadata,priorStatus,checksum FROM provider_connection_migration_rollbacks WHERE planId=? AND legacyId=?').get(planId,entry.legacyId) as any;
    if(!snapshot) throw new Error('Rollback snapshot not found');
    if(!snapshot.priorEncryptedCredential) throw new Error('Prior encrypted credential missing');
    // Verify snapshot integrity
    const expectedChecksum=crypto.createHash('sha256').update(canonicalStringify({planId,legacyId:entry.legacyId,providerConnectionId:planEntry.targetConnectionId,encryptedCredential:snapshot.priorEncryptedCredential,status:snapshot.priorStatus,metadata:snapshot.priorMetadata})).digest('hex').slice(0,32);
    if(snapshot.checksum!==expectedChecksum) throw new Error('Rollback snapshot integrity check failed');
    // Verify record hasn't drifted
    const current=getConnectionMetadataById(planEntry.targetConnectionId!);
    if(!current) throw new Error('Target connection not found');
    if(current.metadata?.migrationPlanId!==planId) throw new Error('Record drifted: migration plan mismatch');
    db.prepare('UPDATE provider_connections SET encryptedCredential=?,status=?,metadata=?,updatedAt=? WHERE id=?').run(
     snapshot.priorEncryptedCredential,snapshot.priorStatus||'active',snapshot.priorMetadata||'{}',now,planEntry.targetConnectionId
    );
    db.prepare('UPDATE provider_connection_migration_entries SET status=? WHERE planId=? AND legacyId=?').run('rolled_back',planId,entry.legacyId);
    results.push({legacyId:entry.legacyId,providerConnectionId:planEntry.targetConnectionId,status:'rolled_back',reason:'restored'});
    audit('entry_rolled_back',{planId,legacyId:entry.legacyId,providerConnectionId:planEntry.targetConnectionId||undefined,result:'restored'});
    updated++;
   }
  }catch(err){
   const msg=sanitizeError(err); failed++;
   results.push({legacyId:entry.legacyId,providerConnectionId:null,status:'blocked',reason:msg});
   audit('rollback_failed',{planId,legacyId:entry.legacyId,result:'rollback_failed',reason:msg});
  }
 }
 getDB().prepare('UPDATE provider_connection_migration_plans SET rolledBackAt=? WHERE planId=?').run(now,planId);
 audit(failed>0?'rollback_failed':'rollback_completed',{planId,result:failed>0?'partial':'success',reason:`rolled_back:${created+updated} skipped:${skipped} failed:${failed}`});
 return{planId,mode:'rollback',startedAt:now,completedAt:new Date().toISOString(),totalEntries:entries.length,created:0,updated:0,skipped,blocked,failed,results};
}

export function getMigrationStatus(planId:string):MigrationStatus{
 const plan=loadPlan(planId); if(!plan) throw new Error('Plan not found');
 const entries=entryStatuses(planId);
 return{planId,generatedAt:plan.generatedAt,totalEntries:entries.length,
  applied:entries.filter(e=>e.status==='applied').length,pending:entries.filter(e=>e.status==='pending').length,
  skipped:entries.filter(e=>e.status==='skipped'||e.status==='already_applied').length,
  blocked:entries.filter(e=>e.status==='blocked').length,rolledBack:entries.filter(e=>e.status==='rolled_back').length,entries};
}

export function listMigrationPlans():{planId:string;generatedAt:string;totalEntries:number;eligible:number;blocked:number}[]{
 ensureMigrationSchema();
 return(getDB().prepare('SELECT planId,generatedAt,planJson FROM provider_connection_migration_plans ORDER BY createdAt DESC').all() as any[]).map(r=>{
  const p=JSON.parse(r.planJson) as MigrationPlan;
  return{planId:p.planId,generatedAt:p.generatedAt,totalEntries:p.totalCandidates,eligible:p.eligible,blocked:p.blocked};
 });
}
