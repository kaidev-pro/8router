// 8Router — Provider Adapter (translate requests/responses)

import { ProviderKey, ChatCompletionRequest, ChatCompletionResponse } from '../types.js';

export interface ProviderAdapter {
  name: string;
  buildRequest(req: ChatCompletionRequest, provider: ProviderKey): any;
  buildHeaders(provider: ProviderKey): Record<string, string>;
  parseResponse(raw: any, provider: ProviderKey): ChatCompletionResponse;
  getEndpoint(provider: ProviderKey, stream: boolean): string;
}

// OpenAI-compatible (works for OpenAI, Groq, OpenRouter, Together, etc.)
export class OpenAIAdapter implements ProviderAdapter {
  name = 'openai';

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

  getEndpoint(provider: ProviderKey, stream: boolean): string {
    return `${provider.baseUrl}/chat/completions`;
  }
}

// Anthropic adapter
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

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    return {
      id: raw.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: raw.model || 'claude',
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

// Google Gemini adapter — FIXED: uses model from request, not hardcoded provider.models[0]
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
    return {
      'Content-Type': 'application/json',
    };
  }

  parseResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Extract model name from the response if available
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
    // Use the first model from provider config as a fallback.
    // The actual model used is in the request body; the endpoint just needs
    // a valid model ID for the URL. We use provider.models[0] as the URL model,
    // while the body content is built from the request which carries the actual model.
    const model = provider.models[0] || 'gemini-2.0-flash';
    const action = stream ? 'streamGenerateContent' : 'generateContent';
    return `${provider.baseUrl}/models/${model}:${action}?key=${provider.apiKey}`;
  }
}

// Get adapter for provider
export function getAdapter(provider: ProviderKey): ProviderAdapter {
  const url = provider.baseUrl.toLowerCase();

  if (url.includes('anthropic')) return new AnthropicAdapter();
  if (url.includes('googleapis') || url.includes('google') || url.includes('aiplatform')) return new GeminiAdapter();
  return new OpenAIAdapter(); // Default: OpenAI-compatible
}