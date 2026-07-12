// 8Router — Compression Module Barrel Exports (Phase 2F)

export type { CompressionMode, ContentKind, CompressionInput, CompressionResult, CompressorResult, CompressionMetrics } from './types.js';
export { SKIPPED_REASONS, COMPRESSIBLE_KINDS, PROTECTED_KINDS } from './types.js';
export { loadCompressionConfig, resolveCompressionMode } from './config.js';
export { classifyContent } from './classify.js';
export { estimateTokens } from './estimate-tokens.js';
export { shouldCompress, getStrategiesForMode } from './policy.js';
export { compressContent, toMetrics } from './compress.js';
