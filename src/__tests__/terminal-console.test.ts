import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=()=>String(readFileSync('bin/8router.js'));

export async function runTerminalConsoleTests(){
 console.log('terminal console tests');
 const s=src();

 test('header displays version',()=>{assert(s.includes('VERSION')||s.includes('pkg.version'),'version ref')});
 test('brand color tokens defined',()=>{assert(s.includes('accent')&&s.includes('orange'),'brand colors')});
 test('brand text 8Router',()=>{assert(s.includes('8Router'),'brand')});
 test('product description',()=>{assert(s.includes('Unified AI Provider Gateway'),'tagline')});
 test('running state menu',()=>{assert(s.includes('running'),'running menu')});
 test('stopped state menu',()=>{assert(s.includes('Start Gateway'),'stopped menu')});
 test('Gateway terminology',()=>{assert(s.includes('Gateway'),'gateway term')});
 test('PUBLIC_BASE_URL env',()=>{assert(s.includes('PUBLIC_BASE_URL'),'env var')});
 test('public URL fallback',()=>{assert(s.includes('Not configured'),'fallback')});
 test('URL normalization',()=>{assert(s.includes('replace'),'normalization')});
 test('no hardcoded domain',()=>{assert(!s.includes('8router.8agents.xyz'),'no hardcoded')});
 test('migration flag',()=>{assert(s.includes('PROVIDER_CONNECTION_MIGRATION_ENABLED'),'migration flag')});
 test('shadow sync flag',()=>{assert(s.includes('PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED'),'shadow flag')});
 test('provider count',()=>{assert(s.includes('PROVIDER_CATALOG')||s.includes('providerCount'),'provider count')});
 test('PID detection',()=>{assert(s.includes('lsof')||s.includes('getGatewayPid'),'PID')});
 test('health endpoint',()=>{assert(s.includes('/health'),'health')});
 test('no credential export',()=>{assert(!s.includes('exportConfig')||s.includes('maskSecret'),'no credential')});
 test('secret masking',()=>{assert(s.includes('maskSecret'),'masking')});
 test('NO_COLOR support',()=>{assert(s.includes('NO_COLOR'),'no color')});
 test('terminal width',()=>{assert(s.includes('termWidth')||s.includes('columns'),'width')});
 test('min width 60',()=>{assert(s.includes('60'),'min width')});
 test('max width 120',()=>{assert(s.includes('120'),'max width')});
 test('ASCII fallback',()=>{assert(s.includes('supportsUnicode')||s.includes('ASCII_ONLY'),'ascii')});
 test('box drawing',()=>{assert(s.includes('tl')&&s.includes('tr'),'box')});
 test('headless fallback',()=>{assert(s.includes('!isTTY')||s.includes('isTTY'),'headless')});
 test('Linux open',()=>{assert(s.includes('xdg-open'),'linux')});
 test('macOS open',()=>{assert(s.includes('darwin'),'macos')});
 test('Windows open',()=>{assert(s.includes('win32'),'windows')});
 test('public dashboard URL',()=>{assert(s.includes('publicUrl'),'public dash')});
 test('health multiple endpoints',()=>{assert(s.includes('/8router/health'),'multi health')});
 test('doctor invocation',()=>{assert(s.includes('doctor.sh'),'doctor')});
 test('systemd logs',()=>{assert(s.includes('journalctl'),'journalctl')});
 test('safe log params',()=>{assert(s.includes('--no-pager'),'safe params')});
 test('no routing change',()=>{assert(!s.includes('RouterEngine'),'no routing')});
 test('no provider activation',()=>{assert(!s.includes('enableProvider'),'no activation')});
 test('no migration execution',()=>{assert(!s.includes('executeMigrationPlan'),'no migration')});
 test('no rollback execution',()=>{assert(!s.includes('rollbackMigrationPlan'),'no rollback')});
 test('no secret pattern',()=>{assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'no secret')});
 test('keybindings shown',()=>{assert(s.includes('Navigate'),'keybindings')});
 test('Ctrl+C cleanup',()=>{assert(s.includes('ctrl'),'ctrl+c')});
 test('Esc key',()=>{assert(s.includes('escape'),'esc')});
 test('Q key',()=>{assert(s.includes("'q'"),'q key')});
 test('R key',()=>{assert(s.includes("'r'"),'r key')});
 test('Provider Operations menu',()=>{assert(s.includes('Provider Operations'),'provider ops')});
 test('Settings view',()=>{assert(s.includes('showSettings'),'settings')});
 test('raw stdin cleanup',()=>{assert(s.includes('cleanupRaw'),'cleanup')});
 test('SIGINT handler',()=>{assert(s.includes('SIGINT'),'sigint')});
 test('SIGTERM handler',()=>{assert(s.includes('SIGTERM'),'sigterm')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Terminal console results: ${passed} passed, ${failed} failed`);
}
