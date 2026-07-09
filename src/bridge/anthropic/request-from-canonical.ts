// 8Router — Canonical → Anthropic Messages Serializer
// Phase 1C: Serialize CanonicalRequest back to Anthropic Messages format.
// No runtime production path is modified by this function.

import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalContentPart } from '../canonical/content.js';
import type { AnthropicRequest, AnthropicMessage, AnthropicContentBlock, AnthropicSystemBlock } from './types.js';
import type { BridgeWarning } from '../canonical/request.js';
import { canonicalToolsToAnthropic, canonicalToolChoiceToAnthropic } from './tools.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Serialization result with request + warnings */
export interface AnthropicSerializationResult {
  request: AnthropicRequest;
  warnings: BridgeWarning[];
}

/**
 * Serialize CanonicalRequest → Anthropic Messages request.
 *
 * Key semantics:
 * - instructions[] → system field (joined with \n\n separator)
 * - role:'tool' messages → user messages with tool_result content blocks
 * - assistant toolCalls → tool_use content blocks in assistant messages
 * - extensions.anthropic → restored
 * - maxTokenField not applicable (Anthropic always uses max_tokens)
 */
export function canonicalRequestToAnthropic(req: CanonicalRequest): AnthropicSerializationResult {
  const warnings = new WarningAccumulator();

  // Build system field from instructions
  let system: string | AnthropicSystemBlock[] | undefined;
  if (req.instructions.length > 0) {
    const systemInstructions = req.instructions.filter(i => i.role === 'system');
    if (systemInstructions.length === 1) {
      // Single system instruction — use string if no cache control
      const inst = systemInstructions[0];
      const textParts = inst.content.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
      const text = textParts.map(p => p.text).join('\n\n');
      if (inst.cacheControl === 'ephemeral') {
        system = [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
      } else {
        system = text;
      }
    } else if (systemInstructions.length > 1) {
      // Multiple system instructions — use block array with warning
      warnings.fieldTransformed(
        'instructions',
        'Multiple system instructions joined with separator for Anthropic'
      );
      system = systemInstructions.map(inst => {
        const textParts = inst.content.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
        const text = textParts.map(p => p.text).join('\n\n');
        const block: AnthropicSystemBlock = { type: 'text', text };
        if (inst.cacheControl === 'ephemeral') {
          block.cache_control = { type: 'ephemeral' };
        }
        return block;
      });
    }

    // Developer instructions — fold into system with warning
    const devInstructions = req.instructions.filter(i => i.role === 'developer');
    if (devInstructions.length > 0) {
      warnings.capabilityWarning(
        'Developer instructions folded into system field for Anthropic — semantic difference possible'
      );
      const devTexts = devInstructions.map(inst =>
        inst.content
          .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map(p => p.text)
          .join('\n\n')
      );
      const devText = devTexts.join('\n\n');

      if (typeof system === 'string') {
        system = `${system}\n\n${devText}`;
      } else if (Array.isArray(system)) {
        system.push({ type: 'text', text: devText });
      } else {
        system = devText;
      }
    }
  }

  // Build messages
  const messages: AnthropicMessage[] = [];

  // Separate tool messages and non-tool messages
  // Tool messages get merged into the preceding user message as tool_result blocks
  const orderedMsgs = [...req.messages].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  for (let i = 0; i < orderedMsgs.length; i++) {
    const msg = orderedMsgs[i];

    if (msg.role === 'tool') {
      // Find or create a user message to attach tool_result blocks
      // Anthropic requires tool_result inside a user message
      let targetUser = messages[messages.length - 1];
      if (!targetUser || targetUser.role !== 'user') {
        // Create a new user message for tool results
        targetUser = { role: 'user', content: [] };
        messages.push(targetUser);
      }

      // Add tool_result content blocks
      for (const part of msg.content) {
        if (part.type === 'tool_result') {
          const trBlock: AnthropicContentBlock = {
            type: 'tool_result',
            tool_use_id: part.toolCallId,
            content: part.content,
            is_error: part.isError,
          };
          if (typeof targetUser.content === 'string') {
            targetUser.content = [{ type: 'text', text: targetUser.content }, trBlock];
          } else {
            targetUser.content.push(trBlock);
          }
        }
      }
    } else if (msg.role === 'assistant') {
      // Reconstruct assistant content — tool_use blocks from toolCalls
      let content: string | AnthropicContentBlock[];

      const textParts = msg.content.filter(p => p.type === 'text' || p.type === 'thinking');
      const toolUseBlocks: AnthropicContentBlock[] = [];

      // Add tool_use blocks from toolCalls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        for (const tc of msg.toolCalls) {
          toolUseBlocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }
      }

      if (textParts.length === 0 && toolUseBlocks.length === 0) {
        content = '';
      } else if (textParts.length === 1 && textParts[0].type === 'text' && toolUseBlocks.length === 0) {
        content = textParts[0].text;
      } else {
        const blocks: AnthropicContentBlock[] = [];
        for (const part of textParts) {
          if (part.type === 'text') blocks.push({ type: 'text', text: part.text });
          if (part.type === 'thinking') blocks.push({ type: 'thinking', thinking: part.text });
        }
        blocks.push(...toolUseBlocks);
        content = blocks;
      }

      messages.push({ role: 'assistant', content });
    } else if (msg.role === 'user') {
      const content = serializeContentToAnthropic(msg.content);
      messages.push({ role: 'user', content: content || '' });
    }
  }

  // Build tools
  const tools = req.tools && req.tools.length > 0
    ? canonicalToolsToAnthropic(req.tools)
    : undefined;

  // Build tool_choice
  const toolChoice = canonicalToolChoiceToAnthropic(req.toolChoice);

  // Build request
  const anthropicReq: AnthropicRequest = {
    model: req.model,
    max_tokens: req.maxTokens ?? 4096, // Anthropic requires max_tokens
    messages,
  };

  if (system !== undefined) anthropicReq.system = system;
  if (tools !== undefined) anthropicReq.tools = tools;
  if (toolChoice !== undefined) anthropicReq.tool_choice = toolChoice;
  if (req.temperature !== undefined) anthropicReq.temperature = req.temperature;
  if (req.topP !== undefined) anthropicReq.top_p = req.topP;
  if (req.stop !== undefined && req.stop.length > 0) anthropicReq.stop_sequences = req.stop;
  if (req.stream !== undefined) anthropicReq.stream = req.stream;

  // Restore Anthropic extensions
  if (req.extensions?.anthropic) {
    const ext = req.extensions.anthropic;
    if (ext.top_k !== undefined) anthropicReq.top_k = ext.top_k;
    if (ext.metadata !== undefined) {
      anthropicReq.metadata = ext.metadata as Record<string, unknown>;
    }
  }

  return {
    request: anthropicReq,
    warnings: warnings.getWarnings(),
  };
}

/**
 * Serialize canonical content parts to Anthropic format.
 * Single text → string. Array → AnthropicContentBlock[].
 */
function serializeContentToAnthropic(
  parts: CanonicalContentPart[],
): string | AnthropicContentBlock[] {
  if (parts.length === 0) return '';
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;

  return parts.map(p => {
    if (p.type === 'text') return { type: 'text' as const, text: p.text };
    if (p.type === 'image') {
      if (p.source.type === 'base64') {
        return { type: 'image' as const, source: { type: 'base64' as const, media_type: p.source.mediaType, data: p.source.data } };
      }
      return { type: 'image' as const, source: { type: 'url' as const, url: p.source.url } };
    }
    if (p.type === 'tool_result') {
      return { type: 'tool_result' as const, tool_use_id: p.toolCallId, content: p.content, is_error: p.isError };
    }
    if (p.type === 'thinking') {
      return { type: 'thinking' as const, thinking: p.text };
    }
    // tool_use handled at message level
    return { type: 'text' as const, text: '' };
  });
}
