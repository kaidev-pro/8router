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
    { provider: 'xiaomi-tokenplan', model: 'mimo-v2-pro' },
    { provider: 'xiaomi-tokenplan', model: 'mimo-v2-omni' },
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
