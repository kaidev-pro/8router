// 8Router — Canonical Provider Adapter Interface

import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../types.js';

export interface FullProviderAdapter {
  id: string;
  name: string;

  // Model discovery
  listModels(apiKey: string, baseUrl: string): Promise<string[]>;

  // Chat
  chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse>;

  // Streaming
  streamChatCompletion(req: ChatCompletionRequest, provider: ProviderKey, onData: (chunk: any) => void): Promise<void>;

  // Embeddings (optional)
  embeddings?(input: string | string[], model: string, provider: ProviderKey): Promise<{embedding: number[], tokens: number}[]>;

  // Request/Response normalization
  normalizeRequest(req: ChatCompletionRequest, provider: ProviderKey): any;
  normalizeResponse(raw: any, provider: ProviderKey): ChatCompletionResponse;
  normalizeError(err: any, provider: ProviderKey): { message: string; code: string; status: number };

  // Health check
  healthCheck(apiKey: string, baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }>;
}
