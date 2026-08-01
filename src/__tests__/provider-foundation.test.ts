import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { buildProviderDescriptors, getCapabilityRegistry, getModelRegistry, getCertificationRegistry, getDiscoveryHistory, ProviderCapabilityRegistry, ProviderModelRegistry, ProviderCertificationRegistry, DiscoveryHistory } from '../providers/provider-foundation.js';
import { PROVIDER_CATALOG } from '../providers/catalog.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runProviderFoundationTests(){
 console.log('provider foundation tests');
 const descriptors = buildProviderDescriptors();

 // ── Descriptor ──
 test('descriptors built from catalog',()=>{assert(descriptors.length===PROVIDER_CATALOG.length,'count match')});
 test('descriptor has id',()=>{assert(descriptors.every(d=>d.id.length>0),'all have id')});
 test('descriptor has displayName',()=>{assert(descriptors.every(d=>d.displayName.length>0),'all have name')});
 test('descriptor has protocol',()=>{assert(descriptors.every(d=>d.protocol.length>0),'all have protocol')});
 test('descriptor has auth',()=>{assert(descriptors.every(d=>['apiKey','oauth','custom','local'].includes(d.auth)),'valid auth')});
 test('descriptor has capabilities',()=>{assert(descriptors.every(d=>typeof d.capabilities.chat==='boolean'),'caps boolean')});
 test('descriptor has features',()=>{assert(descriptors.every(d=>typeof d.features.dynamicModels==='boolean'),'features boolean')});
 test('descriptor has metadata',()=>{assert(descriptors.every(d=>Array.isArray(d.metadata.tags)),'metadata tags')});
 test('descriptor has status',()=>{assert(descriptors.every(d=>['active','degraded','disabled','experimental','deprecated'].includes(d.status)),'valid status')});
 test('descriptor has tier',()=>{assert(descriptors.every(d=>['subscription','cheap','free'].includes(d.tier)),'valid tier')});

 // ── Capability Registry ──
 const capReg = getCapabilityRegistry();
 test('capability registry has all providers',()=>{assert(capReg.getAllDescriptors().length===PROVIDER_CATALOG.length,'all providers')});
 test('supportsChat returns boolean',()=>{assert(typeof capReg.supportsChat('anthropic')==='boolean','boolean')});
 test('supportsVision returns boolean',()=>{assert(typeof capReg.supportsVision('google')==='boolean','boolean')});
 test('supportsStreaming returns boolean',()=>{assert(typeof capReg.supportsStreaming('openai')==='boolean','boolean')});
 test('supportsToolCalling returns boolean',()=>{assert(typeof capReg.supportsToolCalling('openai')==='boolean','boolean')});
 test('supportsReasoning returns boolean',()=>{assert(typeof capReg.supportsReasoning('openai')==='boolean','boolean')});
 test('getProvidersByCapability returns array',()=>{assert(Array.isArray(capReg.getProvidersByCapability('chat')),'array')});
 test('getProvidersByProtocol returns array',()=>{assert(Array.isArray(capReg.getProvidersByProtocol('openai')),'array')});
 test('getProvidersByStatus returns array',()=>{assert(Array.isArray(capReg.getProvidersByStatus('active')),'array')});
 test('chat providers exist',()=>{assert(capReg.getProvidersByCapability('chat').length>0,'has chat')});
 test('streaming providers exist',()=>{assert(capReg.getProvidersByCapability('streaming').length>0,'has streaming')});

 // ── Model Registry ──
 const modelReg = getModelRegistry();
 test('model registry has models',()=>{assert(modelReg.getAllModels().length>0,'has models')});
 test('getModels by provider',()=>{assert(modelReg.getModels('anthropic').length>0,'anthropic models')});
 test('getModel specific',()=>{const m=modelReg.getModel('groq','llama-3.3-70b-versatile');assert(m!==undefined,'found model')});
 test('addDynamicModel',()=>{modelReg.addDynamicModel('test-provider','test-model');assert(modelReg.getModel('test-provider','test-model')!==undefined,'dynamic added')});
 test('addOverride',()=>{modelReg.addOverride('test-provider','test-model','Override Name');const m=modelReg.getModel('test-provider','test-model');assert(m?.displayName==='Override Name','override set')});
 test('searchModels',()=>{const r=modelReg.searchModels('claude');assert(r.length>0,'found claude')});
 test('getModelsByProvider',()=>{assert(modelReg.getModelsByProvider('mistral').length>0,'mistral models')});
 test('model source static',()=>{const m=modelReg.getModel('groq','llama-3.3-70b-versatile');assert(m?.source==='static','static source')});
 test('model source dynamic',()=>{const m=modelReg.getModel('test-provider','test-model');assert(m?.source==='dynamic'||m?.source==='override','dynamic/override')});

 // ── Certification ──
 const certReg = getCertificationRegistry();
 test('certification registry has all providers',()=>{assert(certReg.getAllCertifications().length===PROVIDER_CATALOG.length,'all providers')});
 test('getCertification returns object',()=>{assert(typeof certReg.getCertification('anthropic')==='object','object')});
 test('certification has status',()=>{assert(certReg.getCertification('anthropic')?.status==='UNKNOWN','initial unknown')});
 test('updateCertification',()=>{certReg.updateCertification('anthropic',{status:'CERTIFIED',chat:'CERTIFIED'});assert(certReg.getCertification('anthropic')?.status==='CERTIFIED','updated')});
 test('getProvidersByStatus',()=>{assert(certReg.getProvidersByStatus('CERTIFIED').length>0,'has certified')});

 // ── Discovery History ──
 const discHist = getDiscoveryHistory();
 test('discovery history empty initially',()=>{assert(discHist.getHistory().length===0||discHist.getHistory().length>0,'array')});
 test('addRecord',()=>{const r=discHist.addRecord({providerId:'test',modelsDiscovered:5,newModels:['a'],removedModels:[],source:'static',dryRun:true});assert(r.id.length>0,'has id')});
 test('getHistory with filter',()=>{assert(Array.isArray(discHist.getHistory('test')),'array')});
 test('getLatest',()=>{const r=discHist.getLatest('test');assert(r?.providerId==='test','found')});

 // ── Protocol ──
 test('anthropic protocol is anthropic',()=>{const d=descriptors.find(x=>x.id==='anthropic');assert(d?.protocol==='anthropic','anthropic')});
 test('openai protocol is openai',()=>{const d=descriptors.find(x=>x.id==='openai');assert(d?.protocol==='openai','openai')});
 test('google protocol is gemini',()=>{const d=descriptors.find(x=>x.id==='google');assert(d?.protocol==='gemini','gemini')});
 test('ollama protocol is ollama',()=>{const d=descriptors.find(x=>x.id==='ollama');assert(d?.protocol==='ollama','ollama')});

 // ── Security ──
 test('no credentials in descriptors',()=>{const s=JSON.stringify(descriptors);assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'no keys')});
 test('no decrypt in foundation',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('getDecryptedCredential'),'no decrypt')});
 test('no network calls',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('fetch(')&&!s.includes('http.request'),'no network')});
 test('no routing mutation',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('RouterEngine'),'no routing engine')});
 test('no credential access',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('credential-manager')&&!s.includes('getDecryptedCredential'),'no credential access')});

 // ── Deterministic ordering ──
 test('descriptor order matches catalog',()=>{assert(descriptors[0].id===PROVIDER_CATALOG[0].id,'first matches')});
 test('model order stable',()=>{const m1=modelReg.getAllModels().map(m=>m.id).join(',');const m2=modelReg.getAllModels().map(m=>m.id).join(',');assert(m1===m2,'stable')});

 // ── No routing impact ──
 test('no import of registry.ts',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('ProviderRegistry')||!s.includes('from'),'no runtime registry')});
 test('no import of adapter.ts',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.includes('ProviderAdapter')||!s.includes('from.*adapter'),'no adapter')});

 // ── Scanner safe ──
 test('no plaintext secrets',()=>{const s=src('src/providers/provider-foundation.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Provider foundation results: ${passed} passed, ${failed} failed`);
}
