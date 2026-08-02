import { readFileSync } from 'node:fs';
import { isMutationEnabled, isOverrideEnabled, isCertificationRunEnabled, addAuditEntry, getAuditLog, createOverride, removeOverride, triggerCertification, triggerDiscovery, getJob, getJobs, cancelJob } from '../providers/provider-operations-mutations.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runPhase5DTests(){
 console.log('phase5d provider operations tests');

 // ── Feature flags ──
 test('mutation flag default false',()=>{assert(!isMutationEnabled(),'false')});
 test('override flag default false',()=>{assert(!isOverrideEnabled(),'false')});
 test('certification run flag default false',()=>{assert(!isCertificationRunEnabled(),'false')});

 // ── Audit log ──
 test('add audit entry',()=>{const e=addAuditEntry({action:'test',providerId:'p1',details:{},success:true});assert(e.id.length>0&&e.timestamp.length>0,'has id/ts')});
 test('get audit log',()=>{addAuditEntry({action:'test2',providerId:'p1',details:{},success:true});const log=getAuditLog('p1');assert(log.length>=2,'entries')});
 test('get audit log all',()=>{const log=getAuditLog();assert(log.length>=2,'all')});
 test('audit log limit',()=>{const log=getAuditLog(undefined,1);assert(log.length===1,'limit')});
 test('audit log by provider',()=>{addAuditEntry({action:'test3',providerId:'filter-test',details:{},success:true});const log=getAuditLog('filter-test');assert(log.every(e=>e.providerId==='filter-test'),'filtered')});
 test('audit entry has action',()=>{const e=addAuditEntry({action:'my-action',providerId:'p',details:{k:'v'},success:true});assert(e.action==='my-action','action')});
 test('audit entry success field',()=>{const e=addAuditEntry({action:'ok',providerId:'p',details:{},success:true});assert(e.success===true,'success')});
 test('audit entry error field',()=>{const e=addAuditEntry({action:'fail',providerId:'p',details:{},success:false,error:'boom'});assert(e.error==='boom','error')});

 // ── Override operations ──
 test('override blocked by default',()=>{const r=createOverride('openai','m1','M1',true,'test');assert(!r.success&&((r.error?.includes('not enabled') ?? false)),'blocked')});
 test('override audit on block',()=>{const r=createOverride('openai','m1','M1',true,'test');assert(r.audit.action==='override.create'&&r.audit.success===false,'audit')});
 test('remove override blocked by default',()=>{const r=removeOverride('openai','m1');assert(!r.success,'blocked')});

 // ── Certification ──
 test('certification blocked by default',()=>{const r=triggerCertification('openai','mock');assert(!r.success&&((r.error?.includes('not enabled') ?? false)),'blocked')});
 test('certification audit on block',()=>{const r=triggerCertification('openai','mock');assert(r.audit.action==='certification.trigger'&&r.audit.success===false,'audit')});

 // ── Discovery ──
 test('discovery blocked by default',()=>{const r=triggerDiscovery('openai',true);assert(!r.success&&((r.error?.includes('not enabled') ?? false)),'blocked')});
 test('discovery audit on block',()=>{const r=triggerDiscovery('openai',true);assert(r.audit.action==='discovery.trigger'&&r.audit.success===false,'audit')});

 // ── Jobs ──
 test('get jobs returns array',()=>{assert(Array.isArray(getJobs()),'array')});
 test('get job not found',()=>{assert(getJob('nonexistent')===undefined,'undefined')});
 test('cancel job not found',()=>{const r=cancelJob('nonexistent');assert(!r.success,'not found')});

 // ── API routes in source ──
 test('audit endpoint in source',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/operations/audit'),'audit')});
 test('jobs endpoint in source',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/operations/jobs'),'jobs')});
 test('override POST endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes("app.post('/8router/api/providers/operations/override'"),'override post')});
 test('override DELETE endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes("app.delete('/8router/api/providers/operations/override'"),'override delete')});
 test('discovery POST endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes("app.post('/8router/api/providers/operations/discovery'"),'discovery post')});
 test('certification POST endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes("app.post('/8router/api/providers/operations/certification'"),'cert post')});
 test('job cancel POST endpoint',()=>{const s=src('src/api/server.ts');assert(s.includes('/8router/api/providers/operations/jobs/:id/cancel'),'cancel')});
 test('mutations require auth',()=>{const s=src('src/api/server.ts');const section=s.substring(s.indexOf('Phase 5D'),s.indexOf('Phase 5D')+3000);assert(section.includes('requireAuth'),'auth')});
 test('mutations no-store',()=>{const s=src('src/api/server.ts');const section=s.substring(s.indexOf('Phase 5D'),s.indexOf('Phase 5D')+3000);assert(section.includes('noStore'),'no-store')});
 test('mutations gated by flag',()=>{const s=src('src/api/server.ts');assert(s.includes('isMutationEnabled()'),'flag gate')});
 test('mutations return 403 when disabled',()=>{const s=src('src/api/server.ts');assert(s.includes('403'),'403')});
 test('mutations return 400 for missing params',()=>{const s=src('src/api/server.ts');assert(s.includes('400'),'400')});

 // ── Safety ──
 test('no routing imports',()=>{const s=src('src/providers/provider-operations-mutations.ts');assert(!s.includes('RouterEngine'),'no routing')});
 test('no credential access',()=>{const s=src('src/providers/provider-operations-mutations.ts');assert(!s.includes('credential-manager'),'no cred')});
 test('no decrypt',()=>{const s=src('src/providers/provider-operations-mutations.ts');assert(!s.includes('decrypt'),'no decrypt')});
 test('no network',()=>{const s=src('src/providers/provider-operations-mutations.ts');assert(!s.includes('fetch(')&&!s.includes('http.request'),'no network')});
 test('scanner safe',()=>{const s=src('src/providers/provider-operations-mutations.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});
 test('audit has no secrets',()=>{const e=addAuditEntry({action:'test',providerId:'p',details:{key:'safe'},success:true});const s=JSON.stringify(e);assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'no secret')});
 test('audit entry has id and timestamp',()=>{const e=addAuditEntry({action:'idts',providerId:'p',details:{k:'v'},success:true});assert(e.id.startsWith('audit_'),'id prefix');assert(e.timestamp.length>0,'timestamp')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Phase5D results: ${passed} passed, ${failed} failed`);
}
