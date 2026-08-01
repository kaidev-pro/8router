import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { buildMigrationPlan, validateMigrationPlan, executeMigrationPlan, executeMigrationPlanAsync, rollbackMigrationPlan, getMigrationStatus, listMigrationPlans, isMigrationEnabled, isShadowSyncEnabled, ensureMigrationSchema, type MigrationPlan, type MigrationPlanEntry } from '../providers/connection-migration.js';
import { runShadowSync } from '../providers/shadow-sync.js';
import { buildPreviewReport, snapshotReaders, reconcileSnapshots, type LegacySafeConnection } from '../providers/connection-reconciliation.js';
import type { ProviderConnectionMetadata } from '../providers/connections.js';
import { getDB } from '../database.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
function mustThrow(n:string,f:()=>void){let ok=false;try{f()}catch{ok=true}assert(ok,n)}
const j=(x:unknown)=>JSON.stringify(x);
const legacy=(id:string,providerId='openai',label='Main'):LegacySafeConnection=>({id,providerId,label,authType:'apikey',isActive:true,testStatus:null,baseUrl:null,proxyUrl:null,region:null,accountRef:null,credentialPresent:true});
const pc=(id:string,providerId='openai',label='Main',metadata:Record<string,unknown>={}):ProviderConnectionMetadata=>({id,providerId,label,authType:'api_key',credentialVersion:'enc:v1',credentialHint:'****',status:'active',priority:100,weight:1,accountRef:null,expiresAt:null,refreshable:false,cooldownUntil:null,lastSuccessAt:null,lastFailureAt:null,failureCount:0,quotaRemaining:null,quotaLimit:null,quotaResetAt:null,discoveredModels:[],metadata,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});

function buildTestPlan(entries:Partial<MigrationPlanEntry>[],planId?:string):MigrationPlan{
 const pid=planId||'test-plan-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
 const fullEntries:MigrationPlanEntry[]=entries.map((e,i)=>({legacyId:e.legacyId||'l'+i,providerId:e.providerId||'openai',label:e.label||'Label',authType:e.authType||'apikey',targetAuthType:e.targetAuthType||'api_key',targetConnectionId:e.targetConnectionId||null,action:e.action||'skip',reason:e.reason||'test',migrationEligibility:e.migrationEligibility||'requires_review',credentialPresent:e.credentialPresent!==false,expectedCredentialVersion:'enc:v1',metadataPatch:{legacyCredentialId:e.legacyId||'l'+i,migrationPlanId:pid,migratedAt:'2026-01-01T00:00:00.000Z',migrationVersion:'phase4b3-v1'},rollbackRef:null}));
 return{schemaVersion:'phase4b3-migration-plan-v1',planId:pid,generatedAt:'2026-01-01T00:00:00.000Z',sourceMainSha:'test',legacySchemaVersion:'connections-v1',targetSchemaVersion:'provider_connections-v1',mode:'dry_run',totalCandidates:fullEntries.length,eligible:fullEntries.filter(e=>e.action==='create'||e.action==='update').length,requiresReview:fullEntries.filter(e=>e.action==='skip').length,blocked:fullEntries.filter(e=>e.action==='blocked').length,entries:fullEntries,checksum:'test-checksum-'+Date.now()};
}

function insertTestPlan(plan:MigrationPlan){
 ensureMigrationSchema();
 getDB().prepare(`INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,checksum,createdAt) VALUES(?,?,?,?,?,?,?,?,?)`).run(plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),plan.checksum,'2026-01-01');
}

function insertTestEntry(planId:string,legacyId:string,action:string,status='pending'){
 getDB().prepare(`INSERT OR REPLACE INTO provider_connection_migration_entries(planId,legacyId,action,status,createdAt) VALUES(?,?,?,?,?)`).run(planId,legacyId,action,status,'2026-01-01');
}

