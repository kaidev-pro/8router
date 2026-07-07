// 8Router — Canonical → OpenAI Chat Completions Serializer
// Phase 1B: Serialize canonical request back to OpenAI format.
// No runtime production path is modified by this function.

import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalContentPart, CanonicalToolUsePart } from '../canonical/content.js';
import type { OpenAIChatRequest, OpenAIChatMessage, OpenAIContentPart } from './types.js';
import { canonicalToolsToOpenai, canonicalToolChoiceToOpenai } from './tools.js';

/**
 * Serialize CanonicalRequest → OpenAI Chat Completions request.
 *
 * Ordering semantics:
 * - Merges instructions[] and messages[] by position
 * - Restores system/developer messages in their original positions
 * - Tool role messages are restored correctly
 * - Tool call arguments are JSON.stringified exactly once
 * - Text content may serialize to string when safe
 * - Multimodal content remains array
 * - Extensions restored only from allowlisted fields
 * - Warnings do NOT appear in public OpenAI body
 * - bridgeMeta is NOT serialized
 * - Does not depend on originalRequest
 */
export function canonicalRequestToOpenai(req: CanonicalRequest): OpenAIChatRequest {
  // Merge instructions and messages by position to restore original order
  const orderedMessages = mergeOrderedMessages(req.instructions, req.messages);

  // Build the OpenAI request
  const openaiReq: OpenAIChatRequest = {
    model: req.model,
    messages: orderedMessages,
  };

  // Optional fields
  if (req.stream !== undefined) openaiReq.stream = req.stream;
  if (req.temperature !== undefined) openaiReq.temperature = req.temperature;
  if (req.topP !== undefined) openaiReq.top_p = req.topP;
  if (req.maxTokens !== undefined) openaiReq.max_tokens = req.maxTokens;
  if (req.stop !== undefined) openaiReq.stop = req.stop.length === 1 ? req.stop[0] : req.stop;
  if (req.responseFormat !== undefined) {
    const fmt = req.responseFormat;
    if (fmt.type === 'json_schema' && fmt.schema) {
      openaiReq.response_format = {
        type: 'json_schema',
        json_schema: {
          name: fmt.name,
          strict: fmt.strict,
          schema: fmt.schema,
        },
      };
    } else {
      openaiReq.response_format = { type: fmt.type };
    }
  }

  // Tools
  if (req.tools && req.tools.length > 0) {
    openaiReq.tools = canonicalToolsToOpenai(req.tools);
  }

  // Tool choice
  if (req.toolChoice !== undefined) {
    openaiReq.tool_choice = canonicalToolChoiceToOpenai(req.toolChoice);
  }

  // Metadata passthrough
  if (req.metadata) {
    openaiReq.metadata = req.metadata;
  }

  // Restore provider-specific extensions
  if (req.extensions?.openai) {
    const ext = req.extensions.openai;
    if (ext.frequency_penalty !== undefined) openaiReq.frequency_penalty = ext.frequency_penalty;
    if (ext.presence_penalty !== undefined) openaiReq.presence_penalty = ext.presence_penalty;
    if (ext.seed !== undefined) openaiReq.seed = ext.seed;
    if (ext.user !== undefined) openaiReq.user = ext.user;
    if (ext.parallel_tool_calls !== undefined) openaiReq.parallel_tool_calls = ext.parallel_tool_calls;

    // Restore other allowlisted fields
    const knownOpenaiKeys = new Set(['frequency_penalty', 'presence_penalty', 'seed', 'user', 'parallel_tool_calls']);
    const extRecord = ext as Record<string, unknown>;
    for (const key of Object.keys(ext)) {
      if (!knownOpenaiKeys.has(key)) {
        (openaiReq as Record<string, unknown>)[key] = extRecord[key];
      }
    }
  }

  return openaiReq;
}

/**
 * Merge instructions and messages by position to restore original order.
 * Instructions get system/developer role, messages keep their role.
 */
