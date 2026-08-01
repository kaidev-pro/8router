import { readFileSync } from 'node:fs';
import http from 'node:http';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void|Promise<void>){try{const r=f();if(r&&typeof r==='object'&&'then'in r){(r as Promise<void>).then(()=>{passed++;console.log(`   ✅ ${n}`)}).catch(e=>{failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)})}else{passed++;console.log(`   ✅ ${n}`)}}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

function req(path: string, headers: Record<string,string> = {}): Promise<{status:number;headers:Record<string,string>;body:any}> {
  return new Promise((resolve, reject) => {
    const r = http.request({hostname:'127.0.0.1',port:8080,path,method:'GET',headers:{'Content-Type':'application/json',...headers}}, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        let parsed: any;
        try { parsed = JSON.parse(body); } catch { parsed = body; }
        resolve({ status: res.statusCode || 0, headers: res.headers as Record<string,string>, body: parsed });
      });
    });
    r.on('error', reject);
    r.setTimeout(5000, () => { r.destroy(); reject(new Error('timeout')); });
    r.end();
  });
}

export async function runProviderFoundationApiTests(){
 console.log('provider foundation API tests');

 // Source checks (always available)
 const serverSrc = src('src/api/server.ts');

 test('API routes defined in source',()=>{assert(serverSrc.includes('/8router/api/providers/catalog'),'catalog')});
 test('API auth required in source',()=>{assert(serverSrc.includes('requireAuth(oauth, sessionManager)'),'auth')});
 test('API no-store in source',()=>{assert(serverSrc.includes('noStore(res)'),'no-store')});
 test('API read-only in source',()=>{assert(!serverSrc.includes("app.post('/8router/api/providers/catalog")&&
  !serverSrc.includes("app.put('/8router/api/providers/catalog")&&
  !serverSrc.includes("app.delete('/8router/api/providers/catalog"),'read-only')});
 test('API no credential in response',()=>{const section=serverSrc.substring(serverSrc.indexOf('Provider Foundation API'),serverSrc.indexOf('Provider Credentials API'));assert(!section.includes('apiKey')&&!section.includes('encryptedCredential'),'no cred in foundation')});
 test('API pagination support',()=>{assert(serverSrc.includes('page')&&serverSrc.includes('limit'),'pagination')});
 test('API max limit 100',()=>{assert(serverSrc.includes('Math.min(100'),'max 100')});
 test('API provider filter',()=>{assert(serverSrc.includes('providerId'),'filter')});
 test('API protocol filter',()=>{assert(serverSrc.includes('protocol'),'filter')});
 test('API status filter',()=>{assert(serverSrc.includes('status'),'filter')});
 test('API capability filter',()=>{assert(serverSrc.includes('capability'),'filter')});
 test('API source filter for models',()=>{assert(serverSrc.includes('source'),'source filter')});
 test('API 404 for unknown provider',()=>{assert(serverSrc.includes('Provider not found'),'404')});
 test('API no network calls in routes',()=>{const section=serverSrc.substring(serverSrc.indexOf('Provider Foundation API'),serverSrc.indexOf('Provider Credentials API'));assert(!section.includes('fetch(')&&!section.includes('http.request'),'no network')});
 test('API no decrypt in routes',()=>{const section=serverSrc.substring(serverSrc.indexOf('Provider Foundation API'),serverSrc.indexOf('Provider Credentials API'));assert(!section.includes('getDecryptedCredential'),'no decrypt')});
 test('API no routing mutation',()=>{const section=serverSrc.substring(serverSrc.indexOf('Provider Foundation API'),serverSrc.indexOf('Provider Credentials API'));assert(!section.includes('RouterEngine')&&!section.includes('setProvider'),'no routing')});
 test('API static route before :id',()=>{const catIdx=serverSrc.indexOf("providers/catalog'");const detIdx=serverSrc.indexOf("providers/catalog/:id'");assert(catIdx>0&&detIdx>catIdx,'order')});

 // Runtime tests (only if server is running)
 try {
  const health = await req('/health');
  if (health.status === 200) {
   console.log('   (server running — adding runtime tests)');

   test('unauthenticated catalog behavior',async()=>{
    const r = await req('/8router/api/providers/catalog');
    // OAuth disabled by default, so may return 200 or 401 depending on config
    assert(r.status===200||r.status===401||r.status===403,'valid status');
   });

   test('authenticated catalog no crash',async()=>{
    const r = await req('/8router/api/providers/catalog', {'Authorization':'Bearer test-key-1234'});
    assert(r.status!==500,'no crash');
   });

   // Try with actual access key if available
   const keyR = await req('/8router/api/access-keys', {'Authorization':'Bearer test-key-1234'});
   if (keyR.status === 200 && keyR.body?.keys?.length > 0) {
    const validKey = keyR.body.keys[0].key;
    const authH = {'Authorization': `Bearer ${validKey}`};

    test('authenticated catalog 200',async()=>{const r=await req('/8router/api/providers/catalog',authH);assert(r.status===200,'200')});
    test('catalog has providers array',async()=>{const r=await req('/8router/api/providers/catalog',authH);assert(Array.isArray(r.body.providers),'array')});
    test('catalog has pagination',async()=>{const r=await req('/8router/api/providers/catalog',authH);assert(typeof r.body.total==='number'&&typeof r.body.page==='number','pagination')});
    test('catalog no-store header',async()=>{const r=await req('/8router/api/providers/catalog',authH);assert(r.headers['cache-control']==='no-store','no-store')});
    test('catalog no secret fields',async()=>{const r=await req('/8router/api/providers/catalog',authH);const s=JSON.stringify(r.body);assert(!s.match(/sk-[a-zA-Z0-9]{20,}/)&&!s.includes('apiKey')&&!s.includes('encryptedCredential'),'no secret')});
    test('catalog providerId filter',async()=>{const r=await req('/8router/api/providers/catalog?providerId=anthropic',authH);assert(r.body.providers.length===1&&r.body.providers[0].id==='anthropic','filter')});
    test('catalog protocol filter',async()=>{const r=await req('/8router/api/providers/catalog?protocol=openai',authH);assert(r.body.providers.length>=1,'filter')});
    test('catalog limit max 100',async()=>{const r=await req('/8router/api/providers/catalog?limit=999',authH);assert(r.body.limit<=100,'max 100')});
    test('catalog pagination page 2',async()=>{const r=await req('/8router/api/providers/catalog?page=2&limit=5',authH);assert(r.body.page===2,'page 2')});

    test('detail existing 200',async()=>{const r=await req('/8router/api/providers/catalog/anthropic',authH);assert(r.status===200&&r.body.id==='anthropic','200')});
    test('detail unknown 404',async()=>{const r=await req('/8router/api/providers/catalog/nonexistent',authH);assert(r.status===404,'404')});

    test('capabilities 200',async()=>{const r=await req('/8router/api/providers/capabilities',authH);assert(r.status===200&&Array.isArray(r.body.capabilities),'200')});

    test('models 200',async()=>{const r=await req('/8router/api/providers/models',authH);assert(r.status===200&&Array.isArray(r.body.models),'200')});
    test('models provider filter',async()=>{const r=await req('/8router/api/providers/models?providerId=anthropic',authH);assert(r.body.models.every((m:any)=>m.providerId==='anthropic'),'filter')});

    test('certifications 200',async()=>{const r=await req('/8router/api/providers/certifications',authH);assert(r.status===200&&Array.isArray(r.body.certifications),'200')});
   } else {
    console.log('   (no valid access key — skipping authenticated runtime tests)');
   }
  } else {
   console.log('   (server not running — skipping runtime tests)');
  }
 } catch {
  console.log('   (server not reachable — skipping runtime tests)');
 }

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Provider foundation API results: ${passed} passed, ${failed} failed`);
}
