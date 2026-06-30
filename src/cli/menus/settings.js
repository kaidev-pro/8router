/**
 * 8Router — Settings Menu
 * Toggle switches for RTK, Guardrails, Privacy Mode, Cost Optimizer, Caveman.
 * Show server info (version, uptime, port). Shutdown option with confirmation.
 */

import { selectMenu, prompt, confirm, COLORS } from '../utils/input.js';
import { showStatus, clearScreen, showHeader } from '../utils/display.js';
import { showMenuWithBack } from '../utils/menuHelper.js';
import api from '../api/client.js';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Format seconds to human-readable uptime
 * @param {number} seconds
 * @returns {string}
 */
function formatUptime(seconds) {
  if (!seconds || seconds < 0) return 'Unknown';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0) parts.push(minutes + 'm');
  parts.push(secs + 's');
  return parts.join(' ');
}

/**
 * Toggle switch display helper
 * @param {string} label
 * @param {boolean} isOn
 * @returns {string}
 */
function toggleLabel(label, isOn) {
  const status = isOn
    ? COLORS.green + 'ON ' + COLORS.reset
    : COLORS.red + 'OFF' + COLORS.reset;
  const arrow = COLORS.dim + ' → toggle' + COLORS.reset;
  return label + ': [' + status + ']' + arrow;
}

/**
 * Check if a value is truthy/on
 * @param {*} value
 * @returns {boolean}
 */
function isOn(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  if (typeof value === 'number') return value > 0;
  return !!value;
}

// ─── Setting Toggle Actions ───────────────────────────────────────

/**
 * Toggle RTK (Token Saver)
 * @param {Object} currentSettings
 */
