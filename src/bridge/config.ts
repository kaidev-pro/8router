// 8Router — Canonical Bridge Configuration
// Phase 1A: Feature flag plumbing — no runtime behavior change

/**
 * Canonical bridge configuration.
 * Embedded in RouterConfig.canonical.
 *
 * Default state: ALL runtime paths disabled.
 * No behavior change until explicitly activated.
 */
export interface CanonicalConfig {
  /**
   * Enable canonical format bridge runtime path.
   * When false, all requests use existing normalizeRequest()/formatResponse().
   * Default: false
   */
  enabled: boolean;

  /**
   * Shadow mode: run canonical conversion alongside direct path, log diffs.
   * Shadow mode does NOT make a second provider request.
   * It only runs conversion + semantic comparison in-memory.
   * Default: false
   */
  shadowMode: boolean;

  /**
   * Maximum payload size (in bytes) for shadow mode comparison.
   * Requests exceeding this limit skip shadow comparison with reason 'payload_too_large'.
   * Default: 102400 (100KB)
   */
  shadowMaxPayloadBytes: number;

  /**
   * Whether to log bridge warnings to the request log.
   * Warnings include field_preserved, field_dropped, field_transformed, etc.
   * Default: true
   */
  logWarnings: boolean;
}

/** Default canonical config — everything disabled */
export const DEFAULT_CANONICAL_CONFIG: CanonicalConfig = {
  enabled: false,
  shadowMode: false,
  shadowMaxPayloadBytes: 102400, // 100KB
  logWarnings: true,
};

/**
 * Load canonical config from environment variables.
 * Env vars take precedence over defaults.
 * Invalid numeric values fall back to defaults safely.
 */
export function loadCanonicalConfigFromEnv(): Partial<CanonicalConfig> {
  const config: Partial<CanonicalConfig> = {};

  const enabled = process.env.CANONICAL_BRIDGE_ENABLED;
  if (enabled !== undefined) {
    config.enabled = enabled === 'true';
  }

  const shadowMode = process.env.CANONICAL_BRIDGE_SHADOW_MODE;
  if (shadowMode !== undefined) {
    config.shadowMode = shadowMode === 'true';
  }

  const shadowMax = process.env.CANONICAL_BRIDGE_SHADOW_MAX_PAYLOAD_BYTES;
  if (shadowMax !== undefined) {
    const parsed = parseInt(shadowMax, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      config.shadowMaxPayloadBytes = parsed;
    }
  }

  const logWarnings = process.env.CANONICAL_BRIDGE_LOG_WARNINGS;
  if (logWarnings !== undefined) {
    config.logWarnings = logWarnings === 'true';
  }

  return config;
}

/**
 * Merge partial config into defaults. Undefined values use defaults.
 * shadowMode does NOT automatically enable the canonical runtime path.
 */
export function mergeCanonicalConfig(
  partial?: Partial<CanonicalConfig>,
): CanonicalConfig {
  if (!partial) return { ...DEFAULT_CANONICAL_CONFIG };

  return {
    enabled: partial.enabled ?? DEFAULT_CANONICAL_CONFIG.enabled,
    shadowMode: partial.shadowMode ?? DEFAULT_CANONICAL_CONFIG.shadowMode,
    shadowMaxPayloadBytes:
      partial.shadowMaxPayloadBytes ?? DEFAULT_CANONICAL_CONFIG.shadowMaxPayloadBytes,
    logWarnings: partial.logWarnings ?? DEFAULT_CANONICAL_CONFIG.logWarnings,
  };
}
