/**
 * 8Router — CLI Tools Configuration Menu
 * Configure external CLI tools to route through 8Router.
 * Tools: Claude Code, Codex CLI, Hermes Agent, OpenCode
 */

import { selectMenu, prompt, confirm, COLORS } from '../utils/input.js';
import { showStatus, clearScreen } from '../utils/display.js';
import { maskKey } from '../utils/format.js';
import { showMenuWithBack } from '../utils/menuHelper.js';
import api from '../api/client.js';

// ─── Constants ────────────────────────────────────────────────────

const DEFAULT_PORT = 8080;

/** Tool definitions with their env var mappings */
const TOOLS = {
  claude: {
    id: 'claude',
    name: 'Claude Code',
    icon: '🤖',
    baseEnv: 'ANTHROPIC_BASE_URL',
    keyEnv: 'ANTHROPIC_API_KEY',
    configHint: 'Claude Code reads ANTHROPIC_BASE_URL and ANTHROPIC_API_KEY from the environment.',
  },
  codex: {
    id: 'codex',
    name: 'Codex CLI',
    icon: '🦾',
    baseEnv: 'OPENAI_BASE_URL',
    keyEnv: 'OPENAI_API_KEY',
    configHint: 'Codex CLI reads OPENAI_BASE_URL and OPENAI_API_KEY from the environment.',
  },
  hermes: {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '⚡',
    baseEnv: 'OPENAI_BASE_URL',
    keyEnv: 'OPENAI_API_KEY',
    configHint: 'Hermes Agent can also be configured in ~/.hermes/config.yaml under models.',
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    icon: '💻',
    baseEnv: 'OPENAI_BASE_URL',
    keyEnv: 'OPENAI_API_KEY',
    configHint: 'OpenCode reads OPENAI_BASE_URL and OPENAI_API_KEY from the environment.',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Get 8Router endpoint URL
 * @param {number} port
 * @returns {string}
 */
function getEndpoint(port = DEFAULT_PORT) {
  return 'http://localhost:' + port + '/v1';
}

/**
 * Check if a tool is configured (env vars set)
 * @param {Object} tool
 * @returns {boolean}
 */
function isToolConfigured(tool) {
  const hasBase = !!process.env[tool.baseEnv];
  const hasKey = !!process.env[tool.keyEnv];
  return hasBase && hasKey;
}

/**
 * Build status header for a tool
 * @param {Object} tool
 * @returns {string}
 */
function buildToolHeader(tool) {
  const configured = isToolConfigured(tool);
  const lines = [];

  lines.push('Status:   ' + (configured ? COLORS.green + '✓ Configured' + COLORS.reset : COLORS.red + '✗ Not configured' + COLORS.reset));

  const currentBase = process.env[tool.baseEnv] || 'Not set';
  const currentKey = process.env[tool.keyEnv];
  lines.push('Endpoint: ' + COLORS.cyan + currentBase + COLORS.reset);
  if (currentKey) {
    lines.push('API Key:  ' + COLORS.dim + maskKey(currentKey) + COLORS.reset);
  }

  lines.push('');
  lines.push(COLORS.dim + tool.configHint + COLORS.reset);

  return lines.join('\n');
}

// ─── Tool Actions ─────────────────────────────────────────────────

/**
 * Show full status and setup guide for a tool
 * @param {Object} tool
 * @param {number} port
 */
async function showToolStatus(tool, port) {
  const endpoint = getEndpoint(port);

  clearScreen();
  console.log('');
  console.log('  ' + COLORS.bold + tool.icon + ' ' + tool.name + ' — Setup Guide' + COLORS.reset);
  console.log('  ' + '─'.repeat(40));
  console.log('');

  // Show env var status
  console.log('  ' + COLORS.bold + 'Environment Variables:' + COLORS.reset);
  console.log('');

  const baseVal = process.env[tool.baseEnv];
  const keyVal = process.env[tool.keyEnv];

  const baseStatus = baseVal ? (COLORS.green + '✓ Set' + COLORS.reset) : (COLORS.red + '✗ Not set' + COLORS.reset);
  const keyStatus = keyVal ? (COLORS.green + '✓ Set' + COLORS.reset) : (COLORS.red + '✗ Not set' + COLORS.reset);

  console.log('  ' + baseStatus + '  ' + COLORS.cyan + tool.baseEnv + COLORS.reset);
  if (baseVal) console.log('         ' + COLORS.dim + 'Value: ' + baseVal + COLORS.reset);

  console.log('  ' + keyStatus + '  ' + COLORS.cyan + tool.keyEnv + COLORS.reset);
  if (keyVal) console.log('         ' + COLORS.dim + 'Value: ' + maskKey(keyVal) + COLORS.reset);

  console.log('');
  console.log('  ' + COLORS.bold + 'Quick Setup Commands:' + COLORS.reset);
  console.log('  ' + COLORS.dim + 'Copy and run these in your terminal:' + COLORS.reset);
  console.log('');

  const exportBase = '  export ' + tool.baseEnv + '="' + endpoint + '"';
  const exportKey = '  export ' + tool.keyEnv + '="sk-8router-YOUR_API_KEY"';
  console.log(COLORS.cyan + exportBase + COLORS.reset);
  console.log(COLORS.cyan + exportKey + COLORS.reset);

  console.log('');
  console.log('  ' + COLORS.yellow + '⚠  Replace sk-8router-YOUR_API_KEY with your actual API key.' + COLORS.reset);
  console.log('  ' + COLORS.dim + 'Create one in: API Keys → Create New API Key' + COLORS.reset);

  // Tool-specific hints
  console.log('');
  console.log('  ' + COLORS.bold + 'Config File:' + COLORS.reset);
  if (tool.id === 'hermes') {
    console.log('  ' + COLORS.dim + 'Edit ~/.hermes/config.yaml:' + COLORS.reset);
    console.log(COLORS.cyan + '  models:' + COLORS.reset);
    console.log(COLORS.cyan + '    - id: 8router' + COLORS.reset);
    console.log(COLORS.cyan + '      api_base: "' + endpoint + '"' + COLORS.reset);
    console.log(COLORS.cyan + '      api_key: "sk-8router-YOUR_API_KEY"' + COLORS.reset);
  } else if (tool.id === 'claude') {
    console.log('  ' + COLORS.dim + 'Add to ~/.bashrc or ~/.zshrc:' + COLORS.reset);
    console.log(COLORS.cyan + exportBase + COLORS.reset);
    console.log(COLORS.cyan + exportKey + COLORS.reset);
  } else {
    console.log('  ' + COLORS.dim + 'Add the exports to your shell profile (~/.bashrc, ~/.zshrc)' + COLORS.reset);
  }

  console.log('');
  console.log('  ' + COLORS.dim + 'Any model available through 8Router can be used.' + COLORS.reset);
  console.log('  ' + COLORS.dim + 'Example model: claude-sonnet-4-20250514, gpt-4o, gemini-2.5-pro' + COLORS.reset);

  await prompt('\n  Press Enter to continue...');
}

/**
 * Quick setup wizard for a tool
 * @param {Object} tool
 * @param {number} port
 */
async function toolQuickSetup(tool, port) {
  const endpoint = getEndpoint(port);

  clearScreen();
  console.log('');
  console.log('  ' + COLORS.bold + '⚡ Quick Setup: ' + tool.name + COLORS.reset);
  console.log('  ' + '─'.repeat(30));
  console.log('');

  console.log('  ' + COLORS.bold + 'Endpoint:' + COLORS.reset + ' ' + COLORS.cyan + endpoint + COLORS.reset);
  console.log('');

  const apiKey = await prompt('  Your 8Router API key: ');
  if (!apiKey) {
    showStatus('Cancelled', 'warning');
    await prompt('\nPress Enter to continue...');
    return;
  }

  console.log('');
  console.log('  ' + COLORS.bold + 'Run these commands:' + COLORS.reset);
  console.log('');

  const exportBase = 'export ' + tool.baseEnv + '="' + endpoint + '"';
  const exportKey = 'export ' + tool.keyEnv + '="' + apiKey + '"';

  console.log('  ' + COLORS.cyan + exportBase + COLORS.reset);
  console.log('  ' + COLORS.cyan + exportKey + COLORS.reset);

  if (tool.id === 'hermes') {
    console.log('');
    console.log('  ' + COLORS.bold + 'Or in Hermes config (~/.hermes/config.yaml):' + COLORS.reset);
    console.log(COLORS.cyan + '  models:' + COLORS.reset);
    console.log(COLORS.cyan + '    - id: 8router' + COLORS.reset);
    console.log(COLORS.cyan + '      api_base: "' + endpoint + '"' + COLORS.reset);
    console.log(COLORS.cyan + '      api_key: "' + apiKey + '"' + COLORS.reset);
  }

  console.log('');
  console.log('  ' + COLORS.dim + 'Add these to ~/.bashrc or ~/.zshrc for persistence.' + COLORS.reset);

  showStatus('Configuration commands ready!', 'success');
  await prompt('\n  Press Enter to continue...');
}

/**
 * Show submenu for a specific tool
 * @param {string} toolId
 * @param {number} port
 * @param {Array<string>} breadcrumb
 */
async function showToolMenu(toolId, port, breadcrumb = []) {
  const tool = TOOLS[toolId];
  if (!tool) return;

  await showMenuWithBack({
    title: tool.icon + ' ' + tool.name + ' Settings',
    breadcrumb: [...breadcrumb, tool.name],
    headerContent: () => buildToolHeader(tool),
    items: [
      {
        label: '📊 View Status & Setup Guide',
        action: async () => {
          await showToolStatus(tool, port);
          return true;
        }
      },
      {
        label: '⚡ Quick Setup',
        action: async () => {
          await toolQuickSetup(tool, port);
          return true;
        }
      }
    ]
  });
}

// ─── Main Menu ────────────────────────────────────────────────────

/**
 * Show CLI Tools configuration menu
 * @param {number} port - Server port
 */
export async function showCliToolsMenu(port) {
  const endpoint = getEndpoint(port);

  await showMenuWithBack({
    title: '🔧 CLI Tools',
    breadcrumb: [],
    headerContent: 'Configure external CLI tools to use 8Router\nEndpoint: ' + COLORS.cyan + endpoint + COLORS.reset,
    items: [
      {
        label: '🤖 Claude Code',
        action: async () => {
          await showToolMenu('claude', port, ['CLI Tools']);
          return true;
        }
      },
      {
        label: '🦾 Codex CLI',
        action: async () => {
          await showToolMenu('codex', port, ['CLI Tools']);
          return true;
        }
      },
      {
        label: '⚡ Hermes Agent',
        action: async () => {
          await showToolMenu('hermes', port, ['CLI Tools']);
          return true;
        }
      },
      {
        label: '💻 OpenCode',
        action: async () => {
          await showToolMenu('opencode', port, ['CLI Tools']);
          return true;
        }
      }
    ]
  });
}
