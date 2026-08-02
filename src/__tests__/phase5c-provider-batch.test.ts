import { readFileSync } from 'node:fs';
import { getEndpointPolicy, validateEndpoint, getCertificationProfile, CERTIFICATION_CHECKS, CERTIFICATION_PROFILES, getDiscoveryFlags, canRunDiscovery, isTargetProvider, TARGET_PROVIDER_BATCH } from '../providers/phase5c-provider-batch.js';
import { buildProviderDescriptors } from '../providers/provider-foundation.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runPhase5CTests(){
 console.log('phase5c provider batch tests');

 test('openai endpoint policy exists',()=>{assert(getEndpointPolicy('openai')!==undefined,'exists')});
 test('anthropic endpoint policy exists',()=>{assert(getEndpointPolicy('anthropic')!==undefined,'exists')});
 test('google endpoint policy exists',()=>{assert(getEndpointPolicy('google')!==undefined,'exists')});
 test('xai endpoint policy exists',()=>{assert(getEndpointPolicy('xai')!==undefined,'exists')});
 test('cerebras endpoint policy exists',()=>{assert(getEndpointPolicy('cerebras')!==undefined,'exists')});
 test('unknown provider no policy',()=>{assert(getEndpointPolicy('nonexistent')===undefined,'none')});
 test('openai requires HTTPS',()=>{const p=getEndpointPolicy('openai');assert(p!==undefined&&p.requireHttps,'https')});
 test('ollama allows HTTP',()=>{const p=getEndpointPolicy('ollama');assert(p!==undefined&&!p.requireHttps,'http ok')});
 test('valid openai endpoint',()=>{const r=validateEndpoint('openai','https://api.openai.com/v1/chat/completions');assert(r.valid,'valid')});
 test('invalid host rejected',()=>{const r=validateEndpoint('openai','https://evil.com/v1/chat/completions');assert(!r.valid&&r.reason!==undefined,'host rejected')});
 test('invalid path rejected',()=>{const r=validateEndpoint('openai','https://api.openai.com/admin');assert(!r.valid,'path rejected')});
 test('HTTP rejected for openai',()=>{const r=validateEndpoint('openai','http://api.openai.com/v1/chat/completions');assert(!r.valid,'https required')});
 test('invalid URL rejected',()=>{const r=validateEndpoint('openai','not-a-url');assert(!r.valid,'invalid url')});
 test('no policy provider rejected',()=>{const r=validateEndpoint('nonexistent','https://example.com');assert(!r.valid,'no policy')});
 test('valid anthropic endpoint',()=>{assert(validateEndpoint('anthropic','https://api.anthropic.com/v1/messages').valid,'valid')});
 test('valid google endpoint',()=>{assert(validateEndpoint('google','https://generativelanguage.googleapis.com/v1beta/models').valid,'valid')});
 test('valid xai endpoint',()=>{assert(validateEndpoint('xai','https://api.x.ai/v1/chat/completions').valid,'valid')});
 test('valid cerebras endpoint',()=>{assert(validateEndpoint('cerebras','https://api.cerebras.ai/v1/chat/completions').valid,'valid')});
 test('valid ollama localhost',()=>{assert(validateEndpoint('ollama','http://localhost:11434/api/tags').valid,'valid')});
 test('ollama remote rejected',()=>{assert(!validateEndpoint('ollama','http://evil.com/api/tags').valid,'remote rejected')});
 test('dry-run profile exists',()=>{assert(getCertificationProfile('dry-run')!==undefined,'exists')});
 test('mock profile exists',()=>{assert(getCertificationProfile('mock')!==undefined,'exists')});
 test('live profile exists',()=>{assert(getCertificationProfile('live')!==undefined,'exists')});
 test('dry-run no network',()=>{const p=getCertificationProfile('dry-run');assert(p!==undefined&&!p.requiresNetwork,'no network')});
 test('dry-run no credential',()=>{const p=getCertificationProfile('dry-run');assert(p!==undefined&&!p.requiresCredential,'no cred')});
 test('mock no network',()=>{const p=getCertificationProfile('mock');assert(p!==undefined&&!p.requiresNetwork,'no network')});
 test('live requires network',()=>{const p=getCertificationProfile('live');assert(p!==undefined&&p.requiresNetwork,'network')});
 test('live requires credential',()=>{const p=getCertificationProfile('live');assert(p!==undefined&&p.requiresCredential,'cred')});
 test('live is billable',()=>{const p=getCertificationProfile('live');assert(p!==undefined&&p.billable,'billable')});
 test('certification checks defined',()=>{assert(CERTIFICATION_CHECKS.length>=8,'checks defined')});
 test('authentication check required',()=>{const c=CERTIFICATION_CHECKS.find(x=>x.name==='authentication');assert(c!==undefined&&c.required,'required')});
 test('discovery flags default false',()=>{const f=getDiscoveryFlags();assert(!f.discoveryEnabled&&!f.networkEnabled&&!f.persistEnabled,'all false')});
 test('canRunDiscovery blocked by default',()=>{const r=canRunDiscovery('openai');assert(!r.allowed,'blocked')});
 test('target batch includes openai',()=>{assert(isTargetProvider('openai'),'openai')});
 test('target batch includes google',()=>{assert(isTargetProvider('google'),'google')});
 test('target batch includes xai',()=>{assert(isTargetProvider('xai'),'xai')});
 test('target batch includes cerebras',()=>{assert(isTargetProvider('cerebras'),'cerebras')});
 test('target batch excludes anthropic',()=>{assert(!isTargetProvider('anthropic'),'not anthropic')});
 test('target batch size 4',()=>{assert(TARGET_PROVIDER_BATCH.length===4,'4 providers')});
 test('no routing imports',()=>{const s=src('src/providers/phase5c-provider-batch.ts');assert(!s.includes('RouterEngine'),'no routing')});
 test('no credential access',()=>{const s=src('src/providers/phase5c-provider-batch.ts');assert(!s.includes('credential-manager'),'no cred')});
 test('no decrypt',()=>{const s=src('src/providers/phase5c-provider-batch.ts');assert(!s.includes('decrypt'),'no decrypt')});
 test('no network',()=>{const s=src('src/providers/phase5c-provider-batch.ts');assert(!s.includes('fetch('),'no network')});
 test('scanner safe',()=>{const s=src('src/providers/phase5c-provider-batch.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});
 test('endpoint policy has allowed hosts',()=>{const p=getEndpointPolicy('openai');assert(p!==undefined&&p.allowedHosts.length>0,'hosts')});
 test('endpoint policy has allowed paths',()=>{const p=getEndpointPolicy('openai');assert(p!==undefined&&p.allowedPaths.length>0,'paths')});
 test('endpoint policy has timeout',()=>{const p=getEndpointPolicy('openai');assert(p!==undefined&&p.timeoutMs>0,'timeout')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Phase5C results: ${passed} passed, ${failed} failed`);
}
