// 8Router — OpenAI Full Adapter
import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../../types.js';
import { FullProviderAdapter } from '../provider-adapter.js';

export class OpenAIFullAdapter implements FullProviderAdapter {
  id = 'openai';
  name = 'OpenAI';

  protected buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    };
  }

  normalizeRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
    return req;
  }

  normalizeResponse(raw: any, _provider: ProviderKey): ChatCompletionResponse {
    return raw as ChatCompletionResponse;
  }

  normalizeError(err: any, _provider: ProviderKey): { message: string; code: string; status: number } {
    const status = err.status || err.statusCode || 500;
    const code = err.code || err.error?.code || 'unknown_error';
    const message = err.message || err.error?.message || JSON.stringify(err);
    return { message, code, status };
  }

  async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const url = `${baseUrl}/v1/models`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.data || []).map((m: any) => m.id);
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
    const raw = await res.json();
    return this.normalizeResponse(raw, provider);
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
            try {
              onData(JSON.parse(data));
            } catch {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(input: string | string[], model: string, provider: ProviderKey): Promise<{embedding: number[], tokens: number}[]> {
    const url = `${provider.baseUrl}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(provider),
      body: JSON.stringify({ input, model }),
    });
    if (!res.ok) throw new Error(`Embeddings failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.data || []).map((d: any) => ({
      embedding: d.embedding,
      tokens: data.usage?.total_tokens || 0,
    }));
  }

  async healthCheck(apiKey: string, baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      if (!res.ok) return { healthy: false, latencyMs, error: `HTTP ${res.status}` };
      return { healthy: true, latencyMs };
    } catch (err: any) {
      return { healthy: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}
