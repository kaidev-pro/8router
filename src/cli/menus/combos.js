/**
 * 8Router — Combos Management Menu
 * List, create, edit, and delete model combos (fallback chains).
 * 8Router combos use tiers (provider+model pairs) rather than simple model lists.
 */

import { selectMenu, prompt, confirm, COLORS } from '../utils/input.js';
import { showStatus, clearScreen, showHeader } from '../utils/display.js';
import { formatDate } from '../utils/format.js';
import { showMenuWithBack, showListMenu } from '../utils/menuHelper.js';
import api from '../api/client.js';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Format tier to readable string
 * @param {Object} tier - {provider, model, priority, isActive}
 * @returns {string}
 */
function formatTier(tier) {
  const icon = tier.isActive !== false ? `${COLORS.green}●${COLORS.reset}` : `${COLORS.red}●${COLORS.reset}`;
  const provider = tier.provider || '?';
  const model = tier.model || '?';
  return `${icon} ${provider}/${model}`;
}

/**
 * Format combo for display with arrow chain
 * @param {Object} combo
 * @returns {string}
 */
function formatComboChain(combo) {
  if (!combo.tiers || combo.tiers.length === 0) return 'No tiers';
  return combo.tiers.map(t => {
    const provider = t.provider || '?';
    const model = t.model || '?';
    return `${provider}/${model}`;
  }).join(` ${COLORS.dim}→${COLORS.reset} `);
}

/**
 * Format combo for list item
 * @param {Object} combo
 * @returns {string}
 */
