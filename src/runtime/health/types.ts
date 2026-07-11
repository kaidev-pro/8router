// 8Router — Provider Health Types (Phase 2D)

export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown' | 'disabled';
export type CircuitState = 'closed' | 'open' | 'half_open';
export type FailureType = 'rate_limit' | 'quota_exhausted' | 'auth_error' | 'timeout'
  | 'network_error' | 'provider_error' | 'model_unavailable' | 'context_length'
  | 'invalid_request' | 'unknown';

export interface ProviderHealthRecord {
  id: string;
  userId: string;
  providerCredentialId: string;
  provider: string;
  status: HealthStatus;
  circuitState: CircuitState;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  averageLatencyMs: number;
  lastLatencyMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastStatusCode: number | null;
  cooldownUntil: string | null;
  openedAt: string | null;
  halfOpenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordInput {
  userId: string;
  providerCredentialId: string;
  provider: string;
  latencyMs: number;
  status: number;        // HTTP status or 0
  errorType?: FailureType;
  safeMessage?: string;  // already redacted
  statusCode?: number;
  retryAfterMs?: number; // from Retry-After header
}

export interface ClassifierResult {
  type: FailureType;
  retryable: boolean;
  shouldOpenCircuit: boolean;
  cooldownMs?: number;
  safeMessage: string;
  statusCode?: number;
  code?: string;
}

export const CIRCUIT_DEFAULTS = {
  failureThreshold: 3,
  cooldownMs: 60_000,
  halfOpenSuccessThreshold: 1,
} as const;
