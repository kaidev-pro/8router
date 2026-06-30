/**
 * 8Router — Providers Management Menu
 * List providers, health status, models, key pool, and add custom providers.
 */

import { selectMenu, prompt, confirm, COLORS } from '../utils/input.js';
import { showBox, showTable, showStatus, clearScreen, showHeader } from '../utils/display.js';
import { formatNumber } from '../utils/format.js';
import { showMenuWithBack, showListMenu } from '../utils/menuHelper.js';
import api from '../api/client.js';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Health status icon
 * @param {boolean} healthy
 * @returns {string}
 */
function healthIcon(healthy) {
  return healthy ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
}

/**
 * Format provider list header
 * @param {Array} providers
 * @param {Object} health
 * @returns {string}
 */
function buildProviderHeader(providers, health) {
  const healthy = providers.filter(p => p.healthy).length;
  const lines = [];
  lines.push(`Providers: ${COLORS.cyan}${providers.length}${COLORS.reset} total, ${COLORS.green}${healthy}${COLORS.reset} healthy`);
  if (health?.providers) {
    const entries = health.providers;
    entries.slice(0, 5).forEach(h => {
      const icon = h.healthy ? `${COLORS.green}✓` : `${COLORS.red}✗`;
      const rt = h.responseTime ? ` ${COLORS.dim}(${h.responseTime}ms)${COLORS.reset}` : '';
      lines.push(`  ${icon} ${h.id || h.name}${COLORS.reset}${rt}`);
    });
    if (entries.length > 5) {
      lines.push(`  ${COLORS.dim}...and ${entries.length - 5} more${COLORS.reset}`);
    }
  }
  return lines.join('\n');
}

// ─── Provider Detail Submenu ──────────────────────────────────────

/**
 * Show detail view for a single provider
 * @param {Object} provider
 * @param {Array<string>} breadcrumb
 */
async function showProviderDetail(provider, breadcrumb = []) {
  const health = await fetchHealth();
  const healthInfo = health?.providers?.find(h => h.id === provider.id) || {};

  await showMenuWithBack({
    title: `🔌 ${provider.name || provider.id}`,
    breadcrumb: [...breadcrumb, provider.name || provider.id],
    headerContent: () => {
      const lines = [];
      lines.push(`Status:     ${healthIcon(healthInfo.healthy || provider.healthy)} ${healthInfo.healthy || provider.healthy ? 'Healthy' : 'Unhealthy'}`);
      if (healthInfo.responseTime) lines.push(`Response:   ${COLORS.cyan}${healthInfo.responseTime}ms${COLORS.reset}`);
      if (provider.apiKey) lines.push(`API Key:    ${COLORS.dim}${provider.apiKey}${COLORS.reset}`);
      if (provider.models) lines.push(`Models:     ${COLORS.cyan}${provider.models.length}${COLORS.reset}`);
      return lines.join('\n');
    },
    items: [
      {
        label: '🔍 Test Connection',
        action: async () => {
          await testProviderConnection(provider.id);
          return true;
        }
      },
      {
        label: '📋 View Models',
        action: async () => {
          await showProviderModels(provider);
          return true;
        }
      },
      {
        label: '🔑 View Key Pool',
        action: async () => {
          await showKeyPoolDetail(provider.id);
          return true;
        }
      }
    ]
  });
}

// ─── Fetch Helpers ────────────────────────────────────────────────

async function fetchHealth() {
  const result = await api.get('/8router/health');
  return result.success ? result.data : null;
}

async function fetchKeyPool() {
  const result = await api.get('/8router/key-pool');
  return result.success ? result.data : null;
}

// ─── Actions ──────────────────────────────────────────────────────

/**
 * Test a provider connection
 * @param {string} providerId
 */