function mergeOrderedMessages(
  instructions: CanonicalInstruction[],
  messages: CanonicalMessage[],
): OpenAIChatMessage[] {
  // Build position-indexed items
  const items: { position: number; kind: 'instruction' | 'message'; index: number }[] = [];

  for (let i = 0; i < instructions.length; i++) {
    items.push({ position: instructions[i].position ?? i, kind: 'instruction', index: i });
  }
  for (let i = 0; i < messages.length; i++) {
    items.push({ position: messages[i].position ?? (instructions.length + i), kind: 'message', index: i });
  }

  // Sort by position (stable)
  items.sort((a, b) => a.position - b.position);

  // Build OpenAI messages
  return items.map(item => {
    if (item.kind === 'instruction') {
      return instructionToOpenai(instructions[item.index]);
    }
    return messageToOpenai(messages[item.index]);
  });
}

/**
 * Convert CanonicalInstruction → OpenAI message with system/developer role.
 */
function instructionToOpenai(inst: CanonicalInstruction): OpenAIChatMessage {
  return {
    role: inst.role,
    content: serializeContent(inst.content),
  };
}

/**
 * Convert CanonicalMessage → OpenAI message.
 */
function messageToOpenai(msg: CanonicalMessage): OpenAIChatMessage {
  const result: OpenAIChatMessage = {
    role: msg.role as 'user' | 'assistant' | 'tool',
    content: serializeContent(msg.content, msg.role),
  };

  if (msg.name) result.name = msg.name;

  // Restore tool calls from assistant message
  if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
    result.tool_calls = msg.toolCalls.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        // JSON.stringify exactly once — arguments is already a parsed object
        arguments: JSON.stringify(tc.arguments),
      },
    }));
  }

  // Restore tool_call_id from tool result
  if (msg.role === 'tool') {
    const toolResult = msg.content.find((p): p is import('../canonical/content.js').CanonicalToolResultPart =>
      p.type === 'tool_result'
    );
    if (toolResult) {
      result.tool_call_id = toolResult.toolCallId;
      result.content = toolResult.content;
    }
  }

  return result;
}

/**
 * Serialize canonical content parts to OpenAI format.
 * Single text → string, array → OpenAIContentPart[].
 */
function serializeContent(
  parts: CanonicalContentPart[],
  role?: string,
): string | OpenAIContentPart[] | null {
  if (parts.length === 0) return null;

  // For tool messages, extract tool_result content as string
  if (role === 'tool') {
    const toolResult = parts.find(p => p.type === 'tool_result');
    if (toolResult && toolResult.type === 'tool_result') {
      return toolResult.content;
    }
  }

  // For assistant messages, skip tool_use and thinking parts in content
  if (role === 'assistant') {
    const nonToolParts = parts.filter(p => p.type === 'text' || p.type === 'image');
    if (nonToolParts.length === 0) return null;
    if (nonToolParts.length === 1 && nonToolParts[0].type === 'text') {
      return nonToolParts[0].text;
    }
    return nonToolParts.map(p => {
      if (p.type === 'text') return { type: 'text' as const, text: p.text };
      if (p.type === 'image') {
        if (p.source.type === 'url') {
          return { type: 'image_url' as const, image_url: { url: p.source.url, detail: p.detail } };
        }
        return { type: 'image_url' as const, image_url: { url: `data:${p.source.mediaType};base64,${p.source.data}`, detail: p.detail } };
      }
      return { type: 'text' as const, text: '' };
    });
  }

  // Default: single text → string, otherwise array
  if (parts.length === 1 && parts[0].type === 'text') {
    return parts[0].text;
  }

  return parts.map(p => {
    if (p.type === 'text') return { type: 'text' as const, text: p.text };
    if (p.type === 'image') {
      if (p.source.type === 'url') {
        return { type: 'image_url' as const, image_url: { url: p.source.url, detail: p.detail } };
      }
      return { type: 'image_url' as const, image_url: { url: `data:${p.source.mediaType};base64,${p.source.data}`, detail: p.detail } };
    }
    // tool_use and thinking are not serialized to OpenAI format
    return { type: 'text' as const, text: '' };
  });
}
