// 8Router — Core Types

export interface ProviderKey {
  id: string;
  name: string;
  apiKey: string;
  tier: 'subscription' | 'cheap' | 'free';
  baseUrl: string;
  models: string[];
  enabled: boolean;
  adapter?: string;
  requestsPerMinute?: number;
  dailyQuota?: number;
  lastUsed?: number;
  totalRequests?: number;
  totalTokens?: number;
  errors?: number;
}

export interface FallbackConfig {
  tiers: ('subscription' | 'cheap' | 'free')[];
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
}

export interface CompressionConfig {
  rtk: {
    enabled: boolean;
    compressToolOutput: boolean;
    removeLineNumbers: boolean;
    collapseWhitespace: boolean;
    maxToolOutputTokens: number;
  };
  caveman: {
    enabled: boolean;
    level: 1 | 2 | 3 | 4 | 5;
  };
}

export interface DashboardConfig {
  enabled: boolean;
  port: number;
}

export interface RouterConfig {
  port: number;
  host: string;
  fallback: FallbackConfig;
  compression: CompressionConfig;
  providers: ProviderKey[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  dashboard: DashboardConfig;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ToolDefinition {
  type: 'function';
  function: FunctionDefinition;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: ToolDefinition[];
  tool_choice?: string | Record<string, unknown>;
  frequency_penalty?: number;
  presence_penalty?: number;
  logprobs?: boolean;
  top_logprobs?: number;
  n?: number;
  seed?: number;
  user?: string;
}

export interface ChoiceMessage {
  index: number;
  message: ChatMessage;
  finish_reason: string;
  logprobs?: Record<string, unknown> | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChoiceMessage[];
  usage?: TokenUsage;
}

export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  lastCheck: number;
  consecutiveErrors: number;
  lastError?: string;
  avgLatencyMs?: number;
}

export interface ProviderStatsEntry {
  requests: number;
  tokens: number;
  errors: number;
  avgLatency: number;
}

export interface RouterStats {
  totalRequests: number;
  totalTokens: number;
  successfulRequests: number;
  failedRequests: number;
  fallbackCount: number;
  compressionSaved: number;
  providerStats: Map<string, ProviderStatsEntry>;
  uptime: number;
  startedAt: number;
}

export interface HealthCheckResponse {
  status: string;
  uptime: number;
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  database: {
    connected: boolean;
    path: string;
  };
  providers: {
    total: number;
    healthy: number;
    unhealthy: number;
    details: ProviderHealth[];
  };
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: string;
  };
}