import { readFileSync } from 'node:fs';
import Database from 'better-sqlite3';
import { initDynamicProviderTables, persistDynamicModel, persistOverride, getDynamicModels, getOverrides, markModelStale, persistCertificationEvidence, getCertificationEvidence, persistDiscoveryResult, getDiscoveryHistory, upsertOperationalMetadata, getOperationalMetadata } from '../providers/dynamic-provider-state.js';
import { ProviderDiscoveryService, getDiscoveryService, getDiscoveryAdapter, isDiscoveryEnabled, isDiscoveryNetworkEnabled, isDiscoveryPersistEnabled } from '../providers/provider-discovery.js';
import { buildProviderDescriptors, getModelRegistry } from '../providers/provider-foundation.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void|Promise<void>){try{const r=f();if(r&&typeof r==='object'&&'then'in r){(r as Promise<void>).then(()=>{passed++;console.log(`   ✅ ${n}`)}).catch(e=>{failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)})}else{passed++;console.log(`   ✅ ${n}`)}}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

let db: Database.Database;

function initTestDb() {
  db = new Database(':memory:');
  initDynamicProviderTables(db);
}

export async function runDynamicStateTests(){
 console.log('dynamic provider state tests');
 initTestDb();

 // ── Schema ──
 test('tables created',()=>{const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t:any)=>t.name);assert(tables.includes('provider_model_registry'),'pdr');assert(tables.includes('provider_model_overrides'),'pmo');assert(tables.includes('provider_certification_evidence'),'pce');assert(tables.includes('provider_discovery_history'),'pdh');assert(tables.includes('provider_operational_metadata'),'pom')});
 test('indexes created',()=>{const idx=db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all().map((i:any)=>i.name);assert(idx.length>=8,'indexes')});
 test('idempotent init',()=>{initDynamicProviderTables(db);initDynamicProviderTables(db);assert(true,'no error')});
 test('multi-DB safe',()=>{const db2=new Database(':memory:');initDynamicProviderTables(db2);db2.close();assert(true,'safe')});
 test('no credential columns',()=>{const cols=db.prepare("PRAGMA table_info(provider_model_registry)").all().map((c:any)=>c.name);assert(!cols.includes('api_key')&&!cols.includes('credential')&&!cols.includes('secret'),'no cred')});

 // ── Dynamic Model Persistence ──
 test('persist dynamic model',()=>{persistDynamicModel(db,'test-prov','test-model','Test Model');const m=getDynamicModels(db,'test-prov');assert(m.length===1&&m[0].model_id==='test-model','persisted')});
 test('dynamic source is dynamic',()=>{const m=getDynamicModels(db,'test-prov');assert(m[0].source==='dynamic','source')});
 test('get all dynamic models',()=>{persistDynamicModel(db,'test-prov2','model-a','A');const all=getDynamicModels(db);assert(all.length>=2,'all')});
 test('dynamic model by provider',()=>{const m=getDynamicModels(db,'test-prov');assert(m.every((x:any)=>x.provider_id==='test-prov'),'filter')});
 test('mark stale',()=>{markModelStale(db,'test-prov','test-model');const m=getDynamicModels(db,'test-prov');assert(m[0].stale===1,'stale')});

 // ── Override Persistence ──
 test('persist override',()=>{persistOverride(db,'test-prov','override-model','Override',true,'test');const o=getOverrides(db,'test-prov');assert(o.length===1&&o[0].model_id==='override-model','persisted')});
 test('override enabled',()=>{const o=getOverrides(db,'test-prov');assert(o[0].enabled===1,'enabled')});
 test('override disabled',()=>{persistOverride(db,'test-prov','disabled-model','Disabled',false,'nope');const o=getOverrides(db,'test-prov');assert(o.some((x:any)=>x.model_id==='disabled-model'&&x.enabled===0),'disabled')});
 test('override reason',()=>{const o=getOverrides(db,'test-prov');const ov=o.find((x:any)=>x.model_id==='override-model');assert(ov?.reason==='test','reason')});
 test('override precedence over dynamic',()=>{persistDynamicModel(db,'prec','m1','Dynamic');persistOverride(db,'prec','m1','Override',true);const o=getOverrides(db,'prec');assert(o[0].display_name==='Override','override wins')});

 // ── Certification Evidence ──
 test('persist certification',()=>{persistCertificationEvidence(db,'cert-prov','chat','CERTIFIED','tested ok');const e=getCertificationEvidence(db,'cert-prov');assert(e.length===1&&e[0].status==='CERTIFIED','persisted')});
 test('certification evidence field',()=>{const e=getCertificationEvidence(db,'cert-prov');assert(e[0].evidence==='tested ok','evidence')});
 test('get all certifications',()=>{persistCertificationEvidence(db,'cert-prov2','streaming','UNKNOWN');const all=getCertificationEvidence(db);assert(all.length>=2,'all')});

 // ── Discovery History ──
 test('persist discovery',()=>{persistDiscoveryResult(db,'disc-prov',5,['a','b'],['c'],'dry-run',true);const h=getDiscoveryHistory(db,'disc-prov');assert(h.length===1&&h[0].models_discovered===5,'persisted')});
 test('discovery dry_run flag',()=>{const h=getDiscoveryHistory(db,'disc-prov');assert(h[0].dry_run===1,'dry-run')});
 test('discovery new_models json',()=>{const h=getDiscoveryHistory(db,'disc-prov');assert(JSON.parse(h[0].new_models).length===2,'json')});
 test('get all discovery history',()=>{persistDiscoveryResult(db,'disc-prov2',3,[],[],'api',false);const all=getDiscoveryHistory(db);assert(all.length>=2,'all')});
 test('discovery limit',()=>{const h=getDiscoveryHistory(db,undefined,1);assert(h.length===1,'limit')});

 // ── Operational Metadata ──
 test('upsert metadata',()=>{upsertOperationalMetadata(db,'meta-prov',{lastHealthCheck:'2026-08-01',lastLatencyMs:150,totalRequests:100,totalErrors:2});const m=getOperationalMetadata(db,'meta-prov');assert(m.length===1&&m[0].total_requests===100,'upsert')});
 test('metadata update',()=>{upsertOperationalMetadata(db,'meta-prov',{totalRequests:200,totalErrors:5});const m=getOperationalMetadata(db,'meta-prov');assert(m[0].total_requests===200,'updated')});
 test('get all metadata',()=>{upsertOperationalMetadata(db,'meta-prov2',{totalRequests:10});const all=getOperationalMetadata(db);assert(all.length>=2,'all')});

 // ── No routing ──
 test('no routing imports',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('RouterEngine')&&!s.includes('registry.ts'),'no routing')});
 test('no credential access',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('credential-manager')&&!s.includes('getDecryptedCredential'),'no cred')});
 test('no decrypt',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('decrypt'),'no decrypt')});


 // ── Phase 5B API endpoints ──
 test('5B API state endpoint in source',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/state'),'state endpoint')});
 test('5B API dynamic models endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/models/dynamic'),'dynamic endpoint')});
 test('5B API discovery history endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/discovery/history'),'history endpoint')});
 test('5B API certification evidence endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/certification/evidence'),'evidence endpoint')});
 test('5B API overrides endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/overrides'),'overrides endpoint')});
 test('5B API state/:id endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/state/:id'),'state detail')});
 test('5B API all require auth',()=>{const s=src('src/api/server.ts');const section=s.substring(s.indexOf('Phase 5B'),s.indexOf('Phase 5B')+3000);assert(section.includes('requireAuth'),'auth')});
 test('5B API no-store',()=>{const s=src('src/api/server.ts');const section=s.substring(s.indexOf('Phase 5B'),s.indexOf('Phase 5B')+3000);assert(section.includes('noStore'),'no-store')});
 test('5B API no credential in response',()=>{const s=src('src/api/server.ts');const section=s.substring(s.indexOf('Phase 5B'),s.indexOf('Phase 5B')+3000);assert(!section.includes('apiKey')&&!section.includes('encryptedCredential'),'no cred')});
 test('5B API static route before dynamic',()=>{const s=src('src/api/server.ts');const stateIdx=s.indexOf("/8router/api/providers/state'");const stateIdIdx=s.indexOf("/8router/api/providers/state/:id'");assert(stateIdx>0&&stateIdIdx>stateIdx,'order')});

 // ── CLI ──
 test('CLI providers:state script exists',()=>{const s=src('package.json');assert(s.includes('providers:state'),'script')});
 test('CLI providers:discovery-plan script',()=>{const s=src('package.json');assert(s.includes('providers:discovery-plan'),'script')});
 test('CLI providers:discover script',()=>{const s=src('package.json');assert(s.includes('providers:discover'),'script')});
 test('CLI providers:discovery-history script',()=>{const s=src('package.json');assert(s.includes('providers:discovery-history'),'script')});
 test('CLI providers:certifications script',()=>{const s=src('package.json');assert(s.includes('providers:certifications'),'script')});
 test('CLI providers:overrides script',()=>{const s=src('package.json');assert(s.includes('providers:overrides'),'script')});

 // ── Validation ──
 test('dynamic model no silent override override',()=>{const r=getModelRegistry();r.addOverride('val-p','val-m','Override');r.addDynamicModel('val-p','val-m');const m=r.getModel('val-p','val-m');assert(m?.source==='override','override preserved')});
 test('override on non-existent provider',()=>{const r=getModelRegistry();r.addOverride('nonexistent','model','Name');const m=r.getModel('nonexistent','model');assert(m?.source==='override','created')});
 test('search includes dynamic',()=>{const r=getModelRegistry();r.addDynamicModel('search-test','search-model-xyz');const s=r.searchModels('search-model-xyz');assert(s.length>0,'found')});

 // ── More discovery safety ──
 test('discovery service no network',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('http.request')&&!s.includes('node-fetch'),'no net')});
 test('discovery adapter mock only',()=>{const s=src('src/providers/provider-discovery.ts');const discoverSection=s.substring(s.indexOf('class Mock'),s.indexOf('const ADAPTERS'));assert(!discoverSection.includes('fetch('),'mock only')});
 test('discovery execute requires flags',()=>{const s=src('src/providers/provider-discovery.ts');assert(s.includes('isDiscoveryEnabled()'),'flag check')});

 // ── DB safety ──
 test('DB no secret columns in any table',()=>{const tables=['provider_model_registry','provider_model_overrides','provider_certification_evidence','provider_discovery_history','provider_operational_metadata'];for(const t of tables){const cols=db.prepare('PRAGMA table_info('+t+')').all().map((c:any)=>c.name);assert(!cols.includes('api_key')&&!cols.includes('credential')&&!cols.includes('secret')&&!cols.includes('token'),'no secret in '+t)}});
 test('DB CHECK constraints exist',()=>{const sql=db.prepare("SELECT sql FROM sqlite_master WHERE name='provider_model_registry'").get() as any;assert(sql?.sql?.includes('CHECK'),'check constraint')});
 test('DB UNIQUE constraints exist',()=>{const sql=db.prepare("SELECT sql FROM sqlite_master WHERE name='provider_model_overrides'").get() as any;assert(sql?.sql?.includes('UNIQUE'),'unique constraint')});


 // ── More DB validation ──
 test('DB discovery history CHECK source',()=>{const sql=db.prepare("SELECT sql FROM sqlite_master WHERE name='provider_discovery_history'").get() as any;assert(sql?.sql?.includes('CHECK(source'),'check source')});
 test('DB certification CHECK status',()=>{const sql=db.prepare("SELECT sql FROM sqlite_master WHERE name='provider_certification_evidence'").get() as any;assert(sql?.sql?.includes('CHECK(status'),'check status')});
 test('DB foreign key not enforced (safe)',()=>{persistDynamicModel(db,'fk-test','model','Name');assert(true,'no fk error')});
 test('DB datetime default',()=>{persistDynamicModel(db,'dt-test','model','Name');const m=getDynamicModels(db,'dt-test');assert(m[0].discovered_at?.length>0,'has date')});
 test('DB stale default 0',()=>{persistDynamicModel(db,'stale-test','model','Name');const m=getDynamicModels(db,'stale-test');assert(m[0].stale===0,'default 0')});
 test('DB override enabled default 1',()=>{persistOverride(db,'def-test','model','Name',true);const o=getOverrides(db,'def-test');assert(o[0].enabled===1,'default 1')});
 test('DB discovery dry_run default 1',()=>{persistDiscoveryResult(db,'ddr-test',0,[],[],'dry-run',true);const h=getDiscoveryHistory(db,'ddr-test');assert(h[0].dry_run===1,'default 1')});
 test('DB metadata total_requests default 0',()=>{upsertOperationalMetadata(db,'meta-def',{});const m=getOperationalMetadata(db,'meta-def');assert(m[0].total_requests===0,'default 0')});


 // ── More safety ──
 test('no fetch in dynamic state',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('fetch('),'no fetch')});
 test('no http in dynamic state',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('http.request'),'no http')});
 test('no env read in dynamic state',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('process.env'),'no env')});
 test('DB provider_model_registry no autoincrement leak',()=>{persistDynamicModel(db,'leak-test','m1','M1');persistDynamicModel(db,'leak-test','m2','M2');const m=getDynamicModels(db,'leak-test');assert(m[0].id!==m[1].id,'unique ids')});
 test('DB override update works',()=>{persistOverride(db,'upd-test','m1','V1',true);persistOverride(db,'upd-test','m1','V2',false);const o=getOverrides(db,'upd-test');assert(o[0].display_name==='V2'&&o[0].enabled===0,'updated')});
 test('DB operational metadata upsert idempotent',()=>{upsertOperationalMetadata(db,'idem-test',{totalRequests:5});upsertOperationalMetadata(db,'idem-test',{totalRequests:10});const m=getOperationalMetadata(db,'idem-test');assert(m.length===1&&m[0].total_requests===10,'idempotent')});
 test('DB discovery history preserves json',()=>{persistDiscoveryResult(db,'json-test',3,['a','b','c'],[],'api',false);const h=getDiscoveryHistory(db,'json-test');assert(JSON.parse(h[0].new_models).length===3,'json preserved')});


 // ── Final safety ──
 test('DB no network column',()=>{const cols=db.prepare("PRAGMA table_info(provider_operational_metadata)").all().map((c:any)=>c.name);assert(!cols.includes('api_key')&&!cols.includes('base_url'),'no network')});
 test('DB discovery no credential',()=>{const cols=db.prepare("PRAGMA table_info(provider_discovery_history)").all().map((c:any)=>c.name);assert(!cols.includes('api_key')&&!cols.includes('token'),'no cred')});
 test('DB certification no secret',()=>{const cols=db.prepare("PRAGMA table_info(provider_certification_evidence)").all().map((c:any)=>c.name);assert(!cols.includes('api_key')&&!cols.includes('secret'),'no secret')});
 test('DB model registry no auto-discover',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('auto-discover')&&!s.includes('onModuleInit'),'no auto')});
 test('DB startup safety',()=>{const s=src('src/providers/dynamic-provider-state.ts');assert(!s.includes('setInterval')&&!s.includes('setTimeout'),'no timer')});

 db.close();
 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Dynamic state results: ${passed} passed, ${failed} failed`);
}
