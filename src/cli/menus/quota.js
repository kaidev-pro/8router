/**
 * 8Router — Quota Tracker Menu (Terminal UI)
 * 
 * Shows per-provider quota usage with reset countdowns.
 * Displays requests, tokens, cost with progress bars.
 */

import api from '../api/client.js';
import { COLORS, prompt } from '../utils/input.js';
import { clearScreen, showStatus } from '../utils/display.js';
import { showMenuWithBack } from '../utils/menuHelper.js';

// ─── Helpers ──────────────────────────────────────────────────────

function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

function formatCost(cost) {
  if (!cost || cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function progressBar(percent, width = 20) {
  const filled = Math.round(width * percent / 100);
  const empty = width - filled;
  let color;
  if (percent > 80) color = COLORS.red;
  else if (percent > 50) color = COLORS.yellow;
  else color = COLORS.green;
  
  return `${color}${'█'.repeat(filled)}${COLORS.dim}${'░'.repeat(empty)}${COLORS.reset}`;
}

function statusBadge(percent) {
  if (percent > 80) return `${COLORS.red}● Critical${COLORS.reset}`;
  if (percent > 50) return `${COLORS.yellow}● Warning${COLORS.reset}`;
  return `${COLORS.green}● Healthy${COLORS.reset}`;
}

// ─── Data Fetch ───────────────────────────────────────────────────

async function fetchQuotaData() {
  const [quotaRes, providersRes] = await Promise.all([
    api.get('/8router/quota'),
    api.get('/8router/providers'),
  ]);

  return {
    quota: quotaRes.success ? quotaRes.data : [],
    providers: providersRes.success ? providersRes.data : [],
  };
}

// ─── Render ───────────────────────────────────────────────────────

function renderQuotaSummary(quota, providers) {
  const lines = [];
  
  if (!quota || quota.length === 0) {
    lines.push(`${COLORS.dim}No quota data yet. Send some requests to see usage.${COLORS.reset}`);
    return lines.join('\n');
  }

  // Group by provider
  const byProvider = {};
  for (const q of quota) {
    if (!byProvider[q.provider]) byProvider[q.provider] = [];
    byProvider[q.provider].push(q);
  }

  for (const [provider, periods] of Object.entries(byProvider)) {
    const provInfo = providers.find(p => p.id === provider);
    const tier = provInfo?.tier || 'unknown';
    const tierBadge = tier === 'free' ? `${COLORS.green}[free]${COLORS.reset}` :
                      tier === 'cheap' ? `${COLORS.yellow}[cheap]${COLORS.reset}` :
                      `${COLORS.cyan}[${tier}]${COLORS.reset}`;
    
    lines.push(`${tierBadge} ${COLORS.bright}${provider}${COLORS.reset}`);
    
    for (const q of periods) {
      const reqPct = q.requestsPercent || 0;
      const tokPct = q.tokensPercent || 0;
      const costPct = q.costPercent || 0;
      
      lines.push(`  ${COLORS.dim}${q.period}:${COLORS.reset} ${statusBadge(Math.max(reqPct, tokPct, costPct))}`);
      lines.push(`    Req: ${progressBar(reqPct, 15)} ${q.requests.toLocaleString()}${q.quotaLimit ? `/${q.quotaLimit.toLocaleString()}` : ''} ${COLORS.dim}(${reqPct.toFixed(0)}%)${COLORS.reset}`);
      lines.push(`    Tok: ${progressBar(tokPct, 15)} ${formatTokens(q.totalTokens)}${q.tokenLimit ? `/${formatTokens(q.tokenLimit)}` : ''} ${COLORS.dim}(${tokPct.toFixed(0)}%)${COLORS.reset}`);
      if (q.cost > 0 || q.costLimit) {
        lines.push(`    $  : ${progressBar(costPct, 15)} ${formatCost(q.cost)}${q.costLimit ? `/${formatCost(q.costLimit)}` : ''} ${COLORS.dim}(${costPct.toFixed(0)}%)${COLORS.reset}`);
      }
      lines.push(`    ${COLORS.dim}⏱ Resets in: ${q.timeRemaining}${COLORS.reset}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Main Menu ────────────────────────────────────────────────────

export async function showQuotaMenu(port = 8080) {
  let lastData = { quota: [], providers: [] };

  await showMenuWithBack({
    title: '📊 Quota Tracker',
    breadcrumb: ['Quota'],
    headerContent: async () => {
      try {
        lastData = await fetchQuotaData();
        return renderQuotaSummary(lastData.quota, lastData.providers);
      } catch (e) {
        return `${COLORS.red}Error loading quota: ${e.message}${COLORS.reset}`;
      }
    },
    items: [
      {
        label: '🔄 Refresh',
        action: async () => {
          clearScreen();
          showStatus('Refreshing quota data...', 'info');
          try {
            lastData = await fetchQuotaData();
            clearScreen();
            console.log('\n' + renderQuotaSummary(lastData.quota, lastData.providers));
            await prompt('\nPress Enter to continue...');
          } catch (e) {
            showStatus(`Error: ${e.message}`, 'error');
            await prompt('\nPress Enter to continue...');
          }
          return true;
        },
      },
      {
        label: '📋 Provider Details',
        action: async () => {
          clearScreen();
          if (!lastData.providers || lastData.providers.length === 0) {
            showStatus('No providers found', 'warning');
            await prompt('\nPress Enter to continue...');
            return true;
          }

          console.log(`\n  ${COLORS.bright}Provider Quota Details${COLORS.reset}`);
          console.log(`  ${'─'.repeat(50)}`);

          for (const p of lastData.providers) {
            const pQuota = lastData.quota.filter(q => q.provider === p.id);
            const totalReqs = p.totalRequests || 0;
            const totalTokens = p.totalTokens || 0;
            const errors = p.errors || 0;

            console.log(`\n  ${COLORS.bright}${p.name || p.id}${COLORS.reset} ${COLORS.dim}[${p.tier || 'unknown'}]${COLORS.reset}`);
            console.log(`    Total: ${totalReqs.toLocaleString()} requests, ${formatTokens(totalTokens)} tokens, ${errors} errors`);

            if (pQuota.length > 0) {
              for (const q of pQuota) {
                const pct = q.requestsPercent || 0;
                console.log(`    ${q.period}: ${progressBar(pct, 10)} ${pct.toFixed(0)}% ${COLORS.dim}(resets in ${q.timeRemaining})${COLORS.reset}`);
              }
            }
          }

          await prompt('\nPress Enter to continue...');
          return true;
        },
      },
    ],
    backLabel: '← Back to Main Menu',
  });
}
