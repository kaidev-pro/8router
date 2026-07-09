// 8Router — Anthropic Messages → Canonical Request Converter
// Phase 1C: Convert Anthropic Messages API request to CanonicalRequest.
// No runtime production path is modified by this function.

import { createHash } from 'node:crypto';
import type { CanonicalContentPart, CanonicalToolResultPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type { CanonicalCapability } from '../canonical/capabilities.js';
import type { AnthropicRequest, AnthropicMessage, AnthropicContentBlock, AnthropicTextBlock } from './types.js';
import { anthropicContentToCanonical, anthropicBlockToCanonical } from './content.js';
import { anthropicToolsToCanonical, anthropicToolChoiceToCanonical } from './tools.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Conversion result with request + errors */
export interface AnthropicConversionResult {
  request: CanonicalRequest;
  errors: CanonicalError[];
}

/**
 * Convert Anthropic Messages API request → CanonicalRequest.
 *
 * Key semantics:
 * - `system` field → CanonicalInstruction[] (string or block array)
 * - tool_result blocks in user messages → elevated to role:'tool' CanonicalMessage
 * - tool_use blocks in assistant messages → extracted to CanonicalToolCall[] + content parts
 * - `top_k` → extensions.anthropic.top_k
 * - `metadata` → extensions.anthropic.metadata
 */
export function anthropicRequestToCanonical(req: AnthropicRequest): AnthropicConversionResult {
  const warnings = new WarningAccumulator();
  const errors: CanonicalError[] = [];

  // Validate required fields
  if (!req.model || typeof req.model !== 'string') {
    errors.push({
      code: 'missing_model',
      message: 'Request is missing required field: model',
      fieldPath: 'model',
      retryable: false,
      sanitized: true,
    });
  }

  if (!req.messages || !Array.isArray(req.messages)) {
    errors.push({
      code: 'missing_messages',
      message: 'Request is missing required field: messages',
      fieldPath: 'messages',
      retryable: false,
      sanitized: true,
    });
  }

  if (req.max_tokens === undefined || req.max_tokens === null) {
    errors.push({
      code: 'missing_max_tokens',
      message: 'Anthropic request is missing required field: max_tokens',
      fieldPath: 'max_tokens',
      retryable: false,
      sanitized: true,
    });
  }

  if (errors.length > 0) {
    return {
      request: {
        model: req.model || '',
        instructions: [],
        messages: [],
      },
      errors,
    };
  }

  // Process system → instructions
  const instructions: CanonicalInstruction[] = [];
  if (req.system !== undefined) {
    if (typeof req.system === 'string') {
      instructions.push({
        role: 'system',
        content: [{ type: 'text', text: req.system }],
        position: 0,
      });
    } else if (Array.isArray(req.system)) {
      for (let i = 0; i < req.system.length; i++) {
        const block = req.system[i];
        const content: CanonicalContentPart[] = [{ type: 'text', text: block.text }];
        const instruction: CanonicalInstruction = {
          role: 'system',
          content,
          position: i,
        };
        if (block.cache_control?.type === 'ephemeral') {
          instruction.cacheControl = 'ephemeral';
        }
        instructions.push(instruction);
      }
    }
  }

  // Process messages — extract tool results to separate role:'tool' messages
  const messages: CanonicalMessage[] = [];
  let positionCounter = instructions.length;

  for (let i = 0; i < req.messages.length; i++) {
    const msg = req.messages[i];

    if (msg.role === 'assistant') {
      const content = typeof msg.content === 'string'
        ? [{ type: 'text' as const, text: msg.content }]
        : (Array.isArray(msg.content) ? msg.content : [msg.content]).map(anthropicBlockToCanonical);

      // Extract tool_use blocks from assistant content to toolCalls
      const toolUseBlocks = (typeof msg.content === 'string' ? [] : msg.content)
        .filter((b): b is import('./types.js').AnthropicToolUseBlock => b.type === 'tool_use');

      const canonicalMsg: CanonicalMessage = {
        role: 'assistant',
        content,
        position: positionCounter++,
      };

      if (toolUseBlocks.length > 0) {
        canonicalMsg.toolCalls = toolUseBlocks.map(tc => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.input,
        }));
      }

      messages.push(canonicalMsg);
    } else if (msg.role === 'user') {
      if (typeof msg.content === 'string') {
        messages.push({
          role: 'user',
          content: [{ type: 'text', text: msg.content }],
          position: positionCounter++,
        });
      } else {
        // Check for tool_result blocks — these become role:'tool' messages
        const toolResultBlocks = msg.content.filter(
          (b): b is import('./types.js').AnthropicToolResultBlock => b.type === 'tool_result'
        );
        const nonToolBlocks = msg.content.filter(b => b.type !== 'tool_result');

        // Emit non-tool content as user message
        if (nonToolBlocks.length > 0) {
          const content = nonToolBlocks.map(anthropicBlockToCanonical);
          // Check for thinking parts in non-tool blocks
          for (const part of content) {
            if (part.type === 'thinking') {
              warnings.capabilityWarning(
                `Thinking part at messages[${i}].content[thinking] preserved in canonical form`
              );
            }
          }
          messages.push({
            role: 'user',
            content,
            position: positionCounter++,
          });
        }

        // Emit tool_result blocks as role:'tool' messages
        for (const tr of toolResultBlocks) {
          const toolResult: CanonicalToolResultPart = {
            type: 'tool_result',
            toolCallId: tr.tool_use_id,
            content: typeof tr.content === 'string'
              ? tr.content
              : Array.isArray(tr.content)
                ? (tr.content as AnthropicTextBlock[])
                    .filter((p): p is AnthropicTextBlock => p.type === 'text')
                    .map(p => p.text)
                    .join('')
                : '',
            isError: tr.is_error,
          };
          messages.push({
            role: 'tool',
            content: [toolResult],
            position: positionCounter++,
          });
        }
      }
    }
  }

  // Extract extensions
  const extensions: CanonicalRequest['extensions'] = {};
  const anthropicExt: Record<string, unknown> = {};
  if (req.top_k !== undefined) anthropicExt.top_k = req.top_k;
  if (req.metadata !== undefined) {
    const meta = req.metadata as Record<string, unknown>;
    if (meta.user_id !== undefined) {
      anthropicExt.metadata = { user_id: String(meta.user_id) };
    }
  }
  if (Object.keys(anthropicExt).length > 0) {
    extensions.anthropic = anthropicExt;
  }

  // Detect capabilities
  const requiredCapabilities: CanonicalCapability[] = ['chat'];
  if (req.stream) requiredCapabilities.push('streaming');
  if (req.tools && req.tools.length > 0) requiredCapabilities.push('tools');

  // Build fingerprint
  const fingerprintInput = JSON.stringify({
    model: req.model,
    messages: req.messages,
    tools: req.tools,
    system: req.system,
    max_tokens: req.max_tokens,
    temperature: req.temperature,
  });
  const fingerprint = createHash('sha256').update(fingerprintInput).digest('hex').slice(0, 16);

  return {
    request: {
      model: req.model,
      instructions,
      messages,
      tools: req.tools ? anthropicToolsToCanonical(req.tools) : undefined,
      toolChoice: anthropicToolChoiceToCanonical(req.tool_choice),
      stream: req.stream,
      temperature: req.temperature,
      topP: req.top_p,
      maxTokens: req.max_tokens,
      stop: req.stop_sequences,
      extensions,
      bridgeMeta: {
        sourceFormat: 'anthropic_messages',
        fingerprint,
        warnings: warnings.getWarnings(),
      },
      requiredCapabilities,
    },
    errors,
  };
}
