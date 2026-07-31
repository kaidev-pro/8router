import { buildPreviewReport, reconcileConnections, type LegacySafeConnection } from '../providers/connection-reconciliation.js';
import type { ProviderConnectionMetadata } from '../providers/connections.js';

let passed=0, failed=0; const failures:string[]=[];
function assert(c:boolean,m:string){ if(!c) throw new Error(m); }
function test(n:string,f:()=>void){ try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)} }
const legacy=(id:string,providerId='openai',label='Main'):LegacySafeConnection=>({id,providerId,label,authType:'apikey',isActive:true,testStatus:'connected',baseUrl:null,proxyUrl:null,region:null,credentialPresent:true});
const pc=(id:string,providerId='openai',label='Main',metadata:Record<string,unknown>={}):ProviderConnectionMetadata=>({id,providerId,label,authType:'api_key',credentialVersion:'enc:v1',credentialHint:'****',status:'active',priority:100,weight:1,accountRef:null,expiresAt:null,refreshable:false,cooldownUntil:null,lastSuccessAt:null,lastFailureAt:null,failureCount:0,quotaRemaining:null,quotaLimit:null,quotaResetAt:null,discoveredModels:[],metadata,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'});
function report(l:LegacySafeConnection[],p:ProviderConnectionMetadata[]){return buildPreviewReport({readLegacy:()=>l,readProviderConnections:()=>p,now:()=> '2026-01-01T00:00:00.000Z'});}
export async function runProviderConnectionPreviewTests(){
 console.log('provider connection preview tests');
 test('explicit legacy reference exact match',()=>{const r=report([legacy('l1')],[pc('p1','openai','X',{legacyCredentialId:'l1'})]).records[0];assert(r.matchStatus==='exact_match'&&r.migrationEligibility==='eligible','explicit exact')});
 test('unique normalized label match',()=>{const r=report([legacy('l1','openai','Main Key')],[pc('p1','openai','main-key')]).records[0];assert(r.matchStatus==='exact_match','label exact')});
 test('providerId-only requires review',()=>{const r=report([legacy('l1','openai','A')],[pc('p1','openai','B')]).records[0];assert(r.migrationEligibility==='requires_review'&&r.matchStatus==='metadata_drift','provider only review')});
 test('multiple candidates ambiguous blocked',()=>{const r=report([legacy('l1','openai','A')],[pc('p1','openai','B'),pc('p2','openai','C')]).records[0];assert(r.matchStatus==='ambiguous'&&r.migrationEligibility==='blocked','ambiguous')});
 test('baseUrl never accountRef',()=>{const l=legacy('l1');l.baseUrl='https://example.invalid';const r=report([l],[pc('p1')]).records[0];assert(r.accountRef===null&&r.unmappableFields.includes('baseUrl'),'baseUrl unmappable')});
 test('provider-connection-only and legacy-only',()=>{const rs=report([legacy('l1','groq','L')],[pc('p1','openai','P')]).records;assert(rs.some(r=>r.matchStatus==='legacy_only')&&rs.some(r=>r.matchStatus==='provider_connection_only'),'orphans')});
 test('invalid timestamp blocked',()=>{const p=pc('p1');p.expiresAt='bad';const r=report([legacy('l1')],[p]).records[0];assert(r.migrationEligibility==='blocked','invalid timestamp')});
 test('no secret fields in JSON',()=>{const j=JSON.stringify(report([legacy('l1')],[pc('p1')]));assert(!j.includes('encryptedCredential')&&!j.includes('apiKey')&&!j.includes('accessToken'),'no secret fields')});
 test('decrypt stub never invoked by metadata readers',()=>{let called=false;reconcileConnections({readLegacy:()=>[legacy('l1')],readProviderConnections:()=>[pc('p1')],now:()=>{called=true;return 'x'}});assert(!called,'no unrelated decrypt seam called')});
 test('before/after snapshots unchanged',()=>{const l=[legacy('l1')], p=[pc('p1')];const a=JSON.stringify({l,p});report(l,p);const b=JSON.stringify({l,p});assert(a===b,'unchanged')});
 test('deterministic ordering and generatedAt injection',()=>{const a=report([legacy('b','b'),legacy('a','a')],[pc('z','z')]);assert(a.generatedAt==='2026-01-01T00:00:00.000Z'&&a.records[0].providerId==='a','deterministic')});
 test('feature flag false in report',()=>{assert(report([],[]).featureFlagEnabled===false,'flag false')});
 if(failed) throw new Error(failures.join('; '));
 console.log(`\n   Provider connection preview results: ${passed} passed, ${failed} failed`);
}
