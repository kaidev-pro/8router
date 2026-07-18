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
    assert(html.includes('AI Routing Gateway'), 'default locale missing hero text');
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
    assert(html.includes('AI Routing Gateway'), 'unsupported fallback missing English text');
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
