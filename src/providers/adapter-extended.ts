// 8Router — Extended Provider Adapters
// Mistral, Cohere, DeepSeek, xAI, Together, Fireworks, Replicate, Ollama, etc.

import { ProviderKey, ChatCompletionRequest, ChatCompletionResponse } from '../types.js';

export interface ProviderAdapter {
  name: string;
  buildRequest(req: ChatCompletionRequest, provider: ProviderKey): any;
  buildHeaders(provider: ProviderKey): Record<string, string>;
  parseResponse(raw: any, provider: ProviderKey): ChatCompletionResponse;
  getEndpoint(provider: ProviderKey, stream: boolean): string;
}

// ═══════════════════════════════════════════════════════════════
// OpenAI-compatible (OpenAI, Groq, OpenRouter, Together, Fireworks, Cerebras, SambaNova, Perplexity)
// ═══════════════════════════════════════════════════════════════
export class OpenAIAdapter implements ProviderAdapter {
  name = 'openai';
  extraHeaders?: Record<string, string>;

  constructor(extraHeaders?: Record<string, string>) {
    this.extraHeaders = extraHeaders;
  }

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    return req;
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...this.extraHeaders,
    };
  }

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    return raw as ChatCompletionResponse;
  }

  getEndpoint(provider: ProviderKey, _stream: boolean): string {
    return `${provider.baseUrl}/chat/completions`;
  }
}

// OpenRouter with extra headers
export class OpenRouterAdapter extends OpenAIAdapter {
  constructor() {
    super({
      'HTTP-Referer': 'https://8router.8agents.com',
      'X-Title': '8Router',
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// Anthropic (Claude)
// ═══════════════════════════════════════════════════════════════
export class AnthropicAdapter implements ProviderAdapter {
  name = 'anthropic';

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    const systemMsgs = req.messages.filter(m => m.role === 'system');
    const otherMsgs = req.messages.filter(m => m.role !== 'system');

    return {
      model: req.model,
      max_tokens: req.max_tokens || 4096,
      system: systemMsgs.map(m => m.content).join('\n') || undefined,
      messages: otherMsgs.map(m => ({
        role: m.role === 'tool' ? 'user' : m.role,
        content: m.content,
      })),
      temperature: req.temperature,
      stream: req.stream,
    };
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  parseResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
    return {
      id: raw.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: raw.model || provider.models[0],
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: raw.content?.map((c: any) => c.text).join('') || '',
        },
        finish_reason: raw.stop_reason === 'end_turn' ? 'stop' : raw.stop_reason || 'stop',
      }],
      usage: raw.usage ? {
        prompt_tokens: raw.usage.input_tokens || 0,
        completion_tokens: raw.usage.output_tokens || 0,
        total_tokens: (raw.usage.input_tokens || 0) + (raw.usage.output_tokens || 0),
      } : undefined,
    };
  }

