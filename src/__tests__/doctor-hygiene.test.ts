// 8Router — Doctor Hygiene Semantics Tests

import { readFileSync } from 'fs';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const doctor = readFileSync('scripts/doctor.sh', 'utf8');

export function runDoctorHygieneTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  const test = (name: string, fn: () => void) => {
    try {
      fn();
      console.log(`   ✅ ${name}`);
      passed++;
    } catch (error: any) {
      console.error(`   ❌ ${name}: ${error.message}`);
      failed++;
    }
  };

  console.log('doctor hygiene tests');

  test('no configured provider produces NOT_CONFIGURED', () => {
    assert(doctor.includes('not_configured "/v1/chat/completions live test not configured'), 'not-configured chat branch missing');
  });

  test('NOT_CONFIGURED does not increment BLOCKED', () => {
    const line = doctor.split('\n').find(value => value.startsWith('not_configured()')) ?? '';
    assert(line.includes('NOT_CONFIGURED=$((NOT_CONFIGURED+1))'), 'NOT_CONFIGURED counter missing');
    assert(!line.includes('BLOCKED=$((BLOCKED+1))'), 'not_configured increments BLOCKED');
  });

  test('NOT_CONFIGURED does not increment WARNINGS', () => {
    const line = doctor.split('\n').find(value => value.startsWith('not_configured()')) ?? '';
    assert(!line.includes('WARNINGS=$((WARNINGS+1))'), 'not_configured increments WARNINGS');
  });

  test('NOT_CONFIGURED does not increment FAILURES', () => {
    const line = doctor.split('\n').find(value => value.startsWith('not_configured()')) ?? '';
    assert(!line.includes('FAILURES=$((FAILURES+1))'), 'not_configured increments FAILURES');
  });

  test('doctor exits 0 when only NOT_CONFIGURED remains', () => {
    assert(doctor.includes('if [ "$FAILURES" -gt 0 ]; then exit 1; fi'), 'exit gate must depend on failures');
    assert(!doctor.includes('if [ "$NOT_CONFIGURED" -gt 0 ]; then exit 1; fi'), 'NOT_CONFIGURED must not force exit 1');
  });

  test('configured but external dependency missing produces BLOCKED_EXTERNAL', () => {
    assert(doctor.includes('blocked "/v1/chat/completions live test blocked by external configuration'), 'blocked external configuration branch missing');
  });

  test('configured and unexpectedly failing provider produces FAIL', () => {
    assert(doctor.includes('fail "/v1/chat/completions live test failed'), 'live test fail branch missing');
  });

  test('successful live provider validation produces PASS', () => {
    assert(doctor.includes('ok "/v1/chat/completions provider-backed live test verified'), 'live success branch missing');
  });

  test('summary includes NOT_CONFIGURED', () => {
    assert(doctor.includes('NOT_CONFIGURED=$NOT_CONFIGURED'), 'summary missing NOT_CONFIGURED');
  });

  test('doctor does not claim provider-backed chat is verified when it is not', () => {
    assert(!doctor.includes('/v1/chat/completions working'), 'old unqualified chat success wording remains');
    assert(doctor.includes('live test not configured'), 'honest non-verified wording missing');
  });

  return { passed, failed };
}
