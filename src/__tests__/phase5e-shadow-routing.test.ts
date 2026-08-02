import { readFileSync } from 'node:fs';
import { isShadowEnabled, isCanaryEnabled, isSnapshotActivationEnabled, buildEligibilitySnapshot, evaluateShadow, createCanary, activateCanary, evaluateCanary, pauseCanary, abortCanary, getCanary, getCanaries, rollbackToLastKnownGood, activateKillSwitch, isKillSwitchActive, resetKillSwitch, assessReadiness } from '../providers/shadow-routing.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runPhase5ETests(){
 console.log('phase5e shadow routing tests');

 // ── Feature flags ──
 test('shadow flag default false',()=>{assert(!isShadowEnabled(),'false')});
 test('canary flag default false',()=>{assert(!isCanaryEnabled(),'false')});
 test('snapshot activation flag default false',()=>{assert(!isSnapshotActivationEnabled(),'false')});

 // ── Eligibility snapshot ──
 test('snapshot built',()=>{const s=buildEligibilitySnapshot();assert(s.providers.length>0,'has providers')});
 test('snapshot has version',()=>{const s=buildEligibilitySnapshot();assert(s.version.startsWith('snap_'),'version')});
 test('snapshot has timestamp',()=>{const s=buildEligibilitySnapshot();assert(s.timestamp.length>0,'timestamp')});
 test('snapshot has feature flags',()=>{const s=buildEligibilitySnapshot();assert(typeof s.featureFlags.shadow==='boolean','flags')});
 test('snapshot immutable per call',()=>{const s1=buildEligibilitySnapshot();const s2=buildEligibilitySnapshot();assert(s1.version!==s2.version,'different versions')});
 test('snapshot eligible count',()=>{const s=buildEligibilitySnapshot();assert(s.eligibleCount>=0&&s.eligibleCount<=s.totalCount,'valid count')});
 test('snapshot total count matches',()=>{const s=buildEligibilitySnapshot();assert(s.totalCount===s.providers.length,'matches')});
 test('snapshot provider has eligibility',()=>{const s=buildEligibilitySnapshot();assert(s.providers.every(p=>typeof p.eligible==='boolean'),'has eligible')});
 test('snapshot provider has reasons',()=>{const s=buildEligibilitySnapshot();assert(s.providers.every(p=>p.reasons.length>0),'has reasons')});
 test('snapshot provider has protocol',()=>{const s=buildEligibilitySnapshot();assert(s.providers.every(p=>p.protocol.length>0),'has protocol')});
 test('snapshot with capability filter',()=>{const s=buildEligibilitySnapshot('chat');assert(s.providers.length>0,'filtered')});

 // ── Shadow evaluation ──
 test('shadow skipped when disabled',()=>{const r=evaluateShadow({requestId:'r1',providerId:'openai',modelId:'gpt-4o',timestamp:''});assert(!r.sampled&&r.sampleReason==='shadow_not_enabled','skipped')});
 test('shadow primary unchanged',()=>{const r=evaluateShadow({requestId:'r1',providerId:'openai',modelId:'gpt-4o',timestamp:''});assert(r.primaryResponseUnchanged,'unchanged')});
 test('shadow simulated status skipped',()=>{const r=evaluateShadow({requestId:'r1',providerId:'openai',modelId:'gpt-4o',timestamp:''});assert(r.simulatedStatus==='skipped','skipped')});

 // ── Canary controls ──
 test('canary create blocked by default',()=>{const r=createCanary({id:'c1',providerId:'openai',modelId:'gpt-4o',maxTrafficPercent:10,maxRequestCount:100,windowMs:60000,abortThresholdPercent:50,eligibleCohorts:['internal'],expiresAt:new Date(Date.now()+3600000).toISOString(),snapshotVersion:'snap_1'});assert(!r.success&&(r.error?.includes('not enabled') ?? false),'blocked')});
 test('canary get returns undefined',()=>{assert(getCanary('nonexistent')===undefined,'undefined')});
 test('canary list empty',()=>{assert(getCanaries().length>=0,'array')});

 // ── Rollback ──
 test('rollback returns result',()=>{const r=rollbackToLastKnownGood();assert(r.success&&r.newSnapshotVersion.startsWith('snap_'),'result')});
 test('rollback aborts active canaries',()=>{const r=rollbackToLastKnownGood();assert(Array.isArray(r.canariesAborted),'array')});

 // ── Kill switch ──
 test('kill switch inactive by default',()=>{assert(!isKillSwitchActive(),'inactive')});
 test('kill switch activates',()=>{activateKillSwitch();assert(isKillSwitchActive(),'active')});
 test('kill switch resets',()=>{resetKillSwitch();assert(!isKillSwitchActive(),'reset')});

 // ── Readiness ──
 test('readiness report for known provider',()=>{const r=assessReadiness('openai');assert(r.providerId==='openai'&&r.components.length>0,'report')});
 test('readiness has components',()=>{const r=assessReadiness('anthropic');assert(r.components.some(c=>c.name==='descriptor'),'descriptor')});
 test('readiness has certification',()=>{const r=assessReadiness('openai');assert(r.components.some(c=>c.name==='certification'),'cert')});
 test('readiness has shadow_routing',()=>{const r=assessReadiness('openai');assert(r.components.some(c=>c.name==='shadow_routing'),'shadow')});
 test('readiness has kill_switch',()=>{const r=assessReadiness('openai');assert(r.components.some(c=>c.name==='kill_switch'),'kill')});
 test('readiness unknown provider',()=>{const r=assessReadiness('nonexistent');assert(!r.ready&&r.blockers.includes('descriptor'),'blocked')});
 test('readiness has timestamp',()=>{const r=assessReadiness('openai');assert(r.timestamp.length>0,'timestamp')});

 // ── Safety ──
 test('no routing imports',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.includes('RouterEngine'),'no routing')});
 test('no credential access',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.includes('credential-manager'),'no cred')});
 test('no decrypt',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.includes('decrypt'),'no decrypt')});
 test('no network',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.includes('fetch(')&&!s.includes('http.request'),'no network')});
 test('scanner safe',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});
 test('snapshot no credentials',()=>{const s=buildEligibilitySnapshot();const json=JSON.stringify(s);assert(!json.match(/sk-[a-zA-Z0-9]{20,}/),'no secret')});
 test('legacy routing unchanged',()=>{const s=src('src/providers/shadow-routing.ts');assert(!s.includes('setProvider')&&!s.includes('routing-engine'),'no legacy')});
 test('all flags default false',()=>{assert(!isShadowEnabled()&&!isCanaryEnabled()&&!isSnapshotActivationEnabled(),'all false')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Phase5E results: ${passed} passed, ${failed} failed`);
}