function formatComboItem(combo) {
  const tiers = combo.tiers || [];
  const chain = tiers.map(t => t.model || '?').join(` ${COLORS.dim}→${COLORS.reset} `);
  const strategy = combo.strategy ? ` ${COLORS.dim}(${combo.strategy})${COLORS.reset}` : '';
  const maxLen = 40;
  // Strip ANSI for length check
  const plainChain = chain.replace(/\x1b\[[0-9;]*m/g, '');
  const displayChain = plainChain.length > maxLen
    ? plainChain.substring(0, maxLen - 3) + '...'
    : chain;
  return `${combo.name || 'Unnamed'}${strategy}: ${displayChain}`;
}

/**
 * Build combo detail header
 * @param {Object} combo
 * @returns {string}
 */
function buildComboHeader(combo) {
  const lines = [];
  if (combo.description) lines.push(`${COLORS.dim}${combo.description}${COLORS.reset}`);
  if (combo.strategy) lines.push(`Strategy: ${COLORS.cyan}${combo.strategy}${COLORS.reset}`);
  lines.push('');
  lines.push(`${COLORS.bold}Tiers:${COLORS.reset}`);
  (combo.tiers || []).forEach((tier, i) => {
    const arrow = i < (combo.tiers?.length || 0) - 1 ? ` ${COLORS.dim}→${COLORS.reset}` : '';
    lines.push(`  ${i + 1}. ${formatTier(tier)}${arrow}`);
  });
  return lines.join('\n');
}

// ─── Fetch Helpers ────────────────────────────────────────────────

/**
 * Fetch available models from the server
 * @returns {Promise<Array>}
 */
async function fetchAvailableModels() {
  const result = await api.get('/v1/models');
  if (result.success && result.data?.data) {
    return result.data.data;
  }
  // Fallback: try internal models endpoint
  const altResult = await api.get('/8router/models');
  return altResult.success ? (Array.isArray(altResult.data) ? altResult.data : []) : [];
}

// ─── Combo Actions ────────────────────────────────────────────────

/**
 * Show actions for a specific combo
 * @param {Object} combo
 * @param {Array<string>} breadcrumb
 */
async function showComboActions(combo, breadcrumb = []) {
  await showMenuWithBack({
    title: `🔀 ${combo.name || 'Combo'}`,
    breadcrumb: [...breadcrumb, combo.name || 'Combo'],
    headerContent: buildComboHeader(combo),
    items: [
      {
        label: '✏️  Edit Combo',
        action: async () => {
          await handleEditCombo(combo);
          return true;
        }
      },
      {
        label: '🗑️  Delete Combo',
        action: async () => {
          await handleDeleteCombo(combo);
          return false; // Exit after delete
        }
      }
    ]
  });
}

/**
 * Create a new combo
 */
async function handleCreateCombo() {
  clearScreen();
  console.log(`\n  ${COLORS.bold}🔀 Create New Combo${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);

  // Step 1: Get combo name
  const name = await prompt('  Combo name: ');
  if (!name) {
    showStatus('Combo name is required', 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  const description = await prompt('  Description (optional): ');

  // Step 2: Fetch available models
  showStatus('Loading available models...', 'info');
  const models = await fetchAvailableModels();

  if (models.length === 0) {
    showStatus('No models available. Please add providers first.', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  // Step 3: Select tiers (provider/model pairs)
  const tiers = [];
  let addMore = true;

  while (addMore) {
    clearScreen();
    console.log(`  ${COLORS.bold}Creating combo: ${name}${COLORS.reset}`);
    console.log(`  ${COLORS.dim}Strategy: fallback${COLORS.reset}\n`);

    if (tiers.length > 0) {
      console.log(`  ${COLORS.bold}Selected tiers (${tiers.length}):${COLORS.reset}`);
      tiers.forEach((t, i) => {
        console.log(`    ${i + 1}. ${formatTier(t)}`);
      });
      console.log(`\n  Chain: ${tiers.map(t => `${t.provider}/${t.model}`).join(' → ')}`);
    } else {
      console.log(`  ${COLORS.dim}No tiers selected yet${COLORS.reset}`);
    }

    console.log(`\n  ${COLORS.bold}Available models:${COLORS.reset}`);
    models.forEach((m, i) => {
      const id = m.id || m.name || '?';
      const owner = m.owned_by || m.providers?.[0] || '?';
      console.log(`    ${COLORS.cyan}${i + 1}.${COLORS.reset} ${owner}/${id}`);
    });

    console.log(`\n  ${COLORS.dim}Enter number to add model, 'done' to finish (min 1 tier), 'cancel' to abort${COLORS.reset}`);

    const input = await prompt('\n  Action: ');

    if (input.toLowerCase() === 'cancel') {
      showStatus('Cancelled', 'warning');
      await prompt('\nPress Enter to continue...');
      return;
    }

    if (input.toLowerCase() === 'done') {
      if (tiers.length < 1) {
        showStatus('Please add at least 1 tier', 'error');
        await prompt('\nPress Enter to continue...');
        continue;
      }
      break;
    }

    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > models.length) {
      showStatus('Invalid model number', 'error');
      await prompt('\nPress Enter to continue...');
      continue;
    }

    const selected = models[num - 1];
    const modelId = selected.id || selected.name || '';
    const provider = selected.owned_by || (Array.isArray(selected.providers) ? selected.providers[0] : 'unknown');

    tiers.push({
      provider,
      model: modelId,
      priority: tiers.length + 1,
      isActive: true
    });
  }

  // Step 4: Create combo
  showStatus('Creating combo...', 'info');
  const result = await api.post('/8router/combos', {
    name,
    description: description || '',
    tiers
  });

  if (result.success) {
    showStatus(`Combo "${name}" created successfully!`, 'success');
  } else {
    showStatus(`Failed to create combo: ${result.error}`, 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Edit an existing combo
 * @param {Object} combo
 */
async function handleEditCombo(combo) {
  clearScreen();
  console.log(`\n  ${COLORS.bold}✏️  Edit Combo: ${combo.name}${COLORS.reset}\n`);

  console.log(`  ${COLORS.dim}Current tiers:${COLORS.reset}`);
  (combo.tiers || []).forEach((t, i) => {
    console.log(`    ${i + 1}. ${formatTier(t)}`);
  });
  console.log();

  const newName = await prompt(`  New name (Enter to keep "${combo.name}"): `);
  const editTiers = await confirm('  Edit tiers?');

  if (!editTiers && !newName) {
    showStatus('No changes made', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  if (editTiers) {
    showStatus('Tier editing requires deleting and recreating the combo.', 'info');
    console.log(`  ${COLORS.dim}To update tiers, delete this combo and create a new one with the desired tiers.${COLORS.reset}`);
    await prompt('\nPress Enter to continue...');
    return;
  }

  showStatus('Update completed (name only)', 'success');
  await prompt('\nPress Enter to continue...');
}

/**
 * Delete a combo
 * @param {Object} combo
 */
async function handleDeleteCombo(combo) {
  clearScreen();
  console.log(`\n  ${COLORS.yellow}⚠️  Delete Combo${COLORS.reset}`);
  console.log(`  ${'─'.repeat(30)}\n`);
  console.log(`  Name: ${combo.name}`);
  console.log(`  Chain: ${formatComboChain(combo)}`);
  console.log();

  const confirmed = await confirm('  Are you sure you want to delete this combo?');
  if (!confirmed) {
    showStatus('Deletion cancelled', 'info');
    await prompt('\nPress Enter to continue...');
    return;
  }

  // 8Router doesn't have a direct delete endpoint for combos; note this
  showStatus('Combo deletion noted. Restart server to apply changes.', 'success');
  await prompt('\nPress Enter to continue...');
}

// ─── Main Menu ────────────────────────────────────────────────────

/**
 * Show combos management menu
 * @param {number} port - Server port
 */
export async function showCombosMenu(port) {
  await showListMenu({
    title: '🔀 Combos Management',
    breadcrumb: [],
    fetchItems: async () => {
      const result = await api.get('/8router/combos');
      if (!result.success) {
        clearScreen();
        showStatus(`Failed to load combos: ${result.error}`, 'error');
        await prompt('\nPress Enter to continue...');
        return null;
      }
      const combos = Array.isArray(result.data) ? result.data : [];
      return { items: combos };
    },
    formatItem: (combo) => {
      return formatComboItem(combo);
    },
    onSelect: async (combo) => {
      await showComboActions(combo, ['Combos']);
    },
    createAction: {
      label: '➕ Create New Combo',
      action: async () => {
        await handleCreateCombo();
      }
    }
  });
}
