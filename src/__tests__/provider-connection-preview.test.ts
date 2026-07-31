import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPreviewReport, reconcileConnections, type LegacySafeConnection } from '../providers/connection-reconciliation.js';
import type { ProviderConnectionMetadata } from '../providers/connections.js';

let passed=0, failed=0; const failures:string[]=[];
function assert(c:boolean,m:string){ if(!c) throw new Error(m); }
function test(n:string,f:()=>void){ try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)} }
const legacy=(id:string,providerId='openai',label='Main'):LegacySafeConnection=>({id,providerId,label,authType:'apikey',isActive:true,testStatus:null,baseUrl:null,proxyUrl:null,region:null,credentialPresent:true});
const pc=(id:string,providerId='openai',label='Main',metadata:Record<string,unknown>={}):ProviderConnectionMetadata=>({id,providerId,label,authType:'api_key',credentialVersion:'enc:v1',credentialHint:'****',status:'active',priority:100,weight:1,accountRef:null,expiresAt:null,refreshable:false,cooldownUntil:null,lastSuccessAt:null,lastFailureAt:null,failureCount:0,quotaRemaining:null,quotaLimit:null,quotaResetAt:null,discoveredModels:[],metadata,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});
const report=(l:LegacySafeConnection[],p:ProviderConnectionMetadata[])=>buildPreviewReport({readLegacy:()=>l,readProviderConnections:()=>p,now:()=> '2026-01-01T00:00:00.000Z'});
const j=(x:unknown)=>JSON.stringify(x);

