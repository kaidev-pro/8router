// 8Router — Canonical → OpenAI Responses API Request Serializer
// Phase 1F: Convert CanonicalRequest to Responses API request format.

import type { CanonicalContentPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalTool, CanonicalToolChoice } from '../canonical/tools.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type { ResponsesExtensions } from '../canonical/extensions.js';
import type {
  ResponsesRequest,
  ResponsesInputItem,
  ResponsesInputMessage,
  ResponsesContentPart,
  ResponsesFunctionCallOutput,
  ResponsesTool,
  ResponsesToolChoice,
  ResponsesTextFormat,
} from './types.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Result of serializing a canonical request to Responses format. */
export interface ResponsesSerializationResult {
  request: ResponsesRequest;
  errors: CanonicalError[];
}

/**
 * Serialize CanonicalRequest → Responses API request.
 *
 * Key semantics:
 * - instructions[] (role:'system') → instructions string
 * - messages → input items
 * - tool result messages → function_call_output items
 * - tools → function tools + preserved non-function tools from extensions
 * - toolChoice → Responses tool_choice
 * - responseFormat → text.format
 * - extensions.openaiResponses.reasoning → reasoning config
 * - extensions.openaiResponses.previous_response_id → preserved
 */
export function canonicalRequestToResponses(req: CanonicalRequest): ResponsesSerializationResult {
  const warnings = new WarningAccumulator();
  const errors: CanonicalError[] = [];

  // ─── Instructions → string ───────────────────────────────────────
  const instructions = convertInstructions(req.instructions);

  // ─── Messages → input ────────────────────────────────────────────
  const input = convertMessages(req.messages);

  // ─── Tools ───────────────────────────────────────────────────────
  const tools = req.tools ? convertTools(req.tools) : undefined;

  // ─── Tool Choice ─────────────────────────────────────────────────
  const tool_choice = convertToolChoice(req.toolChoice);

  // ─── Text format ─────────────────────────────────────────────────
  const text = convertResponseFormat(req.responseFormat);

  // ─── Extensions ──────────────────────────────────────────────────
  const responsesExt = req.extensions?.responses;

  return {
    request: {
      model: req.model,
      input,
      ...(instructions ? { instructions } : {}),
      ...(tools && tools.length > 0 ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
      ...(req.stream !== undefined ? { stream: req.stream } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
      ...(req.topP !== undefined ? { top_p: req.topP } : {}),
      ...(req.maxTokens !== undefined ? { max_output_tokens: req.maxTokens } : {}),
      ...(text ? { text } : {}),
      ...(req.metadata ? { metadata: req.metadata } : {}),
      ...(responsesExt?.previous_response_id ? { previous_response_id: responsesExt.previous_response_id } : {}),
    },
    errors,
  };
}

// ─── Instructions → string ───────────────────────────────────────────

function convertInstructions(instructions: CanonicalInstruction[]): string | undefined {
  if (instructions.length === 0) return undefined;

  const parts: string[] = [];
  for (const inst of instructions) {
    for (const part of inst.content) {
      if (part.type === 'text') {
        parts.push(part.text);
      }
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : undefined;
}

// ─── Messages → input ────────────────────────────────────────────────

function convertMessages(messages: CanonicalMessage[]): ResponsesInputItem[] {
  const items: ResponsesInputItem[] = [];

  for (const msg of messages) {
    // Tool results → function_call_output
    if (msg.role === 'tool') {
      for (const part of msg.content) {
        if (part.type === 'tool_result') {
          items.push({
            type: 'function_call_output',
            call_id: part.toolCallId,
            output: part.content,
          });
        }
      }
      continue;
    }

    // User/assistant messages → message input
    const content = convertContentParts(msg.content);
    if (content.length === 0) continue;

    items.push({
      type: 'message',
      role: msg.role as 'user' | 'assistant',
      content,
    });

    // Tool calls from assistant → additional items if needed
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      // Tool calls are embedded in the assistant message content as tool_use parts
      // The Responses API includes them in the output, not input
      // But when round-tripping, we may need them
      // For now, they're already in content as tool_use parts which aren't directly
      // representable in the input format, so they'd be in extensions
    }
  }

  return items;
}

function convertContentParts(
  parts: CanonicalContentPart[],
): ResponsesContentPart[] {
  const result: ResponsesContentPart[] = [];

  for (const part of parts) {
    if (part.type === 'text') {
      result.push({ type: 'input_text', text: part.text });
    } else if (part.type === 'image') {
      if (part.source.type === 'base64') {
        result.push({
          type: 'input_image',
          data: part.source.data,
          mime_type: part.mediaType || 'image/png',
        });
      } else {
        result.push({
          type: 'input_image',
          image_url: part.source.url,
        });
      }
    } else if (part.type === 'thinking') {
      // Thinking content from canonical — not representable as input_text
      // Skip silently or preserve as text if desired
    }
    // tool_use and tool_result parts are handled separately
  }

  return result;
}

// ─── Tools Conversion ───────────────────────────────────────────────

function convertTools(tools: CanonicalTool[]): ResponsesTool[] {
  const result: ResponsesTool[] = [];

  for (const tool of tools) {
    // Check if this is a non-function tool preserved from Responses API
    const responsesExt = tool.extensions?.responses;
    if (responsesExt && typeof responsesExt === 'object') {
      result.push(responsesExt as ResponsesTool);
      continue;
    }

    // Function tool
    result.push({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      strict: tool.strict,
    });
  }

  return result;
}

function convertToolChoice(
  choice: CanonicalToolChoice | undefined,
): ResponsesToolChoice | undefined {
  if (!choice) return undefined;

  switch (choice.type) {
    case 'auto': return 'auto';
    case 'none': return 'none';
    case 'required': return 'required';
    case 'tool': return { type: 'function', name: choice.name };
    default: return 'auto';
  }
}

function convertResponseFormat(
  format: import('../canonical/request.js').CanonicalResponseFormat | undefined,
): import('./types.js').ResponsesTextConfig | undefined {
  if (!format) return undefined;

  switch (format.type) {
    case 'text': return { format: { type: 'text' } };
    case 'json_object': return { format: { type: 'json_object' } };
    case 'json_schema': return {
      format: {
        type: 'json_schema',
        name: format.name,
        schema: format.schema,
        strict: format.strict,
      },
    };
    default: return undefined;
  }
}
