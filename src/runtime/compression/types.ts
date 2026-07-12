// 8Router — Token Saver Types (Phase 2F)

export type CompressionMode = 'off' | 'safe' | 'balanced' | 'aggressive';

export type ContentKind =
  | 'terminal_log'
  | 'stack_trace'
  | 'test_output'
  | 'lint_output'
  | 'directory_tree'
  | 'grep_output'
  | 'git_diff'
  | 'structured_json'
  | 'source_code'
  | 'user_text'
  | 'unknown';

export interface CompressionConfig {
  mode: CompressionMode;
  minChars: number;
  minEstimatedTokens: number;
  maxInputChars: number;
  timeoutMs: number;
  preserveHeadLines: number;
  preserveTailLines: number;
  minSavingsPercent: number;
  includeMarker: boolean;
}

export interface CompressionInput {
  content: string;
  mode: CompressionMode;
  contentKind?: ContentKind;
  source?: string;
  maxOutputChars?: number;
}

export interface CompressionResult {
  applied: boolean;
  mode: CompressionMode;
  contentKind: ContentKind;
  compressedContent: string;
  originalChars: number;
  compressedChars: number;
  estimatedTokensBefore: number;
  estimatedTokensAfter: number;
  estimatedTokensSaved: number;
  percentSaved: number;
  compressionLatencyMs: number;
  skippedReason?: string;
  strategies: string[];
  warnings: string[];
}

export interface CompressorResult {
  content: string;
  applied: boolean;
  strategy: string;
  linesRemoved: number;
  warnings: string[];
}

// Safe log metrics (never includes content)
export interface CompressionMetrics {
  compressionMode: string;
  compressionApplied: boolean;
  compressedBlockCount: number;
  estimatedTokensBeforeCompression: number;
  estimatedTokensAfterCompression: number;
  estimatedTokensSaved: number;
  compressionPercentSaved: number;
  compressionLatencyMs: number;
  compressionSkippedReason?: string;
  compressionStrategies: string[];
}

export const SKIPPED_REASONS = {
  MODE_OFF: 'mode_off',
  BELOW_MIN_SIZE: 'below_minimum_size',
  BELOW_MIN_TOKENS: 'below_minimum_tokens',
  UNSUPPORTED_KIND: 'unsupported_content_kind',
  UNKNOWN_KIND: 'unknown_content_kind',
  STRUCTURED_JSON: 'structured_json',
  SOURCE_CODE: 'source_code',
  USER_AUTHORED: 'user_authored_content',
  TOOL_ARGUMENTS: 'tool_arguments',
  TIMEOUT: 'timeout',
  NOT_BENEFICIAL: 'compression_not_beneficial',
  COMPRESSION_ERROR: 'compression_error',
  INPUT_TOO_LARGE: 'input_too_large',
  NO_ELIGIBLE_BLOCKS: 'no_eligible_blocks',
} as const;

// Content kinds that are safe to compress
export const COMPRESSIBLE_KINDS: ReadonlySet<ContentKind> = new Set([
  'terminal_log',
  'stack_trace',
  'test_output',
  'lint_output',
  'directory_tree',
  'grep_output',
  'git_diff',
]);

// Content kinds that must never be compressed
export const PROTECTED_KINDS: ReadonlySet<ContentKind> = new Set([
  'structured_json',
  'source_code',
  'user_text',
  'unknown',
]);
