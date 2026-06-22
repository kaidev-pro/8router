#!/usr/bin/env node
// 8Router — Migrate API keys from 9Router database
// Reads ~/.9router/db/data.sqlite and generates 8router.env

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const DB_PATH = join(homedir(), '.9router', 'db', 'data.sqlite');
const OUTPUT_PATH = join(process.cwd(), '8router.env');

console.log('🔄 8Router — 9Router Migration Tool\n');

// Check if 9Router DB exists
if (!existsSync(DB_PATH)) {
  console.error('❌ 9Router database not found at:', DB_PATH);
  process.exit(1);
}

// Query active provider connections
const query = `
  SELECT 
    provider,
    name,
    json_extract(data, '$.apiKey') as apiKey,
    json_extract(data, '$.testStatus') as testStatus,
    json_extract(data, '$.baseUrl') as baseUrl,
    json_extract(data, '$.accessToken') as accessToken,
    json_extract(data, '$.refreshToken') as refreshToken,
    json_extract(data, '$.expiresAt') as expiresAt,
    json_extract(data, '$.providerSpecificData.connectionProxyUrl') as proxyUrl,
    json_extract(data, '$.providerSpecificData.region') as region
  FROM providerConnections 
  WHERE isActive = 1
  ORDER BY provider, priority;
`;

try {
  const result = execSync(`sqlite3 -json "${DB_PATH}" "${query.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const connections = JSON.parse(result);
  console.log(`📊 Found ${connections.length} active connections\n`);

  // Group by provider
  const byProvider = {};
  for (const conn of connections) {
    if (!byProvider[conn.provider]) {
      byProvider[conn.provider] = [];
    }
    byProvider[conn.provider].push(conn);
  }

  // Generate env file
  let envContent = '# 8Router — Migrated from 9Router\n';
  envContent += `# Generated: ${new Date().toISOString()}\n`;
  envContent += `# Total connections: ${connections.length}\n\n`;

  // Provider mappings
  const providerMap = {
    'groq': { envKey: 'GROQ_API_KEY', type: 'apikey' },
    'gemini': { envKey: 'GOOGLE_API_KEY', type: 'apikey' },
    'openai': { envKey: 'OPENAI_API_KEY', type: 'apikey' },
    'anthropic': { envKey: 'ANTHROPIC_API_KEY', type: 'apikey' },
    'mistral': { envKey: 'MISTRAL_API_KEY', type: 'apikey' },
    'deepseek': { envKey: 'DEEPSEEK_API_KEY', type: 'apikey' },
    'xai': { envKey: 'XAI_API_KEY', type: 'apikey' },
    'cerebras': { envKey: 'CEREBRAS_API_KEY', type: 'apikey' },
    'ollama': { envKey: 'OLLAMA_API_KEY', type: 'apikey' },
    'openrouter': { envKey: 'OPENROUTER_API_KEY', type: 'apikey' },
  };

  const stats = {
    active: 0,
    unavailable: 0,
    skipped: 0
  };

  for (const [provider, conns] of Object.entries(byProvider)) {
    envContent += `# ${provider.toUpperCase()}\n`;
    
    for (let i = 0; i < conns.length; i++) {
      const conn = conns[i];
      const status = conn.testStatus;
      const isActive = status === 'active' || status === 'ready';
      
      if (isActive) {
        stats.active++;
      } else {
        stats.unavailable++;
      }

      // Determine the key to use
      let key = conn.apiKey;
      let keyType = 'apikey';
      
      // For OAuth providers, use access token
      if (conn.accessToken && !key) {
        key = conn.accessToken;
        keyType = 'oauth';
      }

      // Skip if no key
      if (!key) {
        envContent += `# ${conn.name || provider} — skipped (no key)\n`;
        stats.skipped++;
        continue;
      }

      // Generate env var name
      const envKey = providerMap[provider]?.envKey || `${provider.toUpperCase()}_API_KEY`;
      const suffix = conns.length > 1 ? `_KEY_${i + 1}` : '_KEY';
      const finalKey = conns.length > 1 ? `${envKey}${suffix}` : envKey;

      // Add to env
      const statusEmoji = isActive ? '🟢' : '🔴';
      envContent += `${finalKey}=${key}\n`;
      envContent += `# ${statusEmoji} ${conn.name || provider} (${status})`;
      
      if (conn.proxyUrl) {
        envContent += ` | proxy: ${conn.proxyUrl}`;
      }
      if (conn.region) {
        envContent += ` | region: ${conn.region}`;
      }
      envContent += '\n';
    }
    envContent += '\n';
  }

  // Add special providers that use different auth
  envContent += '# ═══════════════════════════════════════════════\n';
  envContent += '# SPECIAL PROVIDERS (OAuth / Token-based)\n';
  envContent += '# ═══════════════════════════════════════════════\n\n';

  // Xiaomi TokenPlan (MIMO)
  const mimoConns = byProvider['xiaomi-tokenplan'] || [];
  if (mimoConns.length > 0) {
    envContent += '# XIAOMI TOKENPLAN (MIMO)\n';
    for (let i = 0; i < mimoConns.length; i++) {
      const conn = mimoConns[i];
      const key = conn.apiKey;
      if (key) {
        envContent += `XIAOMI_TOKEN_${i + 1}=${key}\n`;
        envContent += `# ${conn.name} (${conn.testStatus})`;
        if (conn.proxyUrl) {
          envContent += ` | proxy: ${conn.proxyUrl}`;
        }
        envContent += '\n';
      }
    }
    envContent += '\n';
  }

  // MIMO farmed keys
  const mimoFarmed = byProvider['mimo'] || [];
  if (mimoFarmed.length > 0) {
    envContent += '# MIMO FARMED KEYS\n';
    for (let i = 0; i < Math.min(mimoFarmed.length, 10); i++) { // Limit to 10
      const conn = mimoFarmed[i];
      const key = conn.apiKey;
      if (key) {
        envContent += `MIMO_FARMED_${i + 1}=${key}\n`;
        envContent += `# ${conn.name} (${conn.testStatus})\n`;
      }
    }
    if (mimoFarmed.length > 10) {
      envContent += `# ... and ${mimoFarmed.length - 10} more\n`;
    }
    envContent += '\n';
  }

  // Write env file
  writeFileSync(OUTPUT_PATH, envContent);

  console.log('✅ Migration complete!\n');
  console.log('📊 Summary:');
  console.log(`   Active keys:   ${stats.active}`);
  console.log(`   Unavailable:   ${stats.unavailable}`);
  console.log(`   Skipped:       ${stats.skipped}`);
  console.log(`   Total:         ${connections.length}`);
  console.log(`\n📁 Output: ${OUTPUT_PATH}`);
  console.log('\n🚀 Next steps:');
  console.log('   1. Review 8router.env');
  console.log('   2. Copy to .env:  cp 8router.env .env');
  console.log('   3. Start 8Router: npm run dev');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
