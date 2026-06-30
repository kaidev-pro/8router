// 8Router — Latency Tracker
// Tracks per-provider/model latency statistics for smart model selection

export interface LatencyStats {
  p50: number;   // median latency in ms
  p95: number;   // 95th percentile
  p99: number;   // 99th percentile
  avg: number;   // average latency
  count: number; // number of samples
  lastUpdated: number;
}

// In-memory latency store: key = "provider:model"
const latencyStore = new Map<string, { samples: number[]; lastUpdated: number }>();
const MAX_SAMPLES = 200;

/**
 * Record a latency sample for a provider/model pair.
 */
export function recordLatency(providerId: string, modelId: string, latencyMs: number): void {
  const key = `${providerId}:${modelId}`;
  let entry = latencyStore.get(key);
  if (!entry) {
    entry = { samples: [], lastUpdated: Date.now() };
    latencyStore.set(key, entry);
  }
  entry.samples.push(latencyMs);
  // Keep only the most recent samples
  if (entry.samples.length > MAX_SAMPLES) {
    entry.samples = entry.samples.slice(-MAX_SAMPLES);
  }
  entry.lastUpdated = Date.now();
}

/**
 * Get latency statistics for a provider/model pair.
 * Returns null if no data is available.
 */
export function getLatencyStats(providerId: string, modelId: string): LatencyStats | null {
  const key = `${providerId}:${modelId}`;
  const entry = latencyStore.get(key);
  if (!entry || entry.samples.length === 0) return null;

  const sorted = [...entry.samples].sort((a, b) => a - b);
  const count = sorted.length;

  return {
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
    avg: sorted.reduce((a, b) => a + b, 0) / count,
    count,
    lastUpdated: entry.lastUpdated,
  };
}

/**
 * Get all tracked provider:model pairs with their stats.
 */
export function getAllLatencyStats(): Record<string, LatencyStats> {
  const result: Record<string, LatencyStats> = {};
  for (const [key] of latencyStore) {
    const [providerId, modelId] = key.split(':');
    const stats = getLatencyStats(providerId, modelId);
    if (stats) result[key] = stats;
  }
  return result;
}

/**
 * Clear all latency data (useful for testing or reset).
 */
export function clearLatencyData(): void {
  latencyStore.clear();
}