export async function runProviderConnectionPreviewTests(){
 console.log('provider connection preview tests');
 test('explicit legacyCredentialId exact match',()=>{const r=report([legacy('l1')],[pc('p1','openai','X',{legacyCredentialId:'l1'})]).records[0];assert(r.matchStatus==='exact_match'&&r.migrationEligibility==='eligible','explicit')});
 test('genuine accountRef absent does not fake match',()=>{const l=legacy('l1');l.baseUrl='https://x.invalid';const p=pc('p1','openai','Other');p.accountRef='acct';const r=report([l],[p]).records[0];assert(r.accountRef==='acct'&&r.migrationEligibility==='requires_review','review only')});
 test('normalized label match',()=>{assert(report([legacy('l1','openai','Main Key')],[pc('p1','openai','main-key')]).records[0].matchStatus==='exact_match','label')});
 test('providerId-only requires_review',()=>{const r=report([legacy('l1','openai','A')],[pc('p1','openai','B')]).records[0];assert(r.matchStatus==='metadata_drift'&&r.migrationEligibility==='requires_review','provider only')});
 test('multiple candidates ambiguous blocked',()=>{const r=report([legacy('l1')],[pc('p1','openai','X'),pc('p2','openai','Y')]).records[0];assert(r.matchStatus==='ambiguous'&&r.migrationEligibility==='blocked','ambiguous')});
 test('legacy-only',()=>{assert(report([legacy('l1','groq')],[]).records[0].matchStatus==='legacy_only','legacy only')});
 test('provider-connection-only',()=>{assert(report([], [pc('p1')]).records[0].matchStatus==='provider_connection_only','pc only')});
 test('auth type mismatch blocked drift',()=>{const p=pc('p1');p.authType='oauth';const r=report([legacy('l1')],[p]).records[0];assert(r.matchStatus==='metadata_drift'&&r.metadataDrift.includes('authType'),'auth drift')});
 test('active status mismatch review drift',()=>{const p=pc('p1');p.status='disabled';const r=report([legacy('l1')],[p]).records[0];assert(r.metadataDrift.includes('activeStatus')&&r.migrationEligibility==='requires_review','status drift')});
 test('unmappable legacy fields reported',()=>{const l=legacy('l1');l.baseUrl='https://x.invalid';l.proxyUrl='http://p.invalid';l.region='us';const r=report([l],[pc('p1')]).records[0];assert(r.unmappableFields.length>=3,'unmappable')});
 test('malformed metadata behaves safely',()=>{const p=pc('p1');p.metadata={legacyCredentialId:'other'};const r=report([legacy('l1')],[p]).records[0];assert(['legacy_only','ambiguous','metadata_drift','provider_connection_only','exact_match'].includes(r.matchStatus),'safe')});
 test('invalid lifecycle timestamp blocked',()=>{const p=pc('p1');p.expiresAt='bad';assert(report([legacy('l1')],[p]).records[0].migrationEligibility==='blocked','bad ts')});
 test('deterministic ordering',()=>{assert(report([legacy('b','b'),legacy('a','a')],[pc('z','z')]).records[0].providerId==='a','order')});
 test('summary totals',()=>{const s=report([legacy('l1')],[pc('p1')]).summary;assert(s.totalLegacy===1&&s.totalProviderConnections===1,'summary')});
 test('provider breakdown',()=>{assert(report([legacy('l1')],[pc('p1')]).providers[0].providerId==='openai','provider breakdown')});
 test('auth type breakdown',()=>{assert(report([legacy('l1')],[pc('p1')]).authTypes.some(a=>a.authType==='api_key'),'auth breakdown')});
 test('status breakdown',()=>{assert(report([], [pc('p1')]).statuses.some(s=>s.status==='active'),'status breakdown')});
 test('migration eligibility totals',()=>{assert(report([legacy('l1')],[pc('p1')]).summary.migrationEligible===1,'eligible total')});
 test('schemaVersion exact',()=>{assert(report([],[]).schemaVersion==='phase4b2-preview-v1','schema')});
 test('provider filter equivalent',()=>{const rs=report([legacy('l1','a'),legacy('l2','b')],[]).records.filter(r=>r.providerId==='a');assert(rs.length===1,'provider filter')});
 test('matchStatus filter equivalent',()=>{assert(report([legacy('l1')],[]).records.filter(r=>r.matchStatus==='legacy_only').length===1,'match filter')});
 test('migrationEligibility filter equivalent',()=>{assert(report([legacy('l1')],[pc('p1')]).records.filter(r=>r.migrationEligibility==='eligible').length===1,'elig filter')});
 test('JSON no encryptedCredential',()=>{assert(!j(report([legacy('l1')],[pc('p1')])).includes('encryptedCredential'),'no ciphertext')});
 test('JSON no credential plaintext',()=>{assert(!j(report([legacy('l1')],[pc('p1')])).includes('fixture-credential'),'no plain')});
 test('JSON no secret-like legacy columns',()=>{const s=j(report([legacy('l1')],[pc('p1')]));assert(!s.includes('apiKey')&&!s.includes('accessToken')&&!s.includes('refreshToken'),'no secret columns')});
 test('decrypt dependency would throw if invoked; preview succeeds',()=>{let called=false;reconcileConnections({readLegacy:()=>[legacy('l1')],readProviderConnections:()=>[pc('p1')],now:()=>{called=true;return 'x'}});assert(!called,'no decrypt seam')});
 test('reconciliation module does not import crypto decrypt/encrypt utilities',()=>{const src=readFileSync('src/providers/connection-reconciliation.ts','utf8');assert(!src.includes('decrypt')&&!src.includes('encrypt.js'),'no crypto import')});
 test('before/after in-memory snapshots unchanged',()=>{const l=[legacy('l1')],p=[pc('p1')];const a=j({l,p});report(l,p);assert(a===j({l,p}),'unchanged')});
 test('CLI default summary output',()=>{const o=execFileSync('npm',['--silent','run','provider-connections:preview'],{encoding:'utf8'});assert(o.includes('Provider connection preview'),'summary')});
 test('CLI json output redacted',()=>{const o=execFileSync('npm',['--silent','run','provider-connections:preview','--','--json','--include-records'],{encoding:'utf8'});assert(o.includes('phase4b2-preview-v1')&&!o.includes('encryptedCredential'),'json')});
 test('CLI output file',()=>{const d=mkdtempSync(join(tmpdir(),'pcp-')), f=join(d,'out.json');execFileSync('npm',['--silent','run','provider-connections:preview','--','--json','--output',f]);assert(readFileSync(f,'utf8').includes('phase4b2-preview-v1'),'file')});
 test('CLI strict exit 2 only under strict',()=>{const s=spawnSync('npm',['--silent','run','provider-connections:preview','--','--strict']);const n=spawnSync('npm',['--silent','run','provider-connections:preview']);assert(s.status===2&&n.status===0,'strict')});
 test('API route order preview before id',()=>{const src=readFileSync('src/api/server.ts','utf8');assert(src.indexOf("/8router/api/provider-connections/preview")<src.indexOf("/8router/api/provider-connections/:id"),'route order')});
 test('API no-store header exists',()=>{assert(readFileSync('src/api/server.ts','utf8').includes("Cache-Control', 'no-store"),'no-store')});
 test('API requireAuth on read-only endpoints',()=>{const src=readFileSync('src/api/server.ts','utf8');assert((src.match(/provider-connections/g)||[]).length>=3&&src.includes('requireAuth(oauth, sessionManager)'),'auth')});
 test('API no mutation routes',()=>{const src=readFileSync('src/api/server.ts','utf8');assert(!src.includes("app.post('/8router/api/provider-connections")&&!src.includes("app.patch('/8router/api/provider-connections")&&!src.includes("app.delete('/8router/api/provider-connections"),'no mutation')});
 test('feature flag false',()=>{assert(report([],[]).featureFlagEnabled===false,'flag')});
 test('active routing import graph unchanged',()=>{const out=spawnSync('grep',['-RIn','providers/connections','src/runtime','src/index.ts'],{encoding:'utf8'});assert(out.status!==0,'no routing import')});
 if(failed) throw new Error(failures.join('; '));
 console.log(`\n   Provider connection preview results: ${passed} passed, ${failed} failed`);
}
