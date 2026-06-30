// 8Router — Anthropic Full Adapter
import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../../types.js';
import { FullProviderAdapter } from '../provider-adapter.js';

export class AnthropicFullAdapter implements FullProviderAdapter {
  id = 'anthropic';
  name = 'Anthropic';

  private buildHeaders(provider: ProviderKey): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': provider.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  normalizeRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
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

  normalizeResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
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

  normalizeError(err: any, _provider: ProviderKey): { message: string; code: string; status: number } {
    const status = err.status || err.statusCode || 500;
    const code = err.error?.type || err.code || 'api_error';
    const message = err.error?.message || err.message || JSON.stringify(err);
    return { message, code, status };
  }

  async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const url = `${baseUrl}/v1/models`;
    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.data || []).map((m: any) => m.id);
  }

  async chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse> {
    const url = `${provider.baseUrl}/messages`;
    const body = this.normalizeRequest(req, provider);
    delete body.stream;
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(provider),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      let parsed: any;
      try { parsed = JSON.parse(errBody); } catch { parsed = { message: errBody }; }
      throw { status: res.status, message: parsed.error?.message || parsed.message, code: parsed.error?.type || 'api_error' };
    }
    const raw = await res.json();
    return this.normalizeResponse(raw, provider);
  }

  async streamChatCompletion(req: ChatCompletionRequest, provider: ProviderKey, onData: (chunk: any) => void): Promise<void> {
    const url = `${provider.baseUrl}/messages`;
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
      throw { status: res.status, message: parsed.error?.message || parsed.message, code: parsed.error?.type || 'api_error' };
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
            try {
              const parsed = JSON.parse(data);
              // Convert Anthropic SSE to OpenAI-like delta chunks
              if (parsed.type === 'content_block_delta') {
                onData({
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  choices: [{
                    index: 0,
                    delta: { content: parsed.delta?.text || '' },
                    finish_reason: null,
                  }],
                });
              } else if (parsed.type === 'message_stop') {
                onData({
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
                });
              }
            } catch {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async healthCheck(apiKey: string, baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/v1/models`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
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
