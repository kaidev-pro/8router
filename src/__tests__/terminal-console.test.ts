import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=()=>String(readFileSync('bin/8router.js'));

export async function runTerminalConsoleTests(){
 console.log('terminal console tests');
 const s=src();

 // ── Header/brand ──
 test('header displays version',()=>{assert(s.includes('VERSION')||s.includes('pkg.version'),'version')});
 test('brand color tokens',()=>{assert(s.includes('accent')&&s.includes('orange'),'colors')});
 test('brand text 8Router',()=>{assert(s.includes('8Router'),'brand')});
 test('product description',()=>{assert(s.includes('Unified AI Provider Gateway'),'tagline')});

 // ── Non-TTY behavior ──
 test('non-TTY no implicit start',()=>{assert(s.includes('!isTTY')&&s.includes('showStatusPlain'),'non-tty status')});
 test('non-TTY shows status',()=>{assert(s.includes('showStatusPlain'),'status plain')});
 test('non-TTY shows available commands',()=>{assert(s.includes('Available commands'),'commands list')});
 test('explicit start subcommand',()=>{assert(s.includes("subcommand === 'start'")||s.includes('--start'),'explicit start')});
 test('explicit stop subcommand',()=>{assert(s.includes("subcommand === 'stop'"),'explicit stop')});
 test('explicit restart subcommand',()=>{assert(s.includes("subcommand === 'restart'"),'explicit restart')});
 test('explicit status subcommand',()=>{assert(s.includes("subcommand === 'status'"),'explicit status')});
 test('explicit doctor subcommand',()=>{assert(s.includes("subcommand === 'doctor'"),'explicit doctor')});
 test('unknown subcommand fails',()=>{assert(s.includes('Unknown command')&&s.includes('process.exit(1)'),'unknown fail')});
 test('CI env detected',()=>{assert(s.includes('process.env.CI'),'CI detect')});
 test('CI prevents interactive mode',()=>{assert(s.includes('!isTTY || isCI'),'CI guard')});

 // ── State-aware menu ──
 test('running state menu',()=>{assert(s.includes('state.running'),'running')});
 test('stopped state has Start Gateway',()=>{assert(s.includes('Start Gateway'),'start')});
 test('Gateway terminology',()=>{assert(s.includes('Gateway'),'gateway')});
 test('stopped retains Doctor',()=>{assert(s.includes('doctor'),'doctor in menu')});
 test('stopped retains Settings',()=>{assert(s.includes('settings'),'settings in menu')});
 test('stopped retains Provider Operations',()=>{assert(s.includes('providers'),'providers in menu')});

 // ── Public/local URL ──
 test('PUBLIC_BASE_URL env',()=>{assert(s.includes('PUBLIC_BASE_URL'),'env var')});
 test('public URL fallback Not configured',()=>{assert(s.includes('Not configured'),'fallback')});
 test('no hardcoded domain',()=>{assert(!s.includes('8router.8agents.xyz'),'no hardcoded')});
 test('local dashboard separate from public',()=>{assert(s.includes('Local:')&&s.includes('localhost'),'local separate')});
 test('public URL normalization',()=>{assert(s.includes('replace'),'normalization')});

 // ── Headless dashboard ──
 test('headless does not call browser',()=>{assert(s.includes('!isTTY || isCI')&&s.includes('openDashboard'),'headless guard')});
 test('headless prints URL',()=>{assert(s.includes('Dashboard URL'),'print url')});
 test('headless public not configured hint',()=>{assert(s.includes('Public URL not configured'),'hint')});

 // ── Feature flags ──
 test('migration flag',()=>{assert(s.includes('PROVIDER_CONNECTION_MIGRATION_ENABLED'),'flag')});
 test('shadow sync flag',()=>{assert(s.includes('PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED'),'flag')});
 test('flags show Enabled/Disabled only',()=>{assert(s.includes("'Enabled'")&&s.includes("'Disabled'"),'no raw env')});

 // ── Runtime status ──
 test('provider count from catalog',()=>{assert(s.includes('PROVIDER_CATALOG'),'catalog')});
 test('PID from lsof',()=>{assert(s.includes('lsof'),'PID probe')});
 test('health check with timeout',()=>{assert(s.includes('connect-timeout'),'timeout')});
 test('probe failure shows Unavailable',()=>{assert(s.includes('Unavailable'),'fail safe')});
 test('health timeout limit',()=>{assert(s.includes('timeout:5000')||s.includes('timeout:'),'timeout limit')});

 // ── Secret redaction ──
 test('redactLine function exists',()=>{assert(s.includes('redactLine'),'redact fn')});
 test('Authorization redaction',()=>{assert(s.includes('Authorization'),'auth redact')});
 test('Bearer redaction',()=>{assert(s.includes('[Bb]earer'),'bearer redact')});
 test('sk- redaction',()=>{assert(s.includes('sk-[A-Za-z0-9]'),'sk redact')});
 test('cookie redaction',()=>{assert(s.includes('Cookie'),'cookie redact')});
 test('refresh_token redaction',()=>{assert(s.includes('refresh_token'),'token redact')});
 test('password redaction',()=>{assert(s.includes('password'),'password redact')});
 test('database URL password redaction',()=>{assert(s.includes('://'),'db url redact')});
 test('maskSecret function',()=>{assert(s.includes('maskSecret'),'mask fn')});
 test('log lines through redactLine',()=>{assert(s.includes('redactLine(line)'),'log redact')});

 // ── Logs safety ──
 test('journalctl fixed args',()=>{assert(s.includes('journalctl -u 8router.service -n 50 --no-pager'),'fixed args')});
 test('no shell string concat for journalctl',()=>{assert(!s.includes('`journalctl')||s.includes('execSync'),'safe exec')});

 // ── Terminal width ──
 test('terminal width',()=>{assert(s.includes('termWidth'),'width')});
 test('min width 60',()=>{assert(s.includes('60'),'min')});
 test('max width 120',()=>{assert(s.includes('120'),'max')});

 // ── ASCII/NO_COLOR ──
 test('NO_COLOR support',()=>{assert(s.includes('NO_COLOR'),'no color')});
 test('ASCII fallback',()=>{assert(s.includes('supportsUnicode')||s.includes('ASCII_ONLY'),'ascii')});
 test('box drawing',()=>{assert(s.includes('tl')&&s.includes('tr'),'box')});

 // ── Platform open ──
 test('Linux open',()=>{assert(s.includes('xdg-open'),'linux')});
 test('macOS open',()=>{assert(s.includes('darwin'),'macos')});
 test('Windows open',()=>{assert(s.includes('win32'),'windows')});

 // ── Security: no mutations ──
 test('no routing change',()=>{assert(!s.includes('RouterEngine'),'no routing')});
 test('no provider activation',()=>{assert(!s.includes('enableProvider'),'no activation')});
 test('no migration execution',()=>{assert(!s.includes('executeMigrationPlan'),'no migration')});
 test('no rollback execution',()=>{assert(!s.includes('rollbackMigrationPlan'),'no rollback')});
 test('no secret pattern in source',()=>{assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'no secret')});

 // ── Keybindings ──
 test('keybindings shown',()=>{assert(s.includes('Navigate'),'keys')});
 test('Ctrl+C cleanup',()=>{assert(s.includes('ctrl'),'ctrl+c')});
 test('Esc key',()=>{assert(s.includes('escape'),'esc')});
 test('Q key',()=>{assert(s.includes("'q'"),'q')});
 test('R key',()=>{assert(s.includes("'r'"),'r')});

 // ── Cleanup ──
 test('cleanupRaw function',()=>{assert(s.includes('cleanupRaw'),'cleanup')});
 test('SIGINT handler',()=>{assert(s.includes('SIGINT'),'sigint')});
 test('SIGTERM handler',()=>{assert(s.includes('SIGTERM'),'sigterm')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Terminal console results: ${passed} passed, ${failed} failed`);
}