async function toggleRtk(currentSettings) {
  const currentState = isOn(currentSettings?.rtk);
  const newState = !currentState;

  showStatus('Toggling Token Saver (RTK)...', 'info');
  const result = await api.post('/8router/settings', { rtk: String(newState) });

  if (result.success) {
    showStatus('Token Saver (RTK) ' + (newState ? 'enabled' : 'disabled'), 'success');
  } else {
    showStatus('Failed to toggle RTK: ' + (result.error || 'Unknown error'), 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Toggle Guardrails
 * @param {Object} currentGuardrails
 */
async function toggleGuardrails(currentGuardrails) {
  const currentState = isOn(currentGuardrails?.enabled);
  const newState = !currentState;

  showStatus('Toggling Guardrails...', 'info');
  const result = await api.post('/8router/guardrails', { enabled: newState });

  if (result.success) {
    showStatus('Guardrails ' + (newState ? 'enabled' : 'disabled'), 'success');
  } else {
    showStatus('Failed to toggle Guardrails: ' + (result.error || 'Unknown error'), 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Toggle Privacy Mode
 * @param {Object} currentPrivacy
 */
async function togglePrivacy(currentPrivacy) {
  const currentState = isOn(currentPrivacy?.privacy_mode);
  const newState = !currentState;

  showStatus('Toggling Privacy Mode...', 'info');
  const result = await api.post('/8router/privacy', { enabled: newState });

  if (result.success) {
    showStatus('Privacy Mode ' + (newState ? 'enabled — cloud providers blocked' : 'disabled — all providers available'), 'success');
  } else {
    showStatus('Failed to toggle Privacy Mode: ' + (result.error || 'Unknown error'), 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Toggle Cost Optimizer
 * @param {Object} currentCostOpt
 */
async function toggleCostOptimizer(currentCostOpt) {
  const currentState = isOn(currentCostOpt?.enabled);
  const newState = !currentState;

  showStatus('Toggling Cost Optimizer...', 'info');
  const result = await api.post('/8router/cost-optimizer', { enabled: newState });

  if (result.success) {
    showStatus('Cost Optimizer ' + (newState ? 'enabled — smart routing active' : 'disabled — explicit model selection only'), 'success');
  } else {
    showStatus('Failed to toggle Cost Optimizer: ' + (result.error || 'Unknown error'), 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Cycle Caveman mode (0-5)
 * @param {Object} currentCaveman
 */
async function toggleCaveman(currentCaveman) {
  const currentLevel = currentCaveman?.level || 0;
  const nextLevel = (currentLevel + 1) % 6; // Cycle 0-5

  const descriptions = {
    0: 'Disabled',
    1: 'Mild compression',
    2: 'Medium compression',
    3: 'Aggressive compression',
    4: 'Extreme compression',
    5: 'Maximum compression',
  };

  showStatus('Setting Caveman mode...', 'info');
  const result = await api.post('/8router/caveman', { level: nextLevel });

  if (result.success) {
    showStatus('Caveman mode: Level ' + nextLevel + ' — ' + descriptions[nextLevel], 'success');
  } else {
    showStatus('Failed to set Caveman mode: ' + (result.error || 'Unknown error'), 'error');
  }
  await prompt('\nPress Enter to continue...');
}

/**
 * Shutdown the server with confirmation
 */
async function handleShutdown() {
  clearScreen();
  console.log('');
  console.log('  ' + COLORS.yellow + '⚠️  Shutdown 8Router Server' + COLORS.reset);
  console.log('  ' + '─'.repeat(30));
  console.log('');
  console.log('  This will shut down the 8Router server.');
  console.log('  All active connections will be terminated.');
  console.log('');

  const confirmed = await confirm('  Are you sure you want to shut down?');
  if (!confirmed) {
    showStatus('Shutdown cancelled', 'info');
    await prompt('\nPress Enter to continue...');
    return;
  }

  showStatus('Shutting down 8Router...', 'info');
  const result = await api.post('/8router/shutdown', {});

  if (result.success) {
    showStatus('Server shutdown initiated. Goodbye!', 'success');
  } else {
    showStatus('Shutdown request sent. Server may already be stopping.', 'info');
  }

  // Exit the CLI since the server is shutting down
  console.log('');
  console.log('  ' + COLORS.dim + 'The CLI will now exit.' + COLORS.reset);
  console.log('');
  process.exit(0);
}

// ─── Main Settings Menu ───────────────────────────────────────────

/**
 * Show settings menu with toggle switches and server info
 * @param {number} port - Server port
 */
export async function showSettingsMenu(port) {
  await showMenuWithBack({
    title: '⚙️  Settings',
    breadcrumb: [],
    headerContent: async (data) => {
      const lines = [];

      // Server info section
      const info = data?.info;
      if (info) {
        lines.push(COLORS.bold + 'Server Info' + COLORS.reset);
        lines.push('  Version:  ' + COLORS.cyan + (info.version || 'Unknown') + COLORS.reset);
        lines.push('  Uptime:   ' + COLORS.cyan + formatUptime(info.uptime) + COLORS.reset);
        lines.push('  Port:     ' + COLORS.cyan + port + COLORS.reset);
        if (info.features && info.features.length > 0) {
          lines.push('  Features: ' + COLORS.dim + info.features.length + ' enabled' + COLORS.reset);
        }
        lines.push('');
      }

      // Settings section
      const settings = data?.settings || {};
      const privacy = data?.privacy || {};
      const guardrails = data?.guardrails || {};
      const costOpt = data?.costOptimizer || {};
      const caveman = data?.caveman || {};

      lines.push(COLORS.bold + 'Toggles' + COLORS.reset);
      lines.push('  RTK (Token Saver):  ' + (isOn(settings.rtk) ? COLORS.green + 'ON' : COLORS.red + 'OFF') + COLORS.reset);
      lines.push('  Guardrails:         ' + (isOn(guardrails.enabled) ? COLORS.green + 'ON' : COLORS.red + 'OFF') + COLORS.reset);
      lines.push('  Privacy Mode:       ' + (isOn(privacy.privacy_mode) ? COLORS.green + 'ON' : COLORS.red + 'OFF') + COLORS.reset);
      lines.push('  Cost Optimizer:     ' + (isOn(costOpt.enabled) ? COLORS.green + 'ON' : COLORS.red + 'OFF') + COLORS.reset);
      const cavemanLevel = caveman.level || 0;
      lines.push('  Caveman:            ' + (cavemanLevel > 0 ? COLORS.green + 'Level ' + cavemanLevel : COLORS.red + 'OFF') + COLORS.reset);

      return lines.join('\n');
    },
    refresh: async () => {
      const [settingsRes, privacyRes, guardrailsRes, costOptRes, cavemanRes, infoRes] = await Promise.all([
        api.get('/8router/settings'),
        api.get('/8router/privacy'),
        api.get('/8router/guardrails'),
        api.get('/8router/cost-optimizer'),
        api.get('/8router/caveman'),
        api.get('/8router/info'),
      ]);

      return {
        settings: settingsRes.success ? settingsRes.data : {},
        privacy: privacyRes.success ? privacyRes.data : {},
        guardrails: guardrailsRes.success ? guardrailsRes.data : {},
        costOptimizer: costOptRes.success ? costOptRes.data : {},
        caveman: cavemanRes.success ? cavemanRes.data : {},
        info: infoRes.success ? infoRes.data : null,
      };
    },
    items: [
      {
        label: (d) => {
          const on = isOn(d?.settings?.rtk);
          return toggleLabel('Token Saver (RTK)', on);
        },
        action: async (d) => {
          await toggleRtk(d?.settings || {});
          return true;
        }
      },
      {
        label: (d) => {
          const on = isOn(d?.guardrails?.enabled);
          return toggleLabel('Guardrails', on);
        },
        action: async (d) => {
          await toggleGuardrails(d?.guardrails || {});
          return true;
        }
      },
      {
        label: (d) => {
          const on = isOn(d?.privacy?.privacy_mode);
          return toggleLabel('Privacy Mode', on);
        },
        action: async (d) => {
          await togglePrivacy(d?.privacy || {});
          return true;
        }
      },
      {
        label: (d) => {
          const on = isOn(d?.costOptimizer?.enabled);
          return toggleLabel('Cost Optimizer', on);
        },
        action: async (d) => {
          await toggleCostOptimizer(d?.costOptimizer || {});
          return true;
        }
      },
      {
        label: (d) => {
          const level = d?.caveman?.level || 0;
          const desc = d?.caveman?.description || 'Disabled';
          const status = level > 0
            ? COLORS.green + 'Level ' + level + ' (' + desc + ')' + COLORS.reset
            : COLORS.red + 'OFF' + COLORS.reset;
          const arrow = COLORS.dim + ' → cycle' + COLORS.reset;
          return 'Caveman Mode: [' + status + ']' + arrow;
        },
        action: async (d) => {
          await toggleCaveman(d?.caveman || {});
          return true;
        }
      },
      {
        label: '',
        action: async () => true,
        isSeparator: true,
      },
      {
        label: '📊 Server Info',
        action: async (d) => {
          await showServerInfo(d?.info, port);
          return true;
        }
      },
      {
        label: '🔌 Shutdown Server',
        action: async () => {
          await handleShutdown();
          return true;
        }
      }
    ]
  });
}

// ─── Server Info Detail ───────────────────────────────────────────

/**
 * Show detailed server info
 * @param {Object} info
 * @param {number} port
 */
async function showServerInfo(info, port) {
  clearScreen();

  if (!info) {
    showStatus('Failed to load server info', 'error');
    await prompt('\nPress Enter to continue...');
    return;
  }

  console.log('');
  console.log('  ' + COLORS.bold + '📊 8Router Server Info' + COLORS.reset);
  console.log('  ' + '─'.repeat(40));
  console.log('');

  console.log('  ' + COLORS.bold + 'Name:' + COLORS.reset + '        ' + (info.name || '8Router'));
  console.log('  ' + COLORS.bold + 'Version:' + COLORS.reset + '     ' + COLORS.cyan + (info.version || 'Unknown') + COLORS.reset);
  console.log('  ' + COLORS.bold + 'Uptime:' + COLORS.reset + '      ' + COLORS.cyan + formatUptime(info.uptime) + COLORS.reset);
  console.log('  ' + COLORS.bold + 'Port:' + COLORS.reset + '        ' + COLORS.cyan + port + COLORS.reset);
  console.log('');

  if (info.description) {
    console.log('  ' + COLORS.dim + info.description + COLORS.reset);
    console.log('');
  }

  // Endpoints
  if (info.endpoints) {
    console.log('  ' + COLORS.bold + 'Endpoints:' + COLORS.reset);
    for (const [key, url] of Object.entries(info.endpoints)) {
      console.log('    ' + COLORS.cyan + key + COLORS.reset + ': ' + COLORS.dim + url + COLORS.reset);
    }
    console.log('');
  }

  // Features
  if (info.features && info.features.length > 0) {
    console.log('  ' + COLORS.bold + 'Features (' + info.features.length + '):' + COLORS.reset);
    info.features.forEach(f => {
      console.log('    ' + COLORS.green + '✓' + COLORS.reset + ' ' + f);
    });
    console.log('');
  }

  await prompt('  Press Enter to continue...');
}