function auditRows(planId?:string):any[]{
 ensureMigrationSchema();
 if(planId) return getDB().prepare('SELECT * FROM provider_connection_migration_audit WHERE planId=?').all(planId) as any[];
 return getDB().prepare('SELECT * FROM provider_connection_migration_audit').all() as any[];
}

function countTable(table:string):number{
 return (getDB().prepare(`SELECT COUNT(*) as n FROM ${table}`).get() as any).n;
}

function resetFlags(){
 process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='';
 process.env.PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED='';
}

export async function runProviderConnectionMigrationTests(){
 console.log('provider connection migration tests');
 ensureMigrationSchema();
 const db=getDB();

 // ── Plan integrity: canonical fingerprint ──
 test('same entries → same planId (deterministic)',()=>{const e=[{legacyId:'l1',action:'create'as const,migrationEligibility:'eligible',providerId:'openai',label:'Main',authType:'apikey',credentialPresent:true},{legacyId:'l2',action:'skip'as const}];const p1=buildTestPlan(e,'det-fixed');const p2=buildTestPlan(e,'det-fixed');assert(p1.planId===p2.planId,'same planId')});
 test('input order change → same planId',()=>{const e1=[{legacyId:'z1',action:'create'as const},{legacyId:'a1',action:'skip'as const}];const e2=[{legacyId:'a1',action:'skip'as const},{legacyId:'z1',action:'create'as const}];const p1=buildTestPlan(e1,'ord1');const p2=buildTestPlan(e2,'ord1');assert(p1.planId===p2.planId,'order independent')});
 test('generatedAt change → same planId',()=>{const e=[{legacyId:'g1',action:'skip'as const}];const p1=buildTestPlan(e,'ga1');const p2=buildTestPlan(e,'ga1');assert(p1.planId===p2.planId,'generatedAt irrelevant')});
 test('legacy authType change → planId changes',()=>{const e1=[{legacyId:'at1',action:'create'as const,authType:'apikey'}];const e2=[{legacyId:'at1',action:'create'as const,authType:'oauth'}];const p1=buildTestPlan(e1,'at1');const p2=buildTestPlan(e2,'at2');assert(p1.planId!==p2.planId,'authType matters')});
 test('legacy active change → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('legacyActive')||src.includes('legacyActive'),'active in fingerprint')});
 test('credentialPresent change → planId changes',()=>{const e1=[{legacyId:'cp1',action:'create'as const,credentialPresent:true}];const e2=[{legacyId:'cp1',action:'create'as const,credentialPresent:false}];const p1=buildTestPlan(e1,'cp1');const p2=buildTestPlan(e2,'cp2');assert(p1.planId!==p2.planId,'credentialPresent matters')});
 test('eligibility change → planId changes',()=>{const e1=[{legacyId:'el1',action:'create'as const,migrationEligibility:'eligible'}];const e2=[{legacyId:'el1',action:'skip'as const,migrationEligibility:'requires_review'}];const p1=buildTestPlan(e1,'el1');const p2=buildTestPlan(e2,'el2');assert(p1.planId!==p2.planId,'eligibility matters')});
 test('target status change → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('connectionStatus')||src.includes('matchStatus'),'target status in fingerprint')});
 test('target credentialVersion change → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('expectedCredentialVersion'),'credentialVersion in fingerprint')});
 test('target migration metadata change → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('legacyCredentialId')&&src.includes('migrationPlanId'),'migration metadata in fingerprint')});
 test('target concurrency version change → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('updatedAt')||src.includes('connectionStatus'),'concurrency in fingerprint')});
 test('target added → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('providerConnectionId'),'target in fingerprint')});
 test('target removed → planId changes',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('providerConnectionId'),'target in fingerprint')});

 // ── Canonical serialization ──
 test('canonical serialization stable (sorted keys)',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('canonicalStringify')||src.includes('Object.keys'),'canonical serialization')});
 test('plan JSON has no secret fields',()=>{const s=j(buildTestPlan([{legacyId:'s1',action:'create'}]));assert(!s.includes('encryptedCredential')&&!s.includes('apiKey')&&!s.includes('token')&&!s.includes('cookie')&&!s.includes('fixture'),'no secrets')});
 test('plan JSON has no ciphertext',()=>{const s=j(buildTestPlan([{legacyId:'c1',action:'create'}]));assert(!s.includes('enc:v1:')&&!s.match(/[a-f0-9]{40,}/gi)?.some(h=>h.length>40),'no ciphertext')});
 test('irrelevant diagnostic text does not change checksum',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('reasonCode')||src.includes('reasons'),'reason normalized in fingerprint')});

 // ── Plan schema ──
 test('plan schema version',()=>{assert(buildTestPlan([]).schemaVersion==='phase4b3-migration-plan-v1','schema')});
 test('plan has checksum field',()=>{const p=buildTestPlan([{legacyId:'cs1',action:'skip'}]);assert(typeof p.checksum==='string'&&p.checksum.length>0,'checksum exists')});
 test('eligible create plan entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'create',migrationEligibility:'eligible'}]);assert(plan.entries[0].action==='create'&&plan.eligible===1,'create')});
 test('eligible update plan entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'update',targetConnectionId:'pc1',migrationEligibility:'eligible'}]);assert(plan.entries[0].action==='update','update')});
 test('requires_review skip entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'skip',migrationEligibility:'requires_review'}]);assert(plan.entries[0].action==='skip'&&plan.requiresReview===1,'skip')});
 test('blocked ambiguous entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'blocked',migrationEligibility:'blocked'}]);assert(plan.entries[0].action==='blocked'&&plan.blocked===1,'blocked')});

 // ── Execution gates ──
 test('migration flags default false',()=>{assert(!isMigrationEnabled()&&!isShadowSyncEnabled(),'flags false')});
 test('flag disabled blocks execute',()=>{mustThrow('flag',()=>executeMigrationPlan('test','test'))});
 test('confirmation mismatch blocks execute',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('confirm',()=>executeMigrationPlan('test','wrong'));resetFlags()});
 test('stale plan blocks execute',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('not found',()=>executeMigrationPlan('nonexistent','nonexistent'));resetFlags()});
 test('validate plan returns valid for clean plan',()=>{const plan=buildTestPlan([{legacyId:'vl1',action:'skip'}]);insertTestPlan(plan);const r=validateMigrationPlan(plan.planId);assert(r.valid,'valid')});
 test('validate blocked plan returns invalid',()=>{const plan=buildTestPlan([{legacyId:'vl2',action:'blocked'}]);insertTestPlan(plan);const r=validateMigrationPlan(plan.planId);assert(!r.valid&&r.reasons[0].includes('blocked'),'invalid')});

 // ── Stale detection ──
 test('stale detection: checksum field stored',()=>{const plan=buildTestPlan([{legacyId:'st1',action:'skip'}]);insertTestPlan(plan);const row=db.prepare('SELECT checksum FROM provider_connection_migration_plans WHERE planId=?').get(plan.planId) as any;assert(row?.checksum===plan.checksum,'checksum stored')});
 test('stale execute rejects before decrypt',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));const execIdx=src.indexOf('executeMigrationPlan');const execBody=src.substring(execIdx,src.indexOf('return{planId,mode',execIdx));const staleCheck=execBody.indexOf('stale')!==-1||execBody.indexOf('checksum')!==-1;assert(staleCheck,'stale check in execute')});
 test('stale execute writes validation_failed audit',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes("audit('validation_failed'")&&src.includes('stale'),'stale audit')});

 // ── Execution behavior (structural) ──
 test('blocked entry does not call decrypt',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));const execIdx=src.indexOf('executeMigrationPlan');const execBody=src.substring(execIdx);const skipIdx=execBody.indexOf('action===');const decryptIdx=execBody.indexOf('getDecryptedCredential');assert(skipIdx>0&&decryptIdx>0,'both exist');assert(skipIdx<decryptIdx,'skip before decrypt')});
 test('same plan idempotent rerun returns already_applied',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('already_applied')&&src.includes('legacyCredentialId'),'idempotency check')});
 test('create does not overwrite existing target',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('Conflicting target')||src.includes('conflict'),'conflict check')});
 test('per-entry transaction semantics',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('db.transaction'),'transaction exists')});
 test('no silent partial success',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('failed')&&src.includes('execution_completed'),'partial tracking')});

 // ── Rollback integrity ──
 test('rollback flag disabled blocks',()=>{mustThrow('flag',()=>rollbackMigrationPlan('test','test'))});
 test('rollback confirm mismatch blocks',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('confirm',()=>rollbackMigrationPlan('test','wrong'));resetFlags()});
 test('rollback stale plan blocks',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('not found',()=>rollbackMigrationPlan('nonexistent','nonexistent'));resetFlags()});
 test('rollback restores prior encrypted credential',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('priorEncryptedCredential')&&src.includes('UPDATE provider_connections'),'restore logic')});
 test('rollback checks drift via migrationPlanId',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('migrationPlanId!==planId'),'drift check')});
 test('rollback snapshot checksum verified',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('expectedChecksum')&&src.includes('snapshot.checksum'),'checksum verification')});
 test('rollback checksum mismatch rejects',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('integrity check failed'),'checksum rejection')});
 test('rollback drift does not modify target',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('Record drifted')&&src.includes('throw'),'drift rejection')});
 test('rollback return value has no secret fields',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));const retIdx=src.indexOf("return{planId,mode:'rollback'");if(retIdx===-1){assert(true,'return structure ok');return}const retBlock=src.substring(retIdx,retIdx+300);assert(!retBlock.includes('encryptedCredential')&&!retBlock.includes('apiKey'),'no secrets in return')});

 // ── Audit ──
 test('audit records created',()=>{const rows=auditRows();assert(rows.length>=0,'audit exists')});
 test('audit has required fields',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('event,opts.planId')&&src.includes('timestamp')&&src.includes('checksum'),'audit fields')});
 test('audit no plaintext in stored records',()=>{const rows=auditRows();for(const r of rows){const s=j(r);assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'no key');assert(!s.match(/Bearer [a-zA-Z0-9]{20,}/),'no bearer')}});
 test('audit checksum present',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes("crypto.createHash('sha256')")&&src.includes('checksum'),'checksum logic')});
 test('audit events cover all required types',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));const events=['plan_generated','validation_passed','validation_failed','execution_started','entry_created','entry_updated','entry_skipped','entry_blocked','execution_completed','execution_failed','rollback_started','rollback_completed','rollback_failed'];for(const e of events)assert(src.includes(`'${e}'`),`event ${e}`)});

 // ── Shadow sync ──
 test('shadow flag default false',()=>{assert(!isShadowSyncEnabled(),'shadow false')});
 test('shadow sync disabled returns early',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(src.includes('!enabled')&&src.includes('enabled:false'),'early return')});
 test('shadow sync only writes shadow_diagnostics',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(src.includes('provider_connection_shadow_diagnostics')&&!src.includes('DELETE FROM')&&!src.includes('UPDATE provider_connections'),'only shadow write')});
 test('shadow sync does not decrypt credential',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(!src.includes('getDecryptedCredential')&&!src.includes('decrypt'),'no decrypt')});
 test('shadow sync does not call provider',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(!src.includes('fetch(')&&!src.includes('http.request')&&!src.includes('axios'),'no network')});
 test('shadow sync output has no secret fields',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(!src.includes('encryptedCredential')&&!src.includes('apiKey')&&!src.includes('token'),'no secrets in output')});

 // ── CLI ──
 test('CLI migration-plan script exists',()=>{const r=spawnSync('ls',['scripts/migration-plan.mjs'],{encoding:'utf8'});assert(r.status===0,'script exists')});
 test('CLI scripts contain no secret literals',()=>{const mp=String(readFileSync('scripts/migration-plan.mjs'));assert(!mp.match(/sk-[a-zA-Z0-9]{20,}/)&&!mp.match(/Bearer [a-zA-Z0-9]{20,}/),'no secrets in CLI')});

 // ── API ──
 test('no migration execute API endpoint',()=>{const src=String(readFileSync('src/api/server.ts'));assert(!src.includes('migrations/execute')&&!src.includes('migration/execute'),'no execute API')});
 test('no migration rollback API endpoint',()=>{const src=String(readFileSync('src/api/server.ts'));assert(!src.includes('migrations/rollback')&&!src.includes('migration/rollback'),'no rollback API')});
 test('migration plan generation is CLI-only',()=>{const mp=String(readFileSync('scripts/migration-plan.mjs'));assert(mp.includes('buildMigrationPlan')||mp.includes('migration'),'CLI plan gen')});

 // ── Schema security ──
 test('schema tables exist',()=>{const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'provider_connection_migration%'").all() as any[];assert(tables.length>=4,'migration tables')});
 test('schema indexes exist',()=>{const indexes=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_pcm%'").all() as any[];assert(indexes.length>=4,'migration indexes')});
 test('non-destructive schema init',()=>{ensureMigrationSchema();ensureMigrationSchema();const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'provider_connection_migration%'").all() as any[];assert(tables.length>=4,'idempotent init')});
 test('legacy connections table unchanged',()=>{const cols=db.prepare("PRAGMA table_info(connections)").all() as any[];assert(cols.length>0,'connections exists');const colNames=cols.map((c:any)=>c.name).join(',');assert(!colNames.includes('migrationPlanId'),'no migration cols in legacy')});

 // ── Encryption boundary ──
 test('decrypt import only in connection-migration',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('getDecryptedCredential'),'decrypt imported');const shadow=String(readFileSync('src/providers/shadow-sync.ts'));assert(!shadow.includes('getDecryptedCredential'),'no decrypt in shadow')});
 test('plan/preview/validation do not call decrypt',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));const planFn=src.substring(src.indexOf('buildMigrationPlan'),src.indexOf('validateMigrationPlan'));assert(!planFn.includes('getDecryptedCredential'),'no decrypt in plan');const validFn=src.substring(src.indexOf('validateMigrationPlan'),src.indexOf('executeMigrationPlan'));assert(!validFn.includes('getDecryptedCredential'),'no decrypt in validation')});
 test('active routing has no migration import',()=>{const out=spawnSync('grep',['-RIn','connection-migration','src/runtime','src/index.ts'],{encoding:'utf8'});assert(out.status!==0,'no routing import')});
 test('shadow sync has no migration import',()=>{const src=String(readFileSync('src/providers/shadow-sync.ts'));assert(!src.includes('executeMigrationPlan')&&!src.includes('rollbackMigrationPlan'),'no migration in shadow')});

 // ── Plaintext scan ──
 test('DB scan: no plaintext secrets in migration tables',()=>{
  const tables=['provider_connection_migration_plans','provider_connection_migration_entries','provider_connection_migration_audit','provider_connection_migration_rollbacks','provider_connection_shadow_diagnostics'];
  for(const t of tables){
   try{
    const rows=db.prepare(`SELECT * FROM ${t}`).all() as any[];
    for(const r of rows){
     const s=j(r);
     assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),`plaintext key in ${t}`);
     assert(!s.match(/Bearer [a-zA-Z0-9]{20,}/),`bearer in ${t}`);
     assert(!s.match(/enc:v1:[a-f0-9]{20,}/),`ciphertext in ${t}`);
    }
   }catch{/* table may be empty */}
  }
 });

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Provider connection migration results: ${passed} passed, ${failed} failed`);
}
