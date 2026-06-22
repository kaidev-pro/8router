#!/usr/bin/env node
// 8Router — Generate YAML config from 9Router database
// Reads active providers and creates 8router.yaml

import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import yaml from 'js-yaml';

const DB_PATH = join(homedir(), '.9router', 'db', 'data.sqlite');
const OUTPUT_PATH = join(process.cwd(), '8router.yaml');

console.log('🔄 8Router — Generate YAML config from 9Router\n');

if (!existsSync(DB_PATH)) {
  console.error('❌ 9Router database not found');
  process.exit(1);
}

// Query active connections
const query = `
  SELECT 
    provider,
    name,
    json_extract(data, '$.apiKey') as apiKey,
    json_extract(data, '$.testStatus') as testStatus,
    json_extract(data, '$.baseUrl') as baseUrl,
    json_extract(data, '$.providerSpecificData.connectionProxyUrl') as proxyUrl,
    json_extract(data, '$.providerSpecificData.region') as region
  FROM providerConnections 
  WHERE isActive = 1
    AND json_extract(data, '$.testStatus') IN ('active', 'ready')
  ORDER BY provider, priority;
`;

try {
  const result = execSync(`sqlite3 -json "${DB_PATH}" "${query.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8'
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

  // Provider config templates
  const providerConfigs = {
    groq: {
      baseUrl: 'https://api.groq.com/openai/v1',
      adapter: 'openai',
      tier: 'free',
      models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
    },
    gemini: {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      adapter: 'gemini',
      tier: 'subscription',
      models: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash']
    },
    mistral: {
      baseUrl: 'https://api.mistral.ai/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['mistral-large-latest', 'mistral-small-latest']
    },
    openrouter: {
      baseUrl: 'https://openrouter.ai/api/v1',
      adapter: 'openai',
      tier: 'subscription',
      models: ['*']
    },
    ollama: {
      baseUrl: 'http://localhost:11434/v1',
      adapter: 'ollama',
      tier: 'free',
      models: ['*']
    },
    deepseek: {
      baseUrl: 'https://api.deepseek.com/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['deepseek-chat', 'deepseek-coder']
    },
    anthropic: {
      baseUrl: 'https://api.anthropic.com/v1',
      adapter: 'anthropic',
      tier: 'subscription',
      models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022']
    },
    xai: {
      baseUrl: 'https://api.x.ai/v1',
      adapter: 'openai',
      tier: 'subscription',
      models: ['grok-3', 'grok-3-mini']
    },
    cerebras: {
      baseUrl: 'https://api.cerebras.ai/v1',
      adapter: 'openai',
      tier: 'free',
      models: ['llama-3.3-70b']
    },
    'xiaomi-tokenplan': {
      baseUrl: 'https://token-plan-sgp.xiaomimimo.com/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['mimo-v2-pro', 'mimo-v2-omni', 'mimo-v2-lite']
    },
    mimo: {
      baseUrl: 'https://api.mimo.ai/v1',
      adapter: 'openai',
      tier: 'free',
      models: ['*']
    },
    minimax: {
      baseUrl: 'https://api.minimax.chat/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['MiniMax-M2.5']
    },
    nvidia: {
      baseUrl: 'https://integrate.api.nvidia.com/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['*']
    },
    kimi: {
      baseUrl: 'https://api.moonshot.cn/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['moonshot-v1-8k', 'moonshot-v1-32k']
    }
  };

  // Generate config
  const config = {
    version: '1.0',
    port: 8080,
    dashboardPort: 8081,
    hermesPort: 8083,
    defaultTimeout: 30000,
    maxRetries: 3,
    fallbackStrategy: 'cascade',
    compression: true,
    providers: []
  };

  // Add providers
  for (const [providerId, conns] of Object.entries(byProvider)) {
    const template = providerConfigs[providerId] || {
      baseUrl: 'https://api.example.com/v1',
      adapter: 'openai',
      tier: 'cheap',
      models: ['*']
    };

    // Use first active connection's key
    const activeConn = conns[0];
    const apiKey = activeConn.apiKey || '***';

    const providerConfig = {
      id: providerId,
      name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      apiKey: apiKey,
      baseUrl: activeConn.baseUrl || template.baseUrl,
      adapter: template.adapter,
      tier: template.tier,
      models: template.models,
      enabled: true,
      priority: config.providers.length + 1
    };

    // Add proxy if configured
    if (activeConn.proxyUrl) {
      providerConfig.baseUrl = activeConn.proxyUrl;
    }

    config.providers.push(providerConfig);

    // If multiple connections, add as separate providers with rotation
    if (conns.length > 1) {
      console.log(`   📦 ${providerId}: ${conns.length} keys (will use rotation)`);
      
      // Add all keys to a rotation pool
      const allKeys = conns.map(c => c.apiKey).filter(Boolean);
      if (allKeys.length > 0) {
        providerConfig.apiKeys = allKeys;
        providerConfig.rotation = 'round-robin';
      }
    } else {
      console.log(`   ✅ ${providerId}: 1 key`);
    }
  }

  // Write YAML
  const yamlStr = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });

  writeFileSync(OUTPUT_PATH, yamlStr);

  console.log(`\n✅ Generated: ${OUTPUT_PATH}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Providers: ${config.providers.length}`);
  console.log(`   Total keys: ${connections.length}`);
  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Review 8router.yaml`);
  console.log(`   2. Start: npm run dev`);

} catch (error) {
  console.error('❌ Failed:', error.message);
  process.exit(1);
}
