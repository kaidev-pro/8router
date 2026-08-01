// 8Router — i18n Regression Tests

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { getLandingHTML } from '../landing.js';
import { t } from '../i18n/translator.js';
import { normalizeLocale, SUPPORTED_LOCALES } from '../i18n/locale.js';

const RAW_KEYS = ['hero.title1', 'services.title', 'providers.title', 'security.title', 'start.title'];
const DICTIONARY_FILES = ['en.json', 'id.json', 'ja.json'];

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertNoRawKeys(html: string, label: string): void {
  for (const key of RAW_KEYS) {
    assert(!html.includes(key), `${label} leaked raw key ${key}`);
  }
}

export function runI18nRegressionTests(): { passed: number; failed: number } {
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

  console.log('i18n regression tests');

  test('default locale loads real text', () => {
    const html = getLandingHTML();
    assert(html.includes('One endpoint'), 'default locale missing hero text');
    assertNoRawKeys(html, 'default locale');
  });

  test('Indonesian locale loads real text', () => {
    const html = getLandingHTML('id');
    assert(html.includes('Dibangun untuk'), 'id locale missing Indonesian text');
    assertNoRawKeys(html, 'id locale');
  });

  test('English locale loads real text', () => {
    const html = getLandingHTML('en');
    assert(html.includes('Built for messy real-world AI workflows.'), 'en locale missing English text');
    assertNoRawKeys(html, 'en locale');
  });

  test('Japanese locale loads real text', () => {
    const html = getLandingHTML('ja');
    assert(html.includes('現実のAIワークフロー'), 'ja locale missing Japanese text');
    assertNoRawKeys(html, 'ja locale');
  });

  test('id-ID normalizes correctly', () => {
    assert(normalizeLocale('id-ID') === 'id', 'id-ID did not normalize to id');
  });

  test('en-US normalizes correctly', () => {
    assert(normalizeLocale('en-US') === 'en', 'en-US did not normalize to en');
  });

  test('ja-JP normalizes correctly', () => {
    assert(normalizeLocale('ja-JP') === 'ja', 'ja-JP did not normalize to ja');
  });

  test('unsupported locale falls back safely', () => {
    assert(normalizeLocale('miss') === null, 'unsupported locale should not normalize');
    const html = getLandingHTML(normalizeLocale('miss') ?? 'en');
    assert(html.includes('One endpoint'), 'unsupported fallback missing English text');
    assertNoRawKeys(html, 'unsupported fallback');
  });

  test('production homepage HTML does not contain known raw keys', () => {
    for (const locale of SUPPORTED_LOCALES) {
      assertNoRawKeys(getLandingHTML(locale), `${locale} homepage`);
    }
  });

  test('dictionary resources are included in source build inputs', () => {
    for (const file of DICTIONARY_FILES) {
      const fullPath = path.join(process.cwd(), 'src', 'i18n', file);
      assert(existsSync(fullPath), `${file} missing`);
      JSON.parse(readFileSync(fullPath, 'utf8'));
    }
  });

  test('missing-key behavior is sanitized', () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const value = t('missing.visible.key', 'en');
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    assert(value !== 'missing.visible.key', 'missing key returned raw key');
    assert(value === 'Translation unavailable', 'missing key did not return sanitized production fallback');
  });

  test('English remains the canonical reference dictionary', () => {
    const enKeys = new Set(Object.keys(JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8')) as Record<string, string>));
    assert(enKeys.has('hero.title1'), 'canonical English dictionary missing hero.title1');
    assert(enKeys.has('db.cli.securityNote'), 'canonical English dictionary missing db.cli.securityNote');
  });

  test('Indonesian and Japanese have no missing active keys', () => {
    const en = JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
    for (const locale of ['id', 'ja']) {
      const dict = JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'i18n', `${locale}.json`), 'utf8')) as Record<string, string>;
      const missing = Object.keys(en).filter(key => !(key in dict));
      assert(missing.length === 0, `${locale} missing keys: ${missing.join(', ')}`);
    }
  });

  test('placeholder names match across locales', () => {
    const placeholderRegex = /\{[a-zA-Z0-9_]+\}|\{\{[a-zA-Z0-9_]+\}\}|%[sd]/g;
    const en = JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'i18n', 'en.json'), 'utf8')) as Record<string, string>;
    for (const locale of ['id', 'ja']) {
      const dict = JSON.parse(readFileSync(path.join(process.cwd(), 'src', 'i18n', `${locale}.json`), 'utf8')) as Record<string, string>;
      for (const [key, value] of Object.entries(en)) {
        const expected = [...value.matchAll(placeholderRegex)].map(match => match[0]).sort().join('|');
        const actual = [...(dict[key] ?? '').matchAll(placeholderRegex)].map(match => match[0]).sort().join('|');
        assert(actual === expected, `${locale}:${key} placeholder mismatch`);
      }
    }
  });

  test('no unsupported wildcard exclusions exist', () => {
    const content = readFileSync(path.join(process.cwd(), 'src', '__tests__', 'i18n-regression.test.ts'), 'utf8');
    const marker = ['LOCALE','EXCLUSION','WILDCARD'].join('_');
    assert(!content.includes(marker), 'unsupported locale exclusion wildcard present');
  });

  test('Linux-sensitive import paths resolve correctly', () => {
    const exactPaths = [
      'src/i18n/index.ts',
      'src/i18n/locale.ts',
      'src/i18n/translator.ts',
      'src/i18n/en.json',
      'src/i18n/id.json',
      'src/i18n/ja.json',
    ];
    for (const exactPath of exactPaths) {
      assert(existsSync(path.join(process.cwd(), exactPath)), `${exactPath} casing/path mismatch`);
    }
  });

  return { passed, failed };
}
