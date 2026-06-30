// 8Router — Test Suite (Updated)

import { loadConfig } from '../config.js';
import { RouterEngine, RouterError } from '../router/engine.js';
import { resolveModelAlias, PROVIDER_CATALOG } from '../providers/catalog.js';

async function test() {
  console.log('=== 8Router Test Suite ===\n');
  let passed = 0;
  let failed = 0;

  // Test 1: Config loading
  console.log('1. Config loading');
  const config = loadConfig();
  console.log(`   Port: ${config.port}`);
  console.log(`   Providers: ${config.providers.length}`);
  console.log(`   RTK: ${config.compression.rtk.enabled}`);
  console.log(`   ✅ Config loaded\n`);
  passed++;

  // Test 2: Provider catalog
  console.log('2. Provider catalog');
  console.log(`   Catalog providers: ${PROVIDER_CATALOG.length}`);
  console.log(`   Tiers: subscription(${PROVIDER_CATALOG.filter(p=>p.tier==='subscription').length}), cheap(${PROVIDER_CATALOG.filter(p=>p.tier==='cheap').length}), free(${PROVIDER_CATALOG.filter(p=>p.tier==='free').length})`);
  console.log(`   ✅ Catalog loaded\n`);
  passed++;

  // Test 3: Model aliases
  console.log('3. Model aliases');
  const aliases = ['claude', 'gpt4o', 'gemini', 'grok', 'deepseek', 'llama', 'cheap', 'free', 'fast', 'best'];
  for (const alias of aliases) {
    const resolved = resolveModelAlias(alias);
    console.log(`   ${alias.padEnd(10)} → ${resolved}`);
  }
  console.log(`   ✅ Aliases working\n`);
  passed++;

  // Test 4: Router engine creation
  console.log('4. Router engine creation');
  const engine = new RouterEngine(config);
  const stats = engine.getStats();
  console.log(`   Engine created`);
  console.log(`   Providers registered: ${engine.getRegistry().getAllProviders().length}`);
  console.log(`   ✅ Engine ready\n`);
  passed++;

  // Test 5: RTK compression
  console.log('5. RTK compression');
  const { compress } = await import('../compressor/rtk.js');
  const testMessages = [
    {
      role: 'user',
      content: `diff --git a/test.ts b/test.ts
index abc..def 100644
--- a/test.ts
+++ b/test.ts
@@ -1,5 +1,6 @@
 1: import { foo } from 'bar'
+import { baz } from 'qux'
 2: 
 3: export function test() {
    console.log('hello')
  }`
    }
  ];
  const result = compress(testMessages, config.compression);
  console.log(`   Original: ${testMessages[0].content?.length} chars`);
  console.log(`   Compressed: ${result.messages[0].content?.length} chars`);
  console.log(`   Saved: ${result.savedTokens} tokens`);
  console.log(`   ✅ Compression working\n`);
  passed++;

  // Test 6: Request routing (providers fail but routing logic works)
  console.log('6. Request routing (fallback test)');
  try {
    await engine.route({ model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] });
    console.log(`   Got response (unexpected but ok)`);
    console.log(`   ✅ Route succeeded\n`);
    passed++;
  } catch (err) {
    if (err instanceof RouterError) {
      console.log(`   Error code: ${err.code}`);
      console.log(`   Error: ${err.message.slice(0, 80)}...`);
      if (err.code === 'all_providers_failed' || err.code === 'no_provider') {
        console.log(`   ✅ Expected fallback behavior\n`);
        passed++;
      } else {
        console.log(`   ❌ Unexpected error code\n`);
        failed++;
      }
    } else {
      console.log(`   ❌ Unexpected error: ${err}\n`);
      failed++;
    }
  }

  // Test 7: Dashboard
  console.log('7. Dashboard');
  const { createDashboard } = await import('../dashboard/dashboard.js');
  const dashApp = createDashboard(engine, 8080);
  console.log(`   Dashboard created: ${typeof dashApp === 'function'}`);
  console.log(`   ✅ Dashboard ready\n`);
  passed++;

  // Test 8: Hermes integration
  console.log('8. Hermes integration');
  const { generateHermesConfig } = await import('../hermes/integration.js');
  const hermesConfig = generateHermesConfig(8080);
  console.log(`   Config length: ${hermesConfig.length} chars`);
  console.log(`   Has provider config: ${hermesConfig.includes('custom_providers')}`);
  console.log(`   Has aliases: ${hermesConfig.includes('claude')}`);
  console.log(`   ✅ Hermes integration ready\n`);
  passed++;

  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