  getEndpoint(provider: ProviderKey, _stream: boolean): string {
    return `${provider.baseUrl}/messages`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Google Gemini
// ═══════════════════════════════════════════════════════════════
export class GeminiAdapter implements ProviderAdapter {
  name = 'gemini';

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    const contents = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || '' }],
      }));

    const systemInstruction = req.messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n');

    return {
      contents,
      ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } }),
      generationConfig: {
        temperature: req.temperature,
        maxOutputTokens: req.max_tokens,
      },
    };
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return { 'Content-Type': 'application/json' };
  }

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const modelName = raw.modelVersion || 'gemini';
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelName,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      }],
      usage: raw.usageMetadata ? {
        prompt_tokens: raw.usageMetadata.promptTokenCount || 0,
        completion_tokens: raw.usageMetadata.candidatesTokenCount || 0,
        total_tokens: raw.usageMetadata.totalTokenCount || 0,
      } : undefined,
    };
  }

  getEndpoint(provider: ProviderKey, stream: boolean): string {
    const model = provider.models[0];
    const action = stream ? 'streamGenerateContent' : 'generateContent';
    return `${provider.baseUrl}/models/${model}:${action}?key=${provider.apiKey}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Mistral AI
// ═══════════════════════════════════════════════════════════════
export class MistralAdapter implements ProviderAdapter {
  name = 'mistral';

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    return req;
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    };
  }

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    return raw as ChatCompletionResponse;
  }

  getEndpoint(provider: ProviderKey, _stream: boolean): string {
    return `${provider.baseUrl}/chat/completions`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Cohere
// ═══════════════════════════════════════════════════════════════
export class CohereAdapter implements ProviderAdapter {
  name = 'cohere';

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    const systemMsg = req.messages.find(m => m.role === 'system');
    const chatHistory = req.messages
      .filter(m => m.role !== 'system')
      .slice(0, -1)
      .map(m => ({
        role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: m.content || '',
      }));

    const lastMsg = req.messages[req.messages.length - 1];

    return {
      model: req.model,
      message: lastMsg?.content || '',
      chat_history: chatHistory,
      preamble: systemMsg?.content || undefined,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      stream: req.stream,
    };
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    };
  }

  parseResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.models[0],
      choices: [{
        index: 0,
        message: { role: 'assistant', content: raw.text || raw.message || '' },
        finish_reason: raw.finish_reason || 'stop',
      }],
      usage: raw.meta?.tokens ? {
        prompt_tokens: raw.meta.tokens.input_tokens || 0,
        completion_tokens: raw.meta.tokens.output_tokens || 0,
        total_tokens: (raw.meta.tokens.input_tokens || 0) + (raw.meta.tokens.output_tokens || 0),
      } : undefined,
    };
  }

  getEndpoint(provider: ProviderKey, _stream: boolean): string {
    return `${provider.baseUrl}/chat`;
  }
}

// ═══════════════════════════════════════════════════════════════
// xAI (Grok)
// ═══════════════════════════════════════════════════════════════
export class XAIAdapter extends OpenAIAdapter {
  name = 'xai';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// DeepSeek
// ═══════════════════════════════════════════════════════════════
export class DeepSeekAdapter extends OpenAIAdapter {
  name = 'deepseek';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// Together AI
// ═══════════════════════════════════════════════════════════════
export class TogetherAdapter extends OpenAIAdapter {
  name = 'together';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// Fireworks AI
// ═══════════════════════════════════════════════════════════════
export class FireworksAdapter extends OpenAIAdapter {
  name = 'fireworks';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// Replicate
// ═══════════════════════════════════════════════════════════════
export class ReplicateAdapter implements ProviderAdapter {
  name = 'replicate';

  buildRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    const systemMsg = req.messages.find(m => m.role === 'system');
    const prompt = req.messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n') + '\nAssistant:';

    return {
      input: {
        prompt,
        system_prompt: systemMsg?.content || undefined,
        temperature: req.temperature || 0.7,
        max_tokens: req.max_tokens || 1024,
      },
    };
  }

  buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${provider.apiKey}`,
    };
  }

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    const text = Array.isArray(raw.output) ? raw.output.join('') : (raw.output || '');
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: raw.model || 'replicate',
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      }],
    };
  }

  getEndpoint(provider: ProviderKey, _stream: boolean): string {
    const model = provider.models[0];
    return `https://api.replicate.com/v1/models/${model}/predictions`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Ollama (Local)
// ═══════════════════════════════════════════════════════════════
export class OllamaAdapter extends OpenAIAdapter {
  name = 'ollama';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// LM Studio (Local)
// ═══════════════════════════════════════════════════════════════
export class LMStudioAdapter extends OpenAIAdapter {
  name = 'lmstudio';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// vLLM (Local)
// ═══════════════════════════════════════════════════════════════
export class VLLMAdapter extends OpenAIAdapter {
  name = 'vllm';
  constructor() {
    super();
  }
}

// ═══════════════════════════════════════════════════════════════
// Adapter Factory
// ═══════════════════════════════════════════════════════════════
const ADAPTER_MAP: Record<string, () => ProviderAdapter> = {
  'openai': () => new OpenAIAdapter(),
  'openrouter': () => new OpenRouterAdapter(),
  'anthropic': () => new AnthropicAdapter(),
  'gemini': () => new GeminiAdapter(),
  'mistral': () => new MistralAdapter(),
  'cohere': () => new CohereAdapter(),
  'xai': () => new XAIAdapter(),
  'deepseek': () => new DeepSeekAdapter(),
  'together': () => new TogetherAdapter(),
  'fireworks': () => new FireworksAdapter(),
  'replicate': () => new ReplicateAdapter(),
  'ollama': () => new OllamaAdapter(),
  'lmstudio': () => new LMStudioAdapter(),
  'vllm': () => new VLLMAdapter(),
};

export function getAdapter(provider: ProviderKey): ProviderAdapter {
  // Check if provider has explicit adapter type
  const adapterType = (provider as any).adapter;
  if (adapterType && ADAPTER_MAP[adapterType]) {
    return ADAPTER_MAP[adapterType]();
  }

  // Auto-detect from URL
  const url = provider.baseUrl.toLowerCase();
  if (url.includes('anthropic')) return new AnthropicAdapter();
  if (url.includes('googleapis') || url.includes('aiplatform')) return new GeminiAdapter();
  if (url.includes('mistral')) return new MistralAdapter();
  if (url.includes('cohere')) return new CohereAdapter();
  if (url.includes('x.ai')) return new XAIAdapter();
  if (url.includes('deepseek')) return new DeepSeekAdapter();
  if (url.includes('together')) return new TogetherAdapter();
  if (url.includes('fireworks')) return new FireworksAdapter();
  if (url.includes('replicate')) return new ReplicateAdapter();
  if (url.includes('openrouter')) return new OpenRouterAdapter();
  if (url.includes('localhost') || url.includes('127.0.0.1')) return new OllamaAdapter();

  return new OpenAIAdapter(); // Default
}
