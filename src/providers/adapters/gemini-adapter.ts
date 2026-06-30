// 8Router — Google Gemini Full Adapter
import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../../types.js';
import { FullProviderAdapter } from '../provider-adapter.js';

export class GeminiFullAdapter implements FullProviderAdapter {
  id = 'google';
  name = 'Google Gemini';

  normalizeRequest(req: ChatCompletionRequest, _provider: ProviderKey): any {
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

  normalizeResponse(raw: any, provider: ProviderKey): ChatCompletionResponse {
    const text = raw.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: provider.models[0],
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: raw.candidates?.[0]?.finishReason || 'stop',
      }],
      usage: raw.usageMetadata ? {
        prompt_tokens: raw.usageMetadata.promptTokenCount || 0,
        completion_tokens: raw.usageMetadata.candidatesTokenCount || 0,
        total_tokens: raw.usageMetadata.totalTokenCount || 0,
      } : undefined,
    };
  }

  normalizeError(err: any, _provider: ProviderKey): { message: string; code: string; status: number } {
    const status = err.status || err.statusCode || 500;
    const message = err.error?.message || err.message || JSON.stringify(err);
    const code = err.error?.code || err.code || 'api_error';
    return { message, code, status };
  }

  async listModels(apiKey: string, baseUrl: string): Promise<string[]> {
    const url = `${baseUrl}/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`listModels failed: ${res.status}`);
    const data = await res.json() as any;
    return (data.models || []).map((m: any) => m.name?.replace('models/', '') || m.name);
  }

  async chatCompletion(req: ChatCompletionRequest, provider: ProviderKey): Promise<ChatCompletionResponse> {
    const model = req.model || provider.models[0];
    const url = `${provider.baseUrl}/v1beta/models/${model}:generateContent?key=${provider.apiKey}`;
    const body = this.normalizeRequest(req, provider);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const model = req.model || provider.models[0];
    const url = `${provider.baseUrl}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${provider.apiKey}`;
    const body = this.normalizeRequest(req, provider);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                onData({
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  choices: [{
                    index: 0,
                    delta: { content: text },
                    finish_reason: null,
                  }],
                });
              }
            } catch {}
          }
        }
      }
      // Send final chunk
      onData({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      });
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(input: string | string[], model: string, provider: ProviderKey): Promise<{embedding: number[], tokens: number}[]> {
    const inputs = Array.isArray(input) ? input : [input];
    const results: {embedding: number[], tokens: number}[] = [];

    for (const text of inputs) {
      const url = `${provider.baseUrl}/v1beta/models/${model}:embedContent?key=${provider.apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      });
      if (!res.ok) throw new Error(`Embeddings failed: ${res.status}`);
      const data = await res.json() as any;
      results.push({
        embedding: data.embedding?.values || [],
        tokens: data.usageMetadata?.totalTokens || 0,
      });
    }
    return results;
  }

  async healthCheck(_apiKey: string, baseUrl: string): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/v1beta/models`, {
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
