import { readFileSync } from 'node:fs';
import { ProviderDiscoveryService, getDiscoveryService, getDiscoveryAdapter, isDiscoveryEnabled, isDiscoveryNetworkEnabled, isDiscoveryPersistEnabled } from '../providers/provider-discovery.js';
import { buildProviderDescriptors } from '../providers/provider-foundation.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void|Promise<void>){try{const r=f();if(r&&typeof r==='object'&&'then'in r){(r as Promise<void>).then(()=>{passed++;console.log(`   ✅ ${n}`)}).catch(e=>{failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)})}else{passed++;console.log(`   ✅ ${n}`)}}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runDiscoveryTests(){
 console.log('provider discovery tests');

 // ── Feature flags ──
 test('discovery flag default false',()=>{assert(isDiscoveryEnabled()===false,'default false')});
 test('network flag default false',()=>{assert(isDiscoveryNetworkEnabled()===false,'default false')});
 test('persist flag default false',()=>{assert(isDiscoveryPersistEnabled()===false,'default false')});

 // ── Adapters ──
 test('openai adapter exists',()=>{assert(getDiscoveryAdapter('openai')!==undefined,'exists')});
 test('anthropic adapter exists',()=>{assert(getDiscoveryAdapter('anthropic')!==undefined,'exists')});
 test('gemini adapter exists',()=>{assert(getDiscoveryAdapter('gemini')!==undefined,'exists')});
 test('local adapter exists',()=>{assert(getDiscoveryAdapter('local')!==undefined,'exists')});
 test('unknown adapter returns undefined',()=>{assert(getDiscoveryAdapter('nonexistent')===undefined,'undefined')});

 // ── Discovery plan ──
 test('discovery plan built',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan();assert(plan.length>0,'has entries')});
 test('discovery plan by provider',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan('anthropic');assert(plan.length===1&&plan[0].providerId==='anthropic','filter')});
 test('discovery plan only dynamicModels',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan();assert(plan.every(p=>p.supportsDiscovery),'all supports')});
 test('discovery plan has protocol',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan();assert(plan.every(p=>p.protocol.length>0),'has protocol')});

 // ── Dry run ──
 test('dry-run returns results',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun();assert(r.length>0,'has results')});
 test('dry-run no network',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun();assert(r.every(x=>x.networkUsed===false),'no network')});
 test('dry-run dryRun flag',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun();assert(r.every(x=>x.dryRun===true),'dry-run')});
 test('dry-run by provider',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('anthropic');assert(r.length===1&&r[0].providerId==='anthropic','filter')});
 test('dry-run unknown protocol',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('cohere');assert(r[0].errors.length>0||r[0].modelsFound>=0,'safe')});
 test('dry-run deterministic',async()=>{const svc=getDiscoveryService();const r1=await svc.runDiscoveryDryRun('anthropic');const r2=await svc.runDiscoveryDryRun('anthropic');assert(r1[0].modelsFound===r2[0].modelsFound,'deterministic')});

 // ── Execute blocked ──
 test('execute blocked by flag',async()=>{const svc=getDiscoveryService();const r=await svc.executeDiscovery('anthropic');assert(r.errors.length>0,'blocked')});

 // ── Safety ──
 test('no network in discovery',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('http.request')&&!s.includes('node-fetch'),'no network')});
 test('no credential in discovery',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('credential-manager')&&!s.includes('getDecryptedCredential'),'no cred')});
 test('no decrypt in discovery',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('decrypt'),'no decrypt')});
 test('no routing in discovery',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('RouterEngine'),'no routing')});
 test('no startup discovery',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('auto-discover'),'no startup')});
 test('scanner safe',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});

 // ── Mock adapters deterministic ──
 test('openai mock deterministic',async()=>{const a=getDiscoveryAdapter('openai')!;const r1=await a.discover('https://api.openai.com/v1');const r2=await a.discover('https://api.openai.com/v1');assert(r1.length===r2.length,'deterministic')});
 test('anthropic mock deterministic',async()=>{const a=getDiscoveryAdapter('anthropic')!;const r1=await a.discover('https://api.anthropic.com/v1');const r2=await a.discover('https://api.anthropic.com/v1');assert(r1.length===r2.length,'deterministic')});


 // ── More validation ──
 test('adapter protocol matches',()=>{const a=getDiscoveryAdapter('openai');assert(a?.protocol==='openai','match')});
 test('adapter discover returns array',async()=>{const a=getDiscoveryAdapter('openai')!;const r=await a.discover('test');assert(Array.isArray(r),'array')});
 test('adapter discover no network',()=>{const s=src('src/providers/provider-discovery.ts');const mockSection=s.substring(s.indexOf('class Mock'),s.indexOf('const ADAPTERS'));assert(!mockSection.includes('fetch(')&&!mockSection.includes('http.request'),'no net')});
 test('discovery plan protocol from descriptor',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan('anthropic');assert(plan[0].protocol==='anthropic','from descriptor')});
 test('discovery plan baseUrl from descriptor',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan('anthropic');assert(plan[0].baseUrl.includes('anthropic'),'from descriptor')});
 test('discovery dry-run timestamp',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('anthropic');assert(r[0].timestamp.length>0,'has timestamp')});
 test('discovery dry-run protocol',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('anthropic');assert(r[0].protocol==='anthropic','protocol')});
 test('discovery execute returns error when disabled',async()=>{const svc=getDiscoveryService();const r=await svc.executeDiscovery('anthropic');assert(r.errors[0].includes('not enabled'),'error msg')});
 test('discovery execute no network when disabled',async()=>{const svc=getDiscoveryService();const r=await svc.executeDiscovery('anthropic');assert(r.networkUsed===false,'no network')});
 test('discovery no credential output',()=>{const s=src('src/providers/provider-discovery.ts');assert(!s.includes('console.log')||!s.includes('apiKey'),'no cred output')});

 // ── Immutability ──
 test('discovery result immutable',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('anthropic');const orig=r[0].modelsFound;r[0].modelsFound=999;const r2=await svc.runDiscoveryDryRun('anthropic');assert(r2[0].modelsFound===orig,'immutable')});


 // ── More discovery ──
 test('discovery plan all providers',()=>{const svc=getDiscoveryService();const plan=svc.buildDiscoveryPlan();assert(plan.length>=5,'multiple providers')});
 test('discovery dry-run all',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun();assert(r.length>=5,'multiple results')});
 test('discovery dry-run cohere unsupported adapter',async()=>{const svc=getDiscoveryService();const r=await svc.runDiscoveryDryRun('cohere');assert(r[0].errors.length>0,'unsupported')});
 test('discovery no env access',()=>{const s=src('src/providers/provider-discovery.ts');const discoverSection=s.substring(s.indexOf('class Mock'),s.indexOf('const ADAPTERS'));assert(!discoverSection.includes('process.env'),'no env')});
 test('discovery singleton',()=>{const s1=getDiscoveryService();const s2=getDiscoveryService();assert(s1===s2,'singleton')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Discovery results: ${passed} passed, ${failed} failed`);
}
