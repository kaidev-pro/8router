// 8Router — Core Types

export interface ProviderKey {
  id: string;
  name: string;
  apiKey: string;
  tier: 'subscription' | 'cheap' | 'free';
  baseUrl: string;
  models: string[];
  enabled: boolean;
  requestsPerMinute?: number;
  dailyQuota?: number;
  lastUsed?: number;
  totalRequests?: number;
  totalTokens?: number;
  errors?: number;
  adapter?: string;
  priority?: number;
  apiKeys?: string[];
  rotation?: 'round-robin';
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

export interface RouterConfig {
  port: number;
  host: string;
  fallback: FallbackConfig;
  compression: CompressionConfig;
  providers: ProviderKey[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  dashboard: {
    enabled: boolean;
    port: number;
  };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  [key: string]: any;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderHealth {
  providerId: string;
  healthy: boolean;
  lastCheck: number;
  consecutiveErrors: number;
  lastError?: string;
  avgLatencyMs?: number;
}

export interface RouterStats {
  totalRequests: number;
  totalTokens: number;
  successfulRequests: number;
  failedRequests: number;
  fallbackCount: number;
  compressionSaved: number;
  providerStats: Map<string, {
    requests: number;
    tokens: number;
    errors: number;
    avgLatency: number;
  }>;
  uptime: number;
  startedAt: number;
}

// Format Translator types
export type RequestFormat = 'openai' | 'anthropic' | 'gemini';

export interface FormatDetectionResult {
  format: RequestFormat;
  source: 'header' | 'body' | 'path' | 'default';
}

export interface AnthropicMessagesRequest {
  model: string;
  max_tokens: number;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<{ type: string; text?: string; [key: string]: any }>;
  }>;
  system?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: Array<{
    name: string;
    description?: string;
    input_schema: any;
  }>;
  tool_choice?: any;
  stop_sequences?: string[];
  metadata?: any;
}

export interface AnthropicMessagesResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: any }>;
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence?: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}
