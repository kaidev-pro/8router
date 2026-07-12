// 8Router — Token Estimation (Phase 2F)
// Deterministic approximation: ceil(chars / 4)
// Always labeled as estimated. No external providers.

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil((text || '').length / 4));
}
