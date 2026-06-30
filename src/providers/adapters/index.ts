// 8Router — Full Adapter Factory & Additional Adapters
import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../../types.js';
import { FullProviderAdapter } from '../provider-adapter.js';
import { OpenAIFullAdapter } from './openai-adapter.js';
import { AnthropicFullAdapter } from './anthropic-adapter.js';
import { GeminiFullAdapter } from './gemini-adapter.js';

// ═══════════════════════════════════════════════════════════════
// OpenRouter Adapter (OpenAI-compatible + extra headers)
// ═══════════════════════════════════════════════════════════════
export class OpenRouterFullAdapter extends OpenAIFullAdapter {
  id = 'openrouter';
  name = 'OpenRouter';

  protected override buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      'HTTP-Referer': 'https://8router.8agents.com',
      'X-Title': '8Router',
    };
  }

  async chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse> {
    const url = `${provider.baseUrl}/chat/completions`;
    const body = this.normalizeRequest(req, provider);
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(provider),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(errBody); } catch { parsed = { message: errBody }; }
      throw { status: res.status, message: parsed.error?.message || parsed.message, code: parsed.error?.code || 'api_error' };
    }
    return this.normalizeResponse(await res.json(), provider);
  }

  async streamChatCompletion(req: ChatCompletionRequest, provider: ProviderKey, onData: (chunk: any) => void): Promise<void> {
    const url = `${provider.baseUrl}/chat/completions`;
    const body = { ...this.normalizeRequest(req, provider), stream: true };
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(provider),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(errBody); } catch { parsed = { message: errBody }; }
      throw { status: res.status, message: parsed.error?.message || parsed.message, code: parsed.error?.code || 'api_error' };
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            try { onData(JSON.parse(data)); } catch {}
          }
        }
      }
    } finally { reader.releaseLock(); }
  }
}

// ═══════════════════════════════════════════════════════════════
// Mistral Adapter (OpenAI-compatible)
// ═══════════════════════════════════════════════════════════════
export class MistralFullAdapter extends OpenAIFullAdapter {
  id = 'mistral';
  name = 'Mistral AI';
}

// ═══════════════════════════════════════════════════════════════
// Cohere Adapter
// ═══════════════════════════════════════════════════════════════
export class CohereFullAdapter implements FullProviderAdapter {
  id = 'cohere';
  name = 'Cohere';

  normalizeRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
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

  normalizeResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
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

  normalizeError(err: any, _provider: ProviderKey): { message: string; code: string; status: number } {
    return {
      message: err.message || err.error?.message || JSON.stringify(err),
      code: err.code || err.error?.code || 'api_error',
      status: err.status || 500,
    };
  }

  async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.models || data.data || []).map((m: any) => m.name || m.id);
  }

  async chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse> {
    const url = `${provider.baseUrl}/chat`;
    const body = this.normalizeRequest(req, provider);
    delete body.stream;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(errBody); } catch { parsed = { message: errBody }; }
      throw { status: res.status, message: parsed.message, code: 'api_error' };
    }
    return this.normalizeResponse(await res.json(), provider);
  }

  async streamChatCompletion(req: ChatCompletionRequest, provider: ProviderKey, onData: (chunk: any) => void): Promise<void> {
    const url = `${provider.baseUrl}/chat`;
    const body = { ...this.normalizeRequest(req, provider), stream: true };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Cohere stream failed: ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.text) {
              onData({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                choices: [{ index: 0, delta: { content: parsed.text }, finish_reason: null }],
              });
            }
            if (parsed.event_type === 'stream-end') {
              onData({
                id: `chatcmpl-${Date.now()}`,
                object: 'chat.completion.chunk',
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
              });
            }
          } catch {}
        }
      }
    } finally { reader.releaseLock(); }
  }

  async healthCheck(apiKey: string, baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return { healthy: res.ok, latencyMs: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (err: any) {
      return { healthy: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Replicate Adapter
// ═══════════════════════════════════════════════════════════════
export class ReplicateFullAdapter implements FullProviderAdapter {
  id = 'replicate';
  name = 'Replicate';

  normalizeRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
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

  normalizeResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
    const text = Array.isArray(raw.output) ? raw.output.join('') : (raw.output || '');
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.models[0],
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
    };
  }

  normalizeError(err: any, _provider: ProviderKey): { message: string; code: string; status: number } {
    return { message: err.message || JSON.stringify(err), code: err.code || 'api_error', status: err.status || 500 };
  }

  async listModels(_apiKey: string, _baseUrl: string): Promise<string[]> {
    return []; // Replicate uses model versions, not listing
  }

  async chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse> {
    const model = provider.models[0];
    const url = `https://api.replicate.com/v1/models/${model}/predictions`;
    const body = this.normalizeRequest(req, provider);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${provider.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw { status: res.status, message: `Replicate error: ${res.status}`, code: 'api_error' };
    const raw = await res.json();
    // Replicate returns a prediction; poll for completion
    let prediction = raw;
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(prediction.urls.get, {
        headers: { 'Authorization': `Token ${provider.apiKey}` },
      });
      prediction = await pollRes.json();
    }
    return this.normalizeResponse(prediction, provider);
  }

  async streamChatCompletion(req: ChatCompletionRequest, provider: ProviderKey, onData: (chunk: any) => void): Promise<void> {
    // Replicate doesn't support native streaming in the same way; do sync and chunk
    const result = await this.chatCompletion(req, provider);
    const content = result.choices[0]?.message?.content || '';
    onData({ id: result.id, object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content }, finish_reason: null }] });
    onData({ id: result.id, object: 'chat.completion.chunk', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  }

  async healthCheck(apiKey: string, _baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('https://api.replicate.com/v1/account', {
        headers: { 'Authorization': `Token ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return { healthy: res.ok, latencyMs: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
    } catch (err: any) {
      return { healthy: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Ollama Adapter (OpenAI-compatible)
// ═══════════════════════════════════════════════════════════════
export class OllamaFullAdapter extends OpenAIFullAdapter {
  id = 'ollama';
  name = 'Ollama';
}

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════
export { OpenAIFullAdapter } from './openai-adapter.js';
export { AnthropicFullAdapter } from './anthropic-adapter.js';
export { GeminiFullAdapter } from './gemini-adapter.js';

export function getFullAdapter(providerId: string): FullProviderAdapter {
  const adapters: Record<string, FullProviderAdapter> = {
    openai: new OpenAIFullAdapter(),
    anthropic: new AnthropicFullAdapter(),
    google: new GeminiFullAdapter(),
    groq: new OpenAIFullAdapter(),
    openrouter: new OpenRouterFullAdapter(),
    mistral: new MistralFullAdapter(),
    deepseek: new OpenAIFullAdapter(),
    together: new OpenAIFullAdapter(),
    fireworks: new OpenAIFullAdapter(),
    cerebras: new OpenAIFullAdapter(),
    sambanova: new OpenAIFullAdapter(),
    perplexity: new OpenAIFullAdapter(),
    ollama: new OllamaFullAdapter(),
    xai: new OpenAIFullAdapter(),
    cohere: new CohereFullAdapter(),
    replicate: new ReplicateFullAdapter(),
  };
  return adapters[providerId] || new OpenAIFullAdapter();
}
