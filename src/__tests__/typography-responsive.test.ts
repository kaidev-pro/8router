// 8Router — Typography and Responsive UI Regression Tests

import { getLandingHTML } from '../landing.js';

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function extractStyle(html: string): string {
  const match = html.match(/<style>([\s\S]*?)<\/style>/);
  assert(match, 'style block missing');
  return match![1];
}

function countMatches(text: string, regex: RegExp): number {
  return [...text.matchAll(regex)].length;
}

export function runTypographyResponsiveTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  const html = getLandingHTML('en');
  const css = extractStyle(html);

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

  console.log('typography and responsive UI tests');

  test('homepage contains one semantic h1', () => {
    assert(countMatches(html, /<h1[\s>]/g) === 1, 'homepage must contain exactly one h1');
  });

  test('major sections use h2 headings', () => {
    assert(countMatches(html, /<h2 class="s-title">/g) >= 10, 'major section h2 headings missing');
  });

  test('default locale renders actual text', () => {
    assert(getLandingHTML().includes('AI Routing Gateway'), 'default locale missing real hero text');
  });

  test('English locale renders actual text', () => {
    assert(html.includes('Built for messy real-world AI workflows.'), 'English locale missing real text');
  });

  test('Indonesian locale renders actual text', () => {
    assert(getLandingHTML('id').includes('Dibangun untuk'), 'Indonesian locale missing real text');
  });

  test('Japanese locale renders actual text', () => {
    assert(getLandingHTML('ja').includes('現実のAIワークフロー'), 'Japanese locale missing real text');
  });

  test('known raw translation keys do not appear', () => {
    for (const key of ['hero.title1', 'services.title', 'providers.title', 'security.title', 'start.title']) {
      assert(!html.includes(key), `raw key leaked: ${key}`);
    }
  });

  test('mobile navigation collapses at intended breakpoint', () => {
    assert(css.includes('@media(max-width:640px)'), 'mobile breakpoint missing');
    assert(css.includes('.nav-links { display:none }'), 'nav links are not hidden on mobile');
    assert(css.includes('.mobile-nav-cta { display:inline-flex'), 'mobile CTA not shown on mobile');
  });

  test('no critical text style is below 12px', () => {
    const smallPx = css.match(/font-size:\s*(\d+)px/g) ?? [];
    const below12 = smallPx.filter(value => Number(value.match(/\d+/)?.[0]) < 12);
    assert(below12.length === 0, `font-size below 12px found: ${below12.join(', ')}`);
  });

  test('hero uses responsive typography', () => {
    assert(css.includes('--text-hero: clamp('), 'hero typography token missing');
    assert(css.includes('font-size:var(--text-hero)'), 'hero title does not use responsive token');
  });

  test('card descriptions use readable line-height', () => {
    assert(css.includes('.svc-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.6 }'), 'service card line-height not readable');
    assert(css.includes('.feat-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.5 }'), 'feature card line-height not readable');
  });

  test('statistics maintain visible hierarchy', () => {
    assert(css.includes('font-size:clamp(1.5rem,4vw,2.25rem)'), 'stat number scale missing');
    assert(css.includes('.hero-stat-label { font-size:var(--text-xs); line-height:1.35'), 'stat label readable size missing');
  });

  test('code samples use monospace token', () => {
    assert(css.includes('--font-mono:'), 'monospace token missing');
    assert(css.includes('font-family:var(--font-mono)'), 'monospace token not used');
  });

  test('body copy uses primary sans-serif token', () => {
    assert(css.includes('--font-sans:'), 'sans token missing');
    assert(css.includes('font-family:var(--font-sans);'), 'body does not use sans token');
  });

  test('page has overflow protections for tested widths', () => {
    assert(css.includes('html, body { overflow-x:hidden; max-width:100vw }'), 'body overflow guard missing');
    assert(css.includes('pre { overflow-x:auto;'), 'code overflow guard missing');
    assert(css.includes('.wrap { padding:0 20px; width:100%; max-width:100vw; overflow:hidden }'), 'mobile wrap overflow guard missing');
  });

  return { passed, failed };
}
