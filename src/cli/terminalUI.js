/**
 * terminalUI.js — Main Terminal UI controller for 8Router.
 *
 * Entry point for the interactive CLI. Shows a main menu with submenus:
 *   - Providers
 *   - API Keys
 *   - Combos
 *   - CLI Tools
 *   - Settings
 *
 * Header shows live stats (endpoint, providers, keys) with async refresh.
 */

import { showMenuWithBack } from "./utils/menuHelper.js";
import { showProvidersMenu } from "./menus/providers.js";
import { showApiKeysMenu } from "./menus/apiKeys.js";
import { showCombosMenu } from "./menus/combos.js";
import { showCliToolsMenu } from "./menus/cliTools.js";
import { showSettingsMenu } from "./menus/settings.js";
import { showLiveDashboard } from "./menus/dashboard.js";
import { showQuotaMenu } from "./menus/quota.js";
import { configure as configureApi, getProviders, getApiKeyPool, getSettings } from "./api/client.js";

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  accent: "\x1b[38;2;0;209;255m",
  orange: "\x1b[38;2;255;159;67m",
  gray: "\x1b[90m",
};

// ─── Cached header (SWR pattern) ─────────────────────────────────────────
let cachedHeader = "";
let fetchingHeader = false;

function renderHeader(port, providers, keys) {
  const lines = [];
  lines.push(`${COLORS.accent}📡 8Router Terminal UI${COLORS.reset} ${COLORS.dim}— AI Gateway${COLORS.reset}`);
  lines.push(`${COLORS.dim}http://localhost:${port}/v1${COLORS.reset}`);

  // Providers count
  const pList = providers || [];
  const active = pList.filter(p => p.healthy !== false).length;
  const total = pList.length;
  const pColor = active === total ? COLORS.green : (active > 0 ? COLORS.yellow : COLORS.red);
  lines.push(`${COLORS.dim}Providers:${COLORS.reset} ${pColor}${active}/${total} active${COLORS.reset}`);

  // API Keys count
  const kList = keys || [];
  lines.push(`${COLORS.dim}API Keys: ${COLORS.reset}${COLORS.cyan}${kList.length}${COLORS.reset}`);

  return lines.join("\n");
}

async function refreshHeaderBg(port) {
  if (fetchingHeader) return;
  fetchingHeader = true;
  try {
    const [pResult, kResult] = await Promise.all([
      getProviders(),
      getApiKeyPool(),
    ]);
    const providers = pResult.success ? (pResult.data || []) : [];
    const keys = kResult.success ? (kResult.data?.pools || []) : [];
    cachedHeader = renderHeader(port, providers, keys);
  } catch {
    // Ignore errors — header stays stale
  } finally {
    fetchingHeader = false;
  }
}

function getHeader(port) {
  refreshHeaderBg(port);
  if (cachedHeader) return cachedHeader;
  return [
    `${COLORS.accent}📡 8Router Terminal UI${COLORS.reset}`,
    `${COLORS.dim}http://localhost:${port}/v1${COLORS.reset}`,
    `${COLORS.dim}Providers: ...${COLORS.reset}`,
    `${COLORS.dim}API Keys: ...${COLORS.reset}`,
  ].join("\n");
}

// ─── Main TUI ────────────────────────────────────────────────────────────

/**
 * Start the Terminal UI. Called from bin/8router.js when user selects
 * "Terminal UI" from the interface menu.
 *
 * @param {number} port – API server port
 */
export async function startTerminalUI(port = 8080) {
  // Configure the API client to talk to the right port
  configureApi({ port });

  // Prime header cache
  await refreshHeaderBg(port);

  const basePath = ["8Router"];

  // Main menu loop
  await showMenuWithBack({
    title: "📡 8Router Terminal UI",
    breadcrumb: basePath,
    headerContent: () => getHeader(port),
    items: [
      {
        label: "📊 Live Dashboard",
        action: async () => {
          await showLiveDashboard(port);
          return true; // Stay in menu
        },
      },
      {
        label: "📈 Quota Tracker",
        action: async () => {
          await showQuotaMenu(port);
          return true; // Stay in menu
        },
      },
      {
        label: "📋 Providers",
        action: async () => {
          await showProvidersMenu(port);
          return true; // Stay in menu
        },
      },
      {
        label: "🔑 API Keys",
        action: async () => {
          await showApiKeysMenu(port);
          return true;
        },
      },
      {
        label: "🔗 Combos",
        action: async () => {
          await showCombosMenu(port);
          return true;
        },
      },
      {
        label: "🔧 CLI Tools",
        action: async () => {
          await showCliToolsMenu(port);
          return true;
        },
      },
      {
        label: "⚙️  Settings",
        action: async () => {
          await showSettingsMenu(port);
          return true;
        },
      },
    ],
    backLabel: "← Back to Interface Menu",
  });
}
