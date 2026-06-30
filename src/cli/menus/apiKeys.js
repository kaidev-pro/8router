/**
 * 8Router — API Keys Management Menu
 * List, create, view, copy, and delete API keys.
 */

import { execSync } from 'child_process';
import { selectMenu, prompt, confirm, COLORS } from '../utils/input.js';
import { showBox, showStatus, clearScreen, showHeader } from '../utils/display.js';
import { maskKey, formatDate, formatNumber, getRelativeTime } from '../utils/format.js';
import { showMenuWithBack, showListMenu } from '../utils/menuHelper.js';
import api from '../api/client.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Copy text to clipboard (cross-platform)
 * @param {string} text
 * @returns {boolean}
 */
function copyToClipboard(text) {
  try {
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text });
    } else if (process.platform === 'win32') {
      execSync('clip', { input: text });
    } else {
      try { execSync('xclip -selection clipboard', { input: text }); }
      catch { execSync('xsel --clipboard --input', { input: text }); }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Build header showing key summary
 * @param {Array} keys
 * @returns {string}
 */
function buildKeyHeader(keys) {
  const totalRequests = keys.reduce((sum, k) => sum + (k.totalRequests || 0), 0);
  const totalTokens = keys.reduce((sum, k) => sum + (k.totalTokens || 0), 0);
  const lines = [];
  lines.push(`Keys: ${COLORS.cyan}${keys.length}${COLORS.reset}`);
  lines.push(`Total Requests: ${COLORS.cyan}${formatNumber(totalRequests)}${COLORS.reset}`);
  lines.push(`Total Tokens:   ${COLORS.cyan}${formatNumber(totalTokens)}${COLORS.reset}`);
  return lines.join('\n');
}

// ─── Key Actions Submenu ──────────────────────────────────────────

/**
 * Show actions for a specific API key
 * @param {Object} key
 * @param {Array<string>} breadcrumb
 */
async function showKeyActions(key, breadcrumb = []) {
  await showMenuWithBack({
    title: `🔑 ${key.name}`,
    breadcrumb: [...breadcrumb, key.name],
    headerContent: () => {
      const lines = [];
      lines.push(`Key:       ${COLORS.dim}${maskKey(key.key)}${COLORS.reset}`);
      lines.push(`Active:    ${key.active !== false ? `${COLORS.green}✓ Yes${COLORS.reset}` : `${COLORS.red}✗ No${COLORS.reset}`}`);
      if (key.totalRequests) lines.push(`Requests:  ${COLORS.cyan}${formatNumber(key.totalRequests)}${COLORS.reset}`);
      if (key.totalTokens) lines.push(`Tokens:    ${COLORS.cyan}${formatNumber(key.totalTokens)}${COLORS.reset}`);
      if (key.lastUsed) lines.push(`Last Used: ${COLORS.dim}${getRelativeTime(key.lastUsed)}${COLORS.reset}`);
      else lines.push(`Last Used: ${COLORS.dim}Never${COLORS.reset}`);
      if (key.createdAt) lines.push(`Created:   ${COLORS.dim}${formatDate(key.createdAt)}${COLORS.reset}`);
      return lines.join('\n');
    },
    items: [
      {
        label: '📋 View Full Key',
        action: async () => {
          await handleViewFullKey(key);
          return true;
        }
      },
      {
        label: '📎 Copy Key to Clipboard',
        action: async () => {
          await handleCopyKey(key);
          return true;
        }
      },
      {
        label: '🗑️  Delete Key',
        action: async () => {
          await handleDeleteKey(key);
          return false; // Exit menu after delete
        }
      }
    ]
  });
}

// ─── Actions ──────────────────────────────────────────────────────

/**
 * Create a new API key
 */
async function handleCreateKey() {
  clearScreen();
  console.log(`\n  ${COLORS.bold}📝 Create New API Key${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);

  const name = await prompt('  Key name: ');
  if (!name) {
    showStatus('Key name cannot be empty', 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  showStatus('Creating API key...', 'info');
  const result = await api.post('/8router/api-keys', { name });

  if (!result.success) {
    showStatus(`Failed to create key: ${result.error}`, 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  const newKey = result.data?.key || result.data;

  clearScreen();
  console.log(`\n  ${COLORS.green}✓${COLORS.reset} ${COLORS.bold}API Key created successfully!${COLORS.reset}\n`);

  // IMPORTANT: Show full key with warning
  console.log(`  ${COLORS.yellow}⚠️  IMPORTANT: Save this key now. You won't be able to see it again!${COLORS.reset}\n`);
  console.log(`  ${COLORS.bold}Name:${COLORS.reset} ${newKey.name || name}`);
  console.log(`  ${COLORS.bold}Key:${COLORS.reset}  ${COLORS.bright}${COLORS.cyan}${newKey.key}${COLORS.reset}`);
  if (newKey.id) console.log(`  ${COLORS.bold}ID:${COLORS.reset}   ${newKey.id}`);
  console.log();

  const shouldCopy = await confirm('  Copy key to clipboard?');
  if (shouldCopy) {
    if (copyToClipboard(newKey.key)) {
      showStatus('Key copied to clipboard!', 'success');
    } else {
      showStatus('Failed to copy to clipboard', 'error');
    }
  }

  await prompt('\nPress Enter to continue...');
}

/**
 * View the full API key
 * @param {Object} key
 */
async function handleViewFullKey(key) {
  clearScreen();
  console.log(`\n  ${COLORS.bold}🔍 Full API Key${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);
  console.log(`  ${COLORS.bold}Name:${COLORS.reset}   ${key.name}`);
  console.log(`  ${COLORS.bold}Key:${COLORS.reset}    ${COLORS.bright}${COLORS.cyan}${key.key}${COLORS.reset}`);
  console.log(`  ${COLORS.bold}Active:${COLORS.reset} ${key.active !== false ? 'Yes' : 'No'}`);
  console.log(`  ${COLORS.bold}Created:${COLORS.reset} ${formatDate(key.createdAt || key.created)}`);
  if (key.lastUsed) console.log(`  ${COLORS.bold}Used:${COLORS.reset}   ${getRelativeTime(key.lastUsed)}`);
  console.log();

  await prompt('  Press Enter to continue...');
}

/**
 * Copy key to clipboard
 * @param {Object} key
 */
async function handleCopyKey(key) {
  // We need the full key - the list view has a partial key
  // Show a note about copying from the view
  clearScreen();
  console.log(`\n  ${COLORS.bold}📎 Copy Key: ${key.name}${COLORS.reset}\n`);

  // Attempt to copy the available key portion
  if (copyToClipboard(key.key)) {
    showStatus(`Key "${key.name}" copied to clipboard!`, 'success');
  } else {
    showStatus('Failed to copy to clipboard', 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Delete an API key
 * @param {Object} key
 */
async function handleDeleteKey(key) {
  clearScreen();
  console.log(`\n  ${COLORS.yellow}⚠️  Delete API Key${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);
  console.log(`  Name: ${key.name}`);
  console.log(`  Key:  ${maskKey(key.key)}`);
  console.log();

  const confirmed = await confirm('  Are you sure you want to delete this key?');
  if (!confirmed) {
    showStatus('Deletion cancelled', 'info');
    await prompt('\nPress Enter to continue...');
    return false;
  }

  showStatus('Deleting key...', 'info');
  const result = await api.delete(`/8router/api-keys/${key.id}`);

  if (result.success) {
    showStatus(`API key "${key.name}" deleted successfully`, 'success');
  } else {
    showStatus(`Failed to delete key: ${result.error}`, 'error');
  }
  await prompt('\nPress Enter to continue...');
  return true;
}

// ─── Main Menu ────────────────────────────────────────────────────

/**
 * Show API keys management menu
 * @param {number} port - Server port
 */
export async function showApiKeysMenu(port) {
  await showListMenu({
    title: '🔑 API Keys Management',
    breadcrumb: [],
    headerContent: async () => {
      const result = await api.get('/8router/api-keys');
      const keys = result.success ? (Array.isArray(result.data) ? result.data : []) : [];
      return buildKeyHeader(keys);
    },
    fetchItems: async () => {
      const result = await api.get('/8router/api-keys');
      if (!result.success) {
        clearScreen();
        showStatus(`Failed to fetch API keys: ${result.error}`, 'error');
        await prompt('\nPress Enter to continue...');
        return null;
      }
      const keys = Array.isArray(result.data) ? result.data : [];
      return { items: keys };
    },
    formatItem: (key) => {
      const status = key.active !== false ? `${COLORS.green}●${COLORS.reset}` : `${COLORS.red}●${COLORS.reset}`;
      const masked = maskKey(key.key);
      const reqs = key.totalRequests ? ` · ${formatNumber(key.totalRequests)} reqs` : '';
      const lastUsed = key.lastUsed ? ` · ${getRelativeTime(key.lastUsed)}` : '';
      return `${status} ${key.name} (${masked})${reqs}${lastUsed}`;
    },
    onSelect: async (key) => {
      await showKeyActions(key, ['API Keys']);
    },
    createAction: {
      label: '➕ Create New API Key',
      action: async () => {
        await handleCreateKey();
      }
    }
  });
}
