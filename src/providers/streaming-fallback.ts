import { ChatCompletionResponse } from '../types.js';

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
