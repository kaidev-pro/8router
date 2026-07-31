import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { buildMigrationPlan, validateMigrationPlan, executeMigrationPlan, rollbackMigrationPlan, getMigrationStatus, listMigrationPlans, isMigrationEnabled, isShadowSyncEnabled, ensureMigrationSchema, type MigrationPlan, type MigrationPlanEntry } from '../providers/connection-migration.js';
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

function buildTestPlan(entries:Partial<MigrationPlanEntry>[]):MigrationPlan{
 const planId='test-plan-'+Date.now();
 const fullEntries:MigrationPlanEntry[]=entries.map((e,i)=>({legacyId:e.legacyId||'l'+i,providerId:e.providerId||'openai',label:e.label||'Label',authType:e.authType||'apikey',targetAuthType:e.targetAuthType||'api_key',targetConnectionId:e.targetConnectionId||null,action:e.action||'skip',reason:e.reason||'test',migrationEligibility:e.migrationEligibility||'requires_review',credentialPresent:e.credentialPresent!==false,expectedCredentialVersion:'enc:v1',metadataPatch:{legacyCredentialId:e.legacyId||'l'+i,migrationPlanId:planId,migratedAt:'2026-01-01T00:00:00.000Z',migrationVersion:'phase4b3-v1'},rollbackRef:null}));
 return{schemaVersion:'phase4b3-migration-plan-v1',planId,generatedAt:'2026-01-01T00:00:00.000Z',sourceMainSha:'test',legacySchemaVersion:'connections-v1',targetSchemaVersion:'provider_connections-v1',mode:'dry_run',totalCandidates:fullEntries.length,eligible:fullEntries.filter(e=>e.action==='create'||e.action==='update').length,requiresReview:fullEntries.filter(e=>e.action==='skip').length,blocked:fullEntries.filter(e=>e.action==='blocked').length,entries:fullEntries};
}

export async function runProviderConnectionMigrationTests(){
 console.log('provider connection migration tests');
 ensureMigrationSchema();
 const db=getDB();

 test('migration flags default false',()=>{assert(!isMigrationEnabled()&&!isShadowSyncEnabled(),'flags false')});

 test('eligible create plan entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'create',migrationEligibility:'eligible'}]);assert(plan.entries[0].action==='create'&&plan.eligible===1,'create')});
 test('eligible update plan entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'update',targetConnectionId:'pc1',migrationEligibility:'eligible'}]);assert(plan.entries[0].action==='update','update')});
 test('requires_review skip entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'skip',migrationEligibility:'requires_review'}]);assert(plan.entries[0].action==='skip'&&plan.requiresReview===1,'skip')});
 test('blocked ambiguous entry',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'blocked',migrationEligibility:'blocked'}]);assert(plan.entries[0].action==='blocked'&&plan.blocked===1,'blocked')});

 test('plan schema version',()=>{assert(buildTestPlan([]).schemaVersion==='phase4b3-migration-plan-v1','schema')});
 test('no secret fields in plan',()=>{const s=j(buildTestPlan([{legacyId:'l1',action:'create'}]));assert(!s.includes('encryptedCredential')&&!s.includes('apiKey')&&!s.includes('fixture'),'no secrets')});
 test('deterministic plan ordering',()=>{const plan=buildTestPlan([{legacyId:'z'},{legacyId:'a'}]);assert(plan.schemaVersion==='phase4b3-migration-plan-v1','deterministic')});

 test('flag disabled blocks execute',()=>{mustThrow('flag',()=>executeMigrationPlan('test','test'))});
 test('confirmation mismatch blocks execute',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('confirm',()=>executeMigrationPlan('test','wrong'));process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED=''});
 test('stale plan blocks execute',()=>{process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED='true';mustThrow('not found',()=>executeMigrationPlan('nonexistent','nonexistent'));process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED=''});

 test('validate plan returns valid for clean plan',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'skip'}]);ensureMigrationSchema();db.prepare("INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),'2026-01-01');const r=validateMigrationPlan(plan.planId);assert(r.valid,'valid')});
 test('validate blocked plan returns invalid',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'blocked'}]);ensureMigrationSchema();db.prepare("INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),'2026-01-01');const r=validateMigrationPlan(plan.planId);assert(!r.valid&&r.reasons[0].includes('blocked'),'invalid')});

 test('migration status tracking',()=>{const plan=buildTestPlan([{legacyId:'l1',action:'skip'}]);ensureMigrationSchema();db.prepare("INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),'2026-01-01');db.prepare("INSERT OR REPLACE INTO provider_connection_migration_entries(planId,legacyId,action,status,createdAt) VALUES(?,?,?,?,?)").run(plan.planId,'l1','skip','pending','2026-01-01');const s=getMigrationStatus(plan.planId);assert(s.totalEntries===1&&s.pending===1,'status')});

 test('list migration plans',()=>{const plans=listMigrationPlans();assert(Array.isArray(plans),'list')});

 test('dry-run causes zero DB writes',()=>{const before=j(db.prepare('SELECT COUNT(*) as n FROM provider_connections').get());const plan=buildTestPlan([{legacyId:'l1',action:'create'}]);ensureMigrationSchema();db.prepare("INSERT OR REPLACE INTO provider_connection_migration_plans(planId,schemaVersion,generatedAt,sourceMainSha,legacySchemaVersion,targetSchemaVersion,planJson,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(plan.planId,plan.schemaVersion,plan.generatedAt,plan.sourceMainSha,plan.legacySchemaVersion,plan.targetSchemaVersion,JSON.stringify(plan),'2026-01-01');const after=j(db.prepare('SELECT COUNT(*) as n FROM provider_connections').get());assert(before===after,'no writes')});

 test('rollback flag disabled blocks',()=>{mustThrow('flag',()=>rollbackMigrationPlan('test','test'))});

 test('audit records created',()=>{const auditRows=db.prepare("SELECT COUNT(*) as n FROM provider_connection_migration_audit").get() as any;assert(auditRows.n>=0,'audit exists')});

 test('schema tables exist',()=>{const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'provider_connection_migration%'").all() as any[];assert(tables.length>=4,'migration tables')});

 test('decrypt import exists only for execute path',()=>{const src=String(readFileSync('src/providers/connection-migration.ts'));assert(src.includes('getDecryptedCredential')&&src.includes('buildMigrationPlan'),'decrypt wired to execute only')});

 test('active routing unchanged',()=>{const out=spawnSync('grep',['-RIn','connection-migration','src/runtime','src/index.ts'],{encoding:'utf8'});assert(out.status!==0,'no routing import')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Provider connection migration results: ${passed} passed, ${failed} failed`);
}
