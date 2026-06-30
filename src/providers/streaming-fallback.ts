import { ChatCompletionRequest, ChatCompletionResponse, ProviderKey } from '../types.js';
import { FullProviderAdapter } from './provider-adapter.js';

interface StreamingFallbackOptions {
  maxRetries: number;
  retryDelayMs: number;
  collectPartial: boolean;
}

export class StreamingFallbackHandler {
  private options: StreamingFallbackOptions;
  private partialChunks: string[] = [];
  private retryCount = 0;

  constructor(options: Partial<StreamingFallbackOptions> = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 2,
      retryDelayMs: options.retryDelayMs ?? 1000,
      collectPartial: options.collectPartial ?? true,
    };
  }

  async handleStreamingError(
    error: Error,
    originalRequest: any,
    retryFn: () => Promise<Response>,
  ): Promise<{ shouldRetry: boolean; partialContent?: string }> {
    if (this.retryCount >= this.options.maxRetries) {
      return {
        shouldRetry: false,
        partialContent: this.options.collectPartial ? this.partialChunks.join('') : undefined,
      };
    }

    this.retryCount++;
    await new Promise(r => setTimeout(r, this.options.retryDelayMs * this.retryCount));
    return { shouldRetry: true };
  }

  addChunk(chunk: string): void {
    if (this.options.collectPartial) {
      this.partialChunks.push(chunk);
    }
  }

  getPartialContent(): string {
    return this.partialChunks.join('');
  }

  getRetryCount(): number {
    return this.retryCount;
  }

  reset(): void {
    this.partialChunks = [];
    this.retryCount = 0;
  }
}

export function createSSEStream(response: Response): ReadableStream {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  return new ReadableStream({
    async start(controller) {
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                controller.enqueue(parsed);
              } catch {}
            }
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        reader.releaseLock();
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// Adapter-integrated streaming with provider fallback
// ═══════════════════════════════════════════════════════════════

interface FallbackStreamResult {
  provider: ProviderKey;
  fallbackPath: string[];
  chunks: any[];
}

/**
 * Stream with automatic provider fallback.
 * - Tries first provider; if error BEFORE first token, falls back to next.
 * - If error AFTER stream started, sends error chunk instead of corrupting.
 * - Returns metadata with _8router info.
 */
export async function streamWithFallback(
  req: ChatCompletionRequest,
  providers: ProviderKey[],
  adapters: FullProviderAdapter[],
  onData: (chunk: any) => void,
  onError?: (err: any, provider: ProviderKey) => void,
): Promise<FallbackStreamResult> {
  const fallbackPath: string[] = [];
  const allChunks: any[] = [];

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const adapter = adapters[i];
    let streamStarted = false;
    let chunkCount = 0;

    try {
      fallbackPath.push(provider.id);
      console.log(`[8Router] Attempting stream via ${provider.id} (${provider.name})`);

      await adapter.streamChatCompletion(req, provider, (chunk: any) => {
        streamStarted = true;
        chunkCount++;
        allChunks.push(chunk);
        onData(chunk);
      });

      // Stream completed successfully
      console.log(`[8Router] Stream completed via ${provider.id} (${chunkCount} chunks)`);
      return {
        provider,
        fallbackPath,
        chunks: allChunks,
      };
    } catch (err: any) {
      if (!streamStarted) {
        // Error BEFORE first token — safe to fallback
        console.warn(`[8Router] Pre-stream error on ${provider.id}: ${err.message || err}. Trying next provider.`);
        onError?.(err, provider);
        continue;
      } else {
        // Error AFTER stream started — don't corrupt, send error chunk
        console.error(`[8Router] Mid-stream error on ${provider.id}: ${err.message || err}`);
        const errorChunk = {
          id: `chatcmpl-error-${Date.now()}`,
          object: 'chat.completion.chunk',
          choices: [{
            index: 0,
            delta: { content: `\n\n[8Router Error: Stream interrupted on ${provider.id} — ${err.message || 'unknown'}]` },
            finish_reason: 'error',
          }],
          _8router: {
            error: true,
            provider: provider.id,
            fallbackPath,
            message: err.message || 'Stream interrupted',
          },
        };
        allChunks.push(errorChunk);
        onData(errorChunk);
        return { provider, fallbackPath, chunks: allChunks };
      }
    }
  }

  // All providers exhausted before any stream started
  const errorMsg = `[8Router] All providers exhausted. Tried: ${fallbackPath.join(', ')}`;
  console.error(errorMsg);
  const errorChunk = {
    id: `chatcmpl-error-${Date.now()}`,
    object: 'chat.completion.chunk',
    choices: [{
      index: 0,
      delta: { content: `\n\n[8Router Error: ${errorMsg}]` },
      finish_reason: 'error',
    }],
    _8router: {
      error: true,
      fallbackPath,
      message: errorMsg,
    },
  };
  onData(errorChunk);
  return {
    provider: providers[providers.length - 1],
    fallbackPath,
    chunks: [errorChunk],
  };
}
