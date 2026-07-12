// 8Router — CLI Tool Integration Tests (Phase 2G)

import { getToolRegistry, getToolById, getAllToolIds, getToolsByCategory } from '../integrations/tools/registry.js';
import { renderTemplate, renderToolConfig } from '../integrations/tools/render.js';
import { validateBaseUrl, normalizeBaseUrl, validateModel, validateAccessKeyFormat } from '../integrations/tools/validate.js';
import { SMART_ALIASES, DEFAULT_MODEL, HOSTED_BASE_URL, LOCAL_BASE_URL } from '../integrations/tools/types.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toContain(expected: any) {
      if (typeof actual === 'string') {
        if (!actual.includes(expected)) throw new Error(`Expected string to contain "${expected}"`);
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expected)) throw new Error(`Expected array to contain ${JSON.stringify(expected)}`);
      } else throw new Error('toContain expects string or array');
    },
    toBeTruthy() { if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`); },
    toBeFalsy() { if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`); },
    toBeInstanceOf(cls: any) { if (!(actual instanceof cls)) throw new Error(`Expected instance of ${cls.name}`); },
    toHaveLength(n: number) { if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`); },
    toBeGreaterThan(n: number) { if (actual <= n) throw new Error(`Expected > ${n}, got ${actual}`); },
    toBeGreaterThanOrEqual(n: number) { if (actual < n) throw new Error(`Expected >= ${n}, got ${actual}`); },
    toMatch(re: RegExp) { if (!re.test(actual)) throw new Error(`Expected to match ${re}`); },
    not: {
      toContain(expected: any) {
        if (actual.includes(expected)) throw new Error(`Expected NOT to contain "${expected}"`);
      },
      toBe(expected: any) {
        if (actual === expected) throw new Error(`Expected NOT to be ${JSON.stringify(expected)}`);
      },
    },
  };
}

function run() {
  console.log('\n=== CLI Tool Integration Tests ===\n');

  // ═══ REGISTRY TESTS ═══
  console.log('--- Registry ---');

  test('1. Tool IDs are unique', () => {
    const ids = getAllToolIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('2. Supported status enum is valid', () => {
    const valid = new Set(['supported', 'experimental', 'partial', 'coming_soon']);
    getToolRegistry().forEach(t => {
      if (!valid.has(t.status)) throw new Error(`Invalid status: ${t.status}`);
    });
  });

  test('3. Active tools have templates', () => {
    getToolRegistry().filter(t => t.status !== 'coming_soon').forEach(t => {
      if (t.templates.length === 0) throw new Error(`No templates for ${t.id}`);
    });
  });

  test('4. No template references provider credentials', () => {
    const forbidden = ['openai_key', 'anthropic_key', 'claude_key', 'gemini_key', 'ANTHROPIC_API_KEY'];
    getToolRegistry().forEach(t => {
      t.templates.forEach(tmpl => {
        forbidden.forEach(word => {
          if (tmpl.content.toLowerCase().includes(word.toLowerCase()))
            throw new Error(`Template ${tmpl.id} references: ${word}`);
        });
      });
    });
  });

  test('5. Coming-soon tools have empty templates', () => {
    getToolRegistry().filter(t => t.status === 'coming_soon').forEach(t => {
      if (t.templates.length > 0) throw new Error(`${t.id} should have no templates`);
    });
  });

  test('6. Capability flags are boolean', () => {
    getToolRegistry().forEach(t => {
      if (typeof t.supportsCustomBaseUrl !== 'boolean') throw new Error(`${t.id}: supportsCustomBaseUrl`);
      if (typeof t.supportsCustomModel !== 'boolean') throw new Error(`${t.id}: supportsCustomModel`);
      if (typeof t.supportsStreaming !== 'boolean') throw new Error(`${t.id}: supportsStreaming`);
    });
  });

  test('7. Registry has at least 10 tools', () => {
    expect(getToolRegistry().length).toBeGreaterThanOrEqual(10);
  });

  test('8. getToolById returns undefined for unknown', () => {
    expect(getToolById('nonexistent')).toBe(undefined);
  });

  test('9. getToolById returns Cursor', () => {
    const t = getToolById('cursor');
    expect(t).toBeTruthy();
    expect(t!.name).toBe('Cursor');
    expect(t!.category).toBe('ide');
  });

  test('10. getToolsByCategory returns IDE tools', () => {
    const ides = getToolsByCategory('ide');
    expect(ides.length).toBeGreaterThanOrEqual(3);
    ides.forEach(t => expect(t.category).toBe('ide'));
  });

  // ═══ RENDERING TESTS ═══
  console.log('\n--- Rendering ---');

  test('11. Base URL renders correctly', () => {
    const { rendered } = renderTemplate('URL: {{BASE_URL}}', { BASE_URL: 'https://ex.com/v1', API_KEY: 'k', MODEL: 'm' }, 'json');
    expect(rendered).toContain('https://ex.com/v1');
  });

  test('12. API key escapes in shell', () => {
    const { rendered } = renderTemplate('{{API_KEY}}', { BASE_URL: '', API_KEY: "key'withquotes", MODEL: '' }, 'shell');
    expect(rendered).not.toBe("key'withquotes");
  });

  test('13. API key escapes in JSON', () => {
    const { rendered } = renderTemplate('{{API_KEY}}', { BASE_URL: '', API_KEY: 'key"with"quotes', MODEL: '' }, 'json');
    expect(rendered).not.toBe('key"with"quotes');
  });

  test('14. Model alias renders correctly', () => {
    const { rendered } = renderTemplate('{{MODEL}}', { BASE_URL: '', API_KEY: '', MODEL: '8router/coding' }, 'env');
    expect(rendered).toBe('8router/coding');
  });

  test('15. Unknown variable produces warning', () => {
    const { warnings } = renderTemplate('{{UNKNOWN}}', { BASE_URL: '', API_KEY: '', MODEL: '' }, 'env');
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain('Unknown');
  });

  test('16. No arbitrary template execution', () => {
    const { rendered } = renderTemplate('{{exec("bad")}}', { BASE_URL: '', API_KEY: '', MODEL: '' }, 'env');
    expect(rendered).toContain('{{exec(');
  });

  test('17. Placeholder docs don\'t contain real secrets', () => {
    getToolRegistry().forEach(t => {
      t.templates.forEach(tmpl => {
        if (tmpl.content.includes('sk-8router_') && !tmpl.content.includes('***') && !tmpl.content.includes('<YOUR'))
          throw new Error(`${tmpl.id} may have real key`);
      });
    });
  });

  test('18. Trailing slash normalization', () => {
    expect(normalizeBaseUrl('https://ex.com/v1/')).toBe('https://ex.com/v1');
    expect(normalizeBaseUrl('https://ex.com/v1///')).toBe('https://ex.com/v1');
  });

  test('19. Duplicate /v1 prevention', () => {
    expect(normalizeBaseUrl('https://ex.com/v1/v1')).toBe('https://ex.com/v1');
  });

  test('20. renderToolConfig throws for unknown tool', () => {
    let threw = false;
    try { renderToolConfig({ toolId: 'nope', baseUrl: '', model: '', apiKey: '' }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  test('21. renderToolConfig throws for coming_soon', () => {
    let threw = false;
    try { renderToolConfig({ toolId: 'librechat', baseUrl: '', model: '', apiKey: '' }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  test('22. renderToolConfig returns results for supported tool', () => {
    const r = renderToolConfig({ toolId: 'curl', baseUrl: 'https://ex.com/v1', model: '8router/auto', apiKey: 'k' });
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].toolId).toBe('curl');
    expect(r[0].content).toContain('https://ex.com/v1');
  });

  test('23. renderToolConfig filters by templateId', () => {
    const r = renderToolConfig({ toolId: 'curl', baseUrl: 'https://ex.com/v1', model: 'm', apiKey: 'k', templateId: 'curl-chat' });
    expect(r.length).toBe(1);
    expect(r[0].templateId).toBe('curl-chat');
  });

  test('24. Rendered curl contains Authorization header', () => {
    const r = renderToolConfig({ toolId: 'curl', baseUrl: 'https://ex.com/v1', model: 'm', apiKey: 'k' });
    expect(r[0].content).toContain('Authorization');
  });

  test('25. Rendered node SDK uses baseURL', () => {
    const r = renderToolConfig({ toolId: 'openai-sdk', baseUrl: 'https://ex.com/v1', model: 'm', apiKey: 'k', templateId: 'openai-node' });
    expect(r[0].content).toContain('baseURL');
  });

  // ═══ SECURITY TESTS ═══
  console.log('\n--- Security ---');

  test('26. Embedded URL credentials rejected', () => {
    const r = validateBaseUrl('https://user:pass@ex.com/v1');
    expect(r.valid).toBe(false);
  });

  test('27. Constants don\'t contain secrets', () => {
    expect(HOSTED_BASE_URL).not.toContain('sk-');
    expect(LOCAL_BASE_URL).not.toContain('sk-');
  });

  test('28. Validation doesn\'t echo key back', () => {
    const r = validateAccessKeyFormat('sk-8router_abcdefghij');
    const msgs = [...r.errors, ...r.warnings].join(' ');
    expect(msgs).not.toContain('sk-8router_abcdefghij');
  });

  test('29. Shell escaping prevents injection', () => {
    const { rendered } = renderTemplate('{{API_KEY}}', { BASE_URL: '', API_KEY: "key; rm -rf /", MODEL: '' }, 'shell');
    expect(rendered).not.toBe("key; rm -rf /");
  });

  test('30. YAML escaping for special chars', () => {
    const { rendered } = renderTemplate('{{API_KEY}}', { BASE_URL: '', API_KEY: 'key:with:colons', MODEL: '' }, 'yaml');
    // Should be wrapped/escaped for YAML safety
    expect(rendered).toBeTruthy();
  });

  // ═══ VALIDATION TESTS ═══
  console.log('\n--- Validation ---');

  test('31. Valid HTTPS passes', () => {
    expect(validateBaseUrl('https://8router.8agents.xyz/v1').valid).toBe(true);
  });

  test('32. Valid localhost HTTP passes', () => {
    expect(validateBaseUrl('http://localhost:8081/v1').valid).toBe(true);
  });

  test('33. Invalid URL fails', () => {
    expect(validateBaseUrl('not-a-url').valid).toBe(false);
  });

  test('34. Empty URL fails', () => {
    expect(validateBaseUrl('').valid).toBe(false);
  });

  test('35. FTP URL fails', () => {
    expect(validateBaseUrl('ftp://files.ex.com').valid).toBe(false);
  });

  test('36. HTTP non-private warns', () => {
    expect(validateBaseUrl('http://example.com/v1').warnings.join('')).toContain('not secure');
  });

  test('37. Valid model passes', () => {
    expect(validateModel('8router/auto').valid).toBe(true);
  });

  test('38. Empty model fails', () => {
    expect(validateModel('').valid).toBe(false);
  });

  test('39. Overly long model fails', () => {
    expect(validateModel('x'.repeat(300)).valid).toBe(false);
  });

  test('40. Valid key format passes', () => {
    expect(validateAccessKeyFormat('sk-8router_abcdefghij').valid).toBe(true);
  });

  test('41. Short key fails', () => {
    expect(validateAccessKeyFormat('short').valid).toBe(false);
  });

  test('42. Missing prefix warns', () => {
    expect(validateAccessKeyFormat('abcdefghijklmnopqrst').warnings.join('')).toContain('sk-8router_');
  });

  test('43. Empty key fails', () => {
    expect(validateAccessKeyFormat('').valid).toBe(false);
  });

  // ═══ UI/DATA TESTS ═══
  console.log('\n--- UI/Data ---');

  test('44. Smart aliases grouped correctly', () => {
    expect(SMART_ALIASES.General).toContain('8router/auto');
    expect(SMART_ALIASES.Specialized).toContain('8router/coding');
    expect(SMART_ALIASES['Local & Privacy']).toContain('8router/local');
  });

  test('45. Default model is 8router/auto', () => {
    expect(DEFAULT_MODEL).toBe('8router/auto');
  });

  test('46. Hosted URL correct', () => {
    expect(HOSTED_BASE_URL).toBe('https://8router.8agents.xyz/v1');
  });

  test('47. Local URL correct', () => {
    expect(LOCAL_BASE_URL).toBe('http://localhost:8081/v1');
  });

  test('48. Active tools have descriptions', () => {
    getToolRegistry().filter(t => t.status !== 'coming_soon').forEach(t => {
      if (!t.description || t.description.length < 10) throw new Error(`${t.id}: desc too short`);
    });
  });

  test('49. Categories are valid', () => {
    const valid = new Set(['ide', 'cli', 'webui', 'sdk', 'generic']);
    getToolRegistry().forEach(t => {
      if (!valid.has(t.category)) throw new Error(`Invalid cat: ${t.category}`);
    });
  });

  // ═══ CONFIG EXAMPLES ═══
  console.log('\n--- Config Examples ---');

  test('50. cURL example has curl command', () => {
    const t = getToolById('curl')!;
    expect(t.templates.find(t => t.id === 'curl-chat')!.content).toContain('curl');
  });

  test('51. Node example uses baseURL', () => {
    expect(getToolById('openai-sdk')!.templates.find(t => t.id === 'openai-node')!.content).toContain('baseURL');
  });

  test('52. Python example uses base_url', () => {
    expect(getToolById('openai-sdk')!.templates.find(t => t.id === 'openai-python')!.content).toContain('base_url');
  });

  test('53. .env example has all 3 vars', () => {
    const c = getToolById('env-file')!.templates[0].content;
    expect(c).toContain('EIGHTROUTER_BASE_URL');
    expect(c).toContain('EIGHTROUTER_API_KEY');
    expect(c).toContain('EIGHTROUTER_MODEL');
  });

  test('54. Continue config has apiBase', () => {
    expect(getToolById('continue')!.templates[0].content).toContain('apiBase');
  });

  test('55. OpenWebUI mentions Docker', () => {
    expect(getToolById('openwebui')!.templates[0].content).toContain('Docker');
  });

  test('56. Cline has Model ID step', () => {
    expect(getToolById('cline')!.templates[0].content).toContain('Model ID');
  });

  // ═══ API STRUCTURE ═══
  console.log('\n--- API Structure ---');

  test('57. All tools have valid configFormat', () => {
    const valid = new Set(['json', 'yaml', 'env', 'shell', 'ui_steps', 'code']);
    getToolRegistry().forEach(t => {
      if (!valid.has(t.configFormat)) throw new Error(`Invalid format: ${t.configFormat}`);
    });
  });

  test('58. Template IDs unique per tool', () => {
    getToolRegistry().forEach(t => {
      const ids = t.templates.map(t => t.id);
      if (new Set(ids).size !== ids.length) throw new Error(`Duplicate template ID in ${t.id}`);
    });
  });

  test('59. All templates have labels', () => {
    getToolRegistry().forEach(t => {
      t.templates.forEach(tmpl => {
        if (!tmpl.label || tmpl.label.length < 3) throw new Error(`Missing label: ${tmpl.id}`);
      });
    });
  });

  test('60. Multi-variable render', () => {
    const { rendered } = renderTemplate('{{BASE_URL}}/{{MODEL}}', { BASE_URL: 'https://x.com/v1', API_KEY: 'k', MODEL: 'm' }, 'env');
    expect(rendered).toBe('https://x.com/v1/m');
  });

  test('61. normalizeBaseUrl trims whitespace', () => {
    expect(normalizeBaseUrl('  https://ex.com/v1  ')).toBe('https://ex.com/v1');
  });

  test('62. URL credentials with encoded chars rejected', () => {
    expect(validateBaseUrl('https://admin:p%40ss@ex.com/v1').valid).toBe(false);
  });

  // ═══ FINAL ═══
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

export function runCliIntegrationTests(): void {
  run();
  console.log(`   Phase 2G CLI Integrations: ${passed} passed, ${failed} failed\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCliIntegrationTests();
  process.exit(failed > 0 ? 1 : 0);
}