async function testProviderConnection(providerId) {
  clearScreen();
  showStatus(`Testing connection to ${providerId}...`, 'info');

  // Test by checking health endpoint
  const health = await fetchHealth();
  if (!health) {
    showStatus('Failed to check provider health', 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  const info = health.providers?.find(h => h.id === providerId);
  if (info?.healthy) {
    showStatus(`✓ ${providerId} is healthy${info.responseTime ? ` (${info.responseTime}ms)` : ''}`, 'success');
  } else {
    showStatus(`✗ ${providerId} is not healthy`, 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Show models available for a provider
 * @param {Object} provider
 */
async function showProviderModels(provider) {
  clearScreen();
  const models = provider.models || [];

  if (models.length === 0) {
    showStatus(`No models found for ${provider.name || provider.id}`, 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  console.log(`\n  ${COLORS.bold}Models for ${provider.name || provider.id}${COLORS.reset}`);
  console.log(`  ${'─'.repeat(40)}`);
  models.forEach((m, i) => {
    console.log(`  ${COLORS.cyan}${i + 1}.${COLORS.reset} ${typeof m === 'string' ? m : m.id || m.name || JSON.stringify(m)}`);
  });
  console.log(`\n  ${COLORS.dim}Total: ${models.length} models${COLORS.reset}`);

  await prompt('\nPress Enter to continue...');
}

/**
 * Show key pool status for a specific provider
 * @param {string} providerId
 */
async function showKeyPoolDetail(providerId) {
  clearScreen();
  showStatus('Loading key pool...', 'info');

  const pool = await fetchKeyPool();
  if (!pool) {
    showStatus('Failed to load key pool', 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  // pool is an object keyed by provider ID or array
  let providerPool;
  if (Array.isArray(pool)) {
    providerPool = pool.find(p => p.providerId === providerId || p.id === providerId);
  } else if (pool[providerId]) {
    providerPool = pool[providerId];
  } else if (pool.pools) {
    providerPool = pool.pools.find(p => p.providerId === providerId);
  }

  console.log(`\n  ${COLORS.bold}Key Pool: ${providerId}${COLORS.reset}`);
  console.log(`  ${'─'.repeat(40)}`);

  if (providerPool) {
    const total = providerPool.totalKeys || providerPool.total || 0;
    const healthy = providerPool.healthyKeys || providerPool.healthy || 0;
    console.log(`  Total Keys:   ${COLORS.cyan}${total}${COLORS.reset}`);
    console.log(`  Healthy Keys: ${COLORS.green}${healthy}${COLORS.reset}`);
    console.log(`  Status:       ${healthy > 0 ? `${COLORS.green}● Active${COLORS.reset}` : `${COLORS.red}● No healthy keys${COLORS.reset}`}`);
  } else {
    showStatus(`No key pool info for ${providerId}`, 'warning');
  }

  await prompt('\nPress Enter to continue...');
}

// ─── Custom Providers ─────────────────────────────────────────────

/**
 * Add a custom provider
 */
async function handleAddCustomProvider() {
  clearScreen();
  console.log(`\n  ${COLORS.bold}➕ Add Custom Provider${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);

  const name = await prompt('  Provider name: ');
  if (!name) {
    showStatus('Cancelled', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  const baseUrl = await prompt('  Base URL (e.g. https://api.example.com/v1): ');
  if (!baseUrl) {
    showStatus('Cancelled', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  const apiKey = await prompt('  API Key: ');
  if (!apiKey) {
    showStatus('Cancelled', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  // Check if there's a specific endpoint for adding providers
  // 8Router uses env config, so we'll guide the user
  showStatus('Adding custom provider...', 'info');

  console.log(`\n  ${COLORS.bold}To add this provider to 8Router:${COLORS.reset}`);
  console.log(`  Add to 8router.yaml config:\n`);
  console.log(`  ${COLORS.cyan}providers:${COLORS.reset}`);
  console.log(`    ${COLORS.cyan}- id: ${name.toLowerCase().replace(/\s+/g, '-')}${COLORS.reset}`);
  console.log(`    ${COLORS.cyan}  baseUrl: ${baseUrl}${COLORS.reset}`);
  console.log(`    ${COLORS.cyan}  apiKey: ${apiKey}${COLORS.reset}`);
  console.log(`    ${COLORS.cyan}  enabled: true${COLORS.reset}`);
  console.log(`\n  ${COLORS.dim}Then restart 8Router for changes to take effect.${COLORS.reset}`);

  await prompt('\nPress Enter to continue...');
}

// ─── Main Menu ────────────────────────────────────────────────────

/**
 * Show providers management menu
 * @param {number} port - Server port
 */
export async function showProvidersMenu(port) {
  await showListMenu({
    title: '🔌 Providers Management',
    breadcrumb: [],
    headerContent: async () => {
      const [provRes, healthRes] = await Promise.all([
        api.get('/8router/providers'),
        api.get('/8router/health')
      ]);
      const providers = provRes.success ? (Array.isArray(provRes.data) ? provRes.data : []) : [];
      const health = healthRes.success ? healthRes.data : null;
      return buildProviderHeader(providers, health);
    },
    fetchItems: async () => {
      const result = await api.get('/8router/providers');
      if (!result.success) {
        clearScreen();
        showStatus(`Failed to load providers: ${result.error}`, 'error');
        await prompt('\nPress Enter to continue...');
        return null;
      }
      const providers = Array.isArray(result.data) ? result.data : [];
      return { items: providers };
    },
    formatItem: (provider) => {
      const healthy = provider.healthy !== false;
      const icon = healthy ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
      const modelCount = provider.models?.length || provider.modelCount || 0;
      return `${icon} ${provider.name || provider.id} — ${modelCount} models`;
    },
    onSelect: async (provider) => {
      await showProviderDetail(provider, ['Providers']);
    },
    createAction: {
      label: '➕ Add Custom Provider',
      action: async () => {
        await handleAddCustomProvider();
      }
    }
  });
}
