// 8Router — Combo System
// Named fallback chains like 9Router

import { getCombo, getAllCombos as dbGetAllCombos, createCombo as dbCreateCombo } from '../database.js';
import type { ComboTierRow, ComboRow } from '../database.js';

// Re-export from database
export { getCombo };
export const getAllCombos = dbGetAllCombos;
export const createCombo = dbCreateCombo;

// ═══════════════════════════════════════════════
// COMBO RESOLVER
// ═══════════════════════════════════════════════

interface ComboRoute {
  provider: string;
  model: string;
}

export function resolveCombo(comboName: string): ComboRoute[] {
  const result = getCombo(comboName);
  if (!result) return [];
  
  const { tiers } = result;
  return tiers
    .filter(t => t.isActive)
    .map(t => ({
      provider: t.provider,
      model: t.model || '*'
    }));
}

export function isCombo(name: string): boolean {
  const result = getCombo(name);
  return result !== null;
}

export function getAllComboNames(): string[] {
  const combos = getAllCombos();
  return combos.map(c => c.combo.name);
}

// ═══════════════════════════════════════════════
// DEFAULT COMBOS (created on first run)
// ═══════════════════════════════════════════════

export function ensureDefaultCombos(): void {
  const existing = getAllCombos();
  if (existing.length > 0) return;
  
  console.log('[8Router] Creating default combos...');
  
  createCombo('MIMO', 'Xiaomi MiMo model pool', [
    { provider: 'mimo', model: 'mimo-v2.5-pro' },
    { provider: 'mimo', model: 'mimo-v2-omni' },
    { provider: 'mimo', model: '*' },
  ]);
  
  createCombo('Groq', 'Groq free tier models', [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'groq', model: 'mixtral-8x7b-32768' },
  ]);
  
  createCombo('Mistral', 'Mistral AI models', [
    { provider: 'mistral', model: 'mistral-large-latest' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ]);
  
  createCombo('OpenRouter', 'All models via OpenRouter', [
    { provider: 'openrouter', model: '*' },
  ]);
  
  createCombo('Free', 'Any free provider', [
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'ollama', model: '*' },
    { provider: 'mimo', model: '*' },
    { provider: 'openrouter', model: '*' },
  ]);
  
  createCombo('Cheap', 'Budget-friendly options', [
    { provider: 'deepseek', model: 'deepseek-chat' },
    { provider: 'mistral', model: 'mistral-small-latest' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  ]);
  
  console.log('[8Router] Default combos created');
}

// ═══════════════════════════════════════════════
// COMBO ROUTING
// ═══════════════════════════════════════════════

export function getComboRoutes(comboName: string): { provider: string; model: string }[] {
  return resolveCombo(comboName);
}

// Phase 6B — Proxy Aggregator Combos
createCombo("Antigravity", "Google Antigravity proxy", [
  { provider: "antigravity", model: "claude-opus-4-6-thinking" },
  { provider: "antigravity", model: "claude-sonnet-4-6" },
  { provider: "antigravity", model: "gemini-3-flash-agent" },
  { provider: "antigravity", model: "gpt-oss-120b-medium" },
]);

createCombo("OpenAICODEX", "OpenAI Codex proxy", [
  { provider: "codex", model: "gpt-5.5" },
  { provider: "codex", model: "gpt-5.4" },
  { provider: "codex", model: "gpt-5.3-codex" },
  { provider: "codex", model: "gpt-5.2" },
]);

createCombo("githubcopilot", "GitHub Copilot proxy", [
  { provider: "github-copilot", model: "claude-sonnet-4.5" },
  { provider: "github-copilot", model: "gpt-5.4" },
  { provider: "github-copilot", model: "gemini-3-flash-preview" },
  { provider: "github-copilot", model: "grok-code-fast-1" },
]);

createCombo("KiroAI", "Moonshot Kimi proxy", [
  { provider: "kimi", model: "claude-sonnet-4.5" },
  { provider: "kimi", model: "deepseek-3.2" },
  { provider: "kimi", model: "qwen3-coder-next" },
  { provider: "kimi", model: "glm-5" },
]);

createCombo("OpenGO", "OCG proxy aggregator", [
  { provider: "ocg", model: "glm-5.2" },
  { provider: "ocg", model: "kimi-k2.7-code" },
  { provider: "ocg", model: "deepseek-v4-pro" },
  { provider: "ocg", model: "mimo-v2.5-pro" },
]);

// Phase 6E — Model Gap Closure Combos
createCombo("GeminiCLI", "Gemini CLI proxy models", [
  { provider: "gc", model: "gemini-3.1-pro-preview" },
  { provider: "gc", model: "gemini-2.5-pro" },
  { provider: "gc", model: "gemini-2.5-flash" },
]);

createCombo("XMTP", "XMTP MiMo proxy", [
  { provider: "xmtp", model: "mimo-v2.5-pro" },
  { provider: "xmtp", model: "mimo-v2.5" },
  { provider: "xmtp", model: "mimo-v2-omni" },
]);

createCombo("DeepSeekV4", "DeepSeek V4 models", [
  { provider: "ds-v4", model: "deepseek-v4-pro" },
  { provider: "ds-v4", model: "deepseek-v4-flash" },
]);
