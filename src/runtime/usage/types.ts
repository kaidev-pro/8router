// 8Router — Usage Types (Phase 2E)

export interface RuntimeRequestLog {
  id: string;
  userId: string;
  accessKeyId: string;
  accessKeyName: string | null;
  accessKeyHint: string | null;
  requestId: string | null;
  traceId: string | null;
  endpoint: string | null;
  method: string | null;
  requestedModel: string;
  requestedAlias: string | null;
  routeMode: string | null;
  actualProvider: string | null;
  actualModel: string | null;
  status: string;
  httpStatus: number | null;
  success: number | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
  estimatedInputCost: number | null;
  estimatedOutputCost: number | null;
  estimatedTotalCost: number | null;
  currency: string | null;
  fallbackCount: number | null;
  hadFallback: number | null;
  attemptCount: number | null;
  finalAttemptId: string | null;
  errorType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  providerHealthStatus: string | null;
  circuitState: string | null;
  streaming: number | null;
  clientUserAgent: string | null;
  clientTool: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface RuntimeRequestAttempt {
  id: string;
  requestLogId: string;
  userId: string;
  attemptIndex: number;
  provider: string;
  model: string;
  baseUrlHost: string | null;
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
  status: string;
  httpStatus: number | null;
  success: number;
  failureType: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  circuitStateBefore: string | null;
  circuitStateAfter: string | null;
  healthStatusBefore: string | null;
  healthStatusAfter: string | null;
  retryAfterMs: number | null;
  cooldownUntil: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  currency: string | null;
  createdAt: string;
}

export interface UsageSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  estimatedTotalCost: number | null;
  averageLatencyMs: number | null;
  fallbackCount: number;
  fallbackRate: number;
  uniqueProviders: number;
  uniqueModels: number;
}

export interface TimeseriesPoint {
  timestamp: string;
  value: number;
}

export interface BreakdownRow {
  key: string;
  requests: number;
  tokens: number;
  estimatedCost: number | null;
  averageLatencyMs: number | null;
  successRate: number;
}

export interface LogFilters {
  status?: string;
  provider?: string;
  model?: string;
  alias?: string;
  accessKeyId?: string;
  hadFallback?: boolean;
  errorType?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface LogListResult {
  items: Partial<RuntimeRequestLog>[];
  pagination: Pagination;
}

export type TimeRange = '24h' | '7d' | '30d' | '90d';
export type Granularity = 'hour' | 'day' | 'week';
export type UsageMetric = 'requests' | 'tokens' | 'cost' | 'latency' | 'errors' | 'fallbacks';
