import { readFileSync } from 'node:fs';
import { isHardeningEnabled, checkRateLimit, resetAllRateLimits, getCircuitState, recordCircuitSuccess, recordCircuitFailure, resetAllCircuits, createLogEntry, sanitizeLogEntry, DEFAULT_TIMEOUTS, validateTimeouts, getHealthReport, buildRCValidationMatrix, DEFAULT_RETENTION, validateRetentionPolicy } from '../providers/production-hardening.js';

let passed=0,failed=0;const failures:string[]=[];
function assert(c:boolean,m:string){if(!c)throw new Error(m)}
function test(n:string,f:()=>void){try{f();passed++;console.log(`   ✅ ${n}`)}catch(e){failed++;const m=e instanceof Error?e.message:String(e);failures.push(`${n}: ${m}`);console.log(`   ❌ ${n}: ${m}`)}}
const src=(f:string)=>String(readFileSync(f));

export async function runPhase5FTests(){
 console.log('phase5f production hardening tests');

 // ── Feature flag ──
 test('hardening flag default false',()=>{assert(!isHardeningEnabled(),'false')});

 // ── Rate limiter ──
 resetAllRateLimits();
 test('rate limit allows first request',()=>{const r=checkRateLimit('test-key',{windowMs:60000,maxRequests:10});assert(r.allowed&&r.remaining===9,'allowed')});
 test('rate limit tracks remaining',()=>{const r=checkRateLimit('test-key',{windowMs:60000,maxRequests:10});assert(r.remaining===8,'tracked')});
 test('rate limit blocks when exceeded',()=>{for(let i=0;i<8;i++)checkRateLimit('test-key',{windowMs:60000,maxRequests:10});const r=checkRateLimit('test-key',{windowMs:60000,maxRequests:10});assert(!r.allowed&&r.reason==='rate_limit_exceeded','blocked')});
 test('rate limit resets',()=>{resetAllRateLimits();const r=checkRateLimit('test-key',{windowMs:60000,maxRequests:10});assert(r.allowed&&r.remaining===9,'reset')});
 test('rate limit per-key isolation',()=>{resetAllRateLimits();checkRateLimit('key-a',{windowMs:60000,maxRequests:1});const r=checkRateLimit('key-b',{windowMs:60000,maxRequests:1});assert(r.allowed,'isolated')});
 test('rate limit has resetAt',()=>{resetAllRateLimits();const r=checkRateLimit('test',{windowMs:60000,maxRequests:10});assert(r.resetAt.length>0,'has resetAt')});

 // ── Circuit breaker ──
 resetAllCircuits();
 const cbConfig = { failureThreshold: 3, resetTimeoutMs: 1000, halfOpenMaxRequests: 1 };
 test('circuit starts closed',()=>{const c=getCircuitState('cb-test',cbConfig);assert(c.state==='closed','closed')});
 test('circuit records failure',()=>{recordCircuitFailure('cb-test',cbConfig);const c=getCircuitState('cb-test',cbConfig);assert(c.failureCount===1,'failure')});
 test('circuit opens after threshold',()=>{recordCircuitFailure('cb-test',cbConfig);recordCircuitFailure('cb-test',cbConfig);const c=getCircuitState('cb-test',cbConfig);assert(c.state==='open','open')});
 test('circuit success resets count',()=>{resetAllCircuits();recordCircuitFailure('cb-succ',cbConfig);recordCircuitSuccess('cb-succ');const c=getCircuitState('cb-succ',cbConfig);assert(c.failureCount===0,'reset')});
 test('circuit has lastFailureAt',()=>{resetAllCircuits();recordCircuitFailure('cb-ts',cbConfig);const c=getCircuitState('cb-ts',cbConfig);assert(c.lastFailureAt!==null,'has ts')});
 test('circuit has nextRetryAt when open',()=>{resetAllCircuits();for(let i=0;i<3;i++)recordCircuitFailure('cb-retry',cbConfig);const c=getCircuitState('cb-retry',cbConfig);assert(c.nextRetryAt!==null,'has retry')});

 // ── Structured logging ──
 test('log entry created',()=>{const e=createLogEntry('info','test message',{correlationId:'c1'});assert(e.level==='info'&&e.message==='test message'&&e.correlationId==='c1','created')});
 test('log entry has timestamp',()=>{const e=createLogEntry('info','ts');assert(e.timestamp.length>0,'has ts')});
 test('sanitize removes secrets',()=>{const e=createLogEntry('info','test',{metadata:{apiKey:'sk-abc123',safe:'ok'}});const s=sanitizeLogEntry(e);assert(s.metadata?.apiKey==='[REDACTED]'&&s.metadata?.safe==='ok','sanitized')});
 test('sanitize handles no metadata',()=>{const e=createLogEntry('info','no-meta');const s=sanitizeLogEntry(e);assert(s.message==='no-meta','ok')});

 // ── Timeout policy ──
 test('default timeouts defined',()=>{assert(DEFAULT_TIMEOUTS.connectMs===5000&&DEFAULT_TIMEOUTS.requestMs===30000,'defaults')});
 test('valid timeouts pass',()=>{const r=validateTimeouts({connectMs:5000,requestMs:30000});assert(r.valid,'valid')});
 test('invalid connectMs rejected',()=>{const r=validateTimeouts({connectMs:50});assert(!r.valid&&r.errors.length>0,'rejected')});
 test('invalid requestMs rejected',()=>{const r=validateTimeouts({requestMs:500});assert(!r.valid,'rejected')});
 test('empty timeouts valid',()=>{const r=validateTimeouts({});assert(r.valid,'valid')});

 // ── Health / readiness ──
 test('health report healthy',()=>{const r=getHealthReport([{component:'db',status:'healthy',detail:'ok'}]);assert(r.status==='healthy','healthy')});
 test('health report degraded',()=>{const r=getHealthReport([{component:'db',status:'healthy',detail:'ok'},{component:'cache',status:'degraded',detail:'slow'}]);assert(r.status==='degraded','degraded')});
 test('health report unhealthy',()=>{const r=getHealthReport([{component:'db',status:'unhealthy',detail:'down'}]);assert(r.status==='unhealthy','unhealthy')});
 test('health report has uptime',()=>{const r=getHealthReport([]);assert(r.uptime>=0,'uptime')});
 test('health report has timestamp',()=>{const r=getHealthReport([]);assert(r.timestamp.length>0,'timestamp')});

 // ── RC validation matrix ──
 test('RC matrix built',()=>{const m=buildRCValidationMatrix([{category:'unit',suite:'test',passed:10,failed:0,skipped:0}]);assert(m.totalPassed===10&&m.ready,'built')});
 test('RC matrix not ready on failure',()=>{const m=buildRCValidationMatrix([{category:'unit',suite:'test',passed:9,failed:1,skipped:0}]);assert(!m.ready,'not ready')});
 test('RC matrix has timestamp',()=>{const m=buildRCValidationMatrix([]);assert(m.timestamp.length>0,'timestamp')});
 test('RC matrix totals',()=>{const m=buildRCValidationMatrix([{category:'unit',suite:'a',passed:5,failed:0,skipped:1},{category:'runtime_api',suite:'b',passed:3,failed:0,skipped:0}]);assert(m.totalPassed===8&&m.totalSkipped===1,'totals')});

 // ── Retention policy ──
 test('default retention defined',()=>{assert(DEFAULT_RETENTION.historyDays===90&&DEFAULT_RETENTION.evidenceDays===365,'defaults')});
 test('valid retention passes',()=>{const r=validateRetentionPolicy({historyDays:90});assert(r.valid,'valid')});
 test('invalid historyDays rejected',()=>{const r=validateRetentionPolicy({historyDays:1});assert(!r.valid,'rejected')});
 test('empty retention valid',()=>{const r=validateRetentionPolicy({});assert(r.valid,'valid')});

 // ── Safety ──
 test('no routing imports',()=>{const s=src('src/providers/production-hardening.ts');assert(!s.includes('RouterEngine'),'no routing')});
 test('no credential access',()=>{const s=src('src/providers/production-hardening.ts');assert(!s.includes('credential-manager'),'no cred')});
 test('no decrypt',()=>{const s=src('src/providers/production-hardening.ts');assert(!s.includes('decrypt'),'no decrypt')});
 test('no network',()=>{const s=src('src/providers/production-hardening.ts');assert(!s.includes('fetch(')&&!s.includes('http.request'),'no network')});
 test('scanner safe',()=>{const s=src('src/providers/production-hardening.ts');assert(!s.match(/sk-[a-zA-Z0-9]{20,}/),'clean')});
 test('log sanitization removes secrets',()=>{const e=createLogEntry('info','test',{metadata:{authorization:'Bearer sk-abc1234567890abcdefghij',password:'secret123'}});const s=sanitizeLogEntry(e);assert(s.metadata?.authorization==='[REDACTED]'&&s.metadata?.password==='[REDACTED]','sanitized')});

 if(failed)throw new Error(failures.join('; '));
 console.log(`\n   Phase5F results: ${passed} passed, ${failed} failed`);
}
