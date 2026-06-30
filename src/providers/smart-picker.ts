// 8Router — Smart Model Picker
// Automatically selects the best model based on task requirements, cost, speed, and quality

import { MODEL_CAPABILITIES, ModelCapability } from './model-capabilities.js';
import { getLatencyStats } from './latency-tracker.js';

export interface PickerOptions {
  task?: 'chat' | 'coding' | 'vision' | 'analysis' | 'creative' | 'fast';
  requireTools?: boolean;
  requireVision?: boolean;
  maxCostPer1m?: number;  // max total cost per 1M tokens
  preferSpeed?: boolean;
  preferQuality?: boolean;
  excludeProviders?: string[];
}

export function pickBestModel(options: PickerOptions): { model: string; provider: string; reason: string } | null {
  let candidates = [...getAllCapableModels()];

  // Filter by requirements
  if (options.requireVision) candidates = candidates.filter(m => m.vision);
  if (options.requireTools) candidates = candidates.filter(m => m.tools);
  if (options.excludeProviders) candidates = candidates.filter(m => !options.excludeProviders!.includes(m.provider));
  if (options.maxCostPer1m) candidates = candidates.filter(m => ((m.costPer1mInput ?? 0) + (m.costPer1mOutput ?? 0)) <= options.maxCostPer1m!);

  // Task-specific filtering
  if (options.task === 'coding') candidates = candidates.filter(m => m.tools && m.qualityTier !== 'low');
  if (options.task === 'vision') candidates = candidates.filter(m => m.vision);
  if (options.task === 'fast') candidates = candidates.filter(m => m.speedTier === 'fast');

  if (candidates.length === 0) return null;

  // Score each candidate
  const scored = candidates.map(m => {
    let score = 0;
    
    // Cost score (lower is better)
    const maxCost = Math.max(...candidates.map(c => (c.costPer1mInput ?? 0) + (c.costPer1mOutput ?? 0)));
    const costNorm = maxCost > 0 ? ((m.costPer1mInput ?? 0) + (m.costPer1mOutput ?? 0)) / maxCost : 0;
    score += (1 - costNorm) * 30;

    // Speed score
    const speedScore = m.speedTier === 'fast' ? 30 : m.speedTier === 'medium' ? 20 : 10;
    score += speedScore * (options.preferSpeed ? 1.5 : 1);

    // Quality score
    const qualityScore = m.qualityTier === 'premium' ? 30 : m.qualityTier === 'high' ? 20 : m.qualityTier === 'medium' ? 10 : 0;
    score += qualityScore * (options.preferQuality ? 1.5 : 1);

    // Latency bonus (if we have data)
    const latency = getLatencyStats(m.provider, m.id);
    if (latency && latency.p50 < 500) score += 10;

    return { model: m, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  return {
    model: best.model.id,
    provider: best.model.provider,
    reason: `Selected ${best.model.displayName} (score: ${best.score.toFixed(1)}, cost: $${(best.model.costPer1mInput ?? 0) + (best.model.costPer1mOutput ?? 0)}/1M, speed: ${best.model.speedTier})`,
  };
}

function getAllCapableModels(): ModelCapability[] {
  return MODEL_CAPABILITIES.filter(m => !m.embeddings);
}
