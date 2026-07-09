// 8Router — OpenAI Responses API Request → Canonical
// Phase 1F: Convert Responses API request to CanonicalRequest.

import { randomUUID } from 'node:crypto';
import type { CanonicalContentPart, CanonicalToolUsePart, CanonicalToolResultPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalTool, CanonicalToolChoice } from '../canonical/tools.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type { CanonicalCapability } from '../canonical/capabilities.js';
import type { CanonicalExtensions, ResponsesExtensions } from '../canonical/extensions.js';
import type {
  ResponsesRequest,
  ResponsesInputItem,
  ResponsesInputMessage,
  ResponsesFunctionCallOutput,
  ResponsesContentPart,
  ResponsesTool,
  ResponsesToolChoice,
  ResponsesReasoningConfig,
  ResponsesTextFormat,
} from './types.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Conversion result with request + errors */
export interface ResponsesConversionResult {
  request: CanonicalRequest;
  errors: CanonicalError[];
}

/**
 * Convert Responses API request → CanonicalRequest.
 *
 * Key semantics:
 * - `instructions` → CanonicalInstruction[] (role: 'system')
 * - `input` string → single user message with text
 * - `input` array → CanonicalMessage[] with role/content mapping
 * - function_call_output → elevated to role:'tool' message
 * - tools/function → CanonicalTool[]
 * - reasoning → extensions.openaiResponses.reasoning
 * - text.format → responseFormat
 * - truncation, previous_response_id → extensions.openaiResponses
 */
export function responsesRequestToCanonical(req: ResponsesRequest): ResponsesConversionResult {
  const warnings = new WarningAccumulator();
  const errors: CanonicalError[] = [];

  // Validate required fields
  if (!req.model || typeof req.model !== 'string') {
    errors.push({
      code: 'missing_model',
      message: 'Responses request must have a model',
      fieldPath: 'model',
      retryable: false,
      sanitized: true,
    });
  }

  // ─── Instructions ────────────────────────────────────────────────
  const instructions: CanonicalInstruction[] = [];
  if (req.instructions) {
    instructions.push({
      role: 'system',
      content: [{ type: 'text', text: req.instructions }],
      position: 0,
    });
  }

  // ─── Input → Messages ────────────────────────────────────────────
  const messages: CanonicalMessage[] = [];
  let position = 0;

  if (typeof req.input === 'string') {
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: req.input }],
      position: position++,
    });
  } else if (Array.isArray(req.input)) {
    for (const item of req.input) {
      const result = convertInputItem(item, position, warnings);
      if (result) {
        for (const msg of result) {
          msg.position = position++;
          messages.push(msg);
        }
      }
    }
  }

  // ─── Tools ───────────────────────────────────────────────────────
  const tools = convertTools(req.tools, warnings);
  const toolChoice = convertToolChoice(req.tool_choice);

  // ─── Response Format ─────────────────────────────────────────────
  const responseFormat = convertTextFormat(req.text?.format);

  // ─── Extensions ──────────────────────────────────────────────────
  const responsesExt: ResponsesExtensions = {};
  if (req.instructions) responsesExt.instructions = req.instructions;
  if (req.previous_response_id) responsesExt.previous_response_id = req.previous_response_id;

  const extensions: CanonicalExtensions = {};
  if (Object.keys(responsesExt).length > 0) {
    extensions.responses = responsesExt;
  }

  // ─── Required Capabilities ───────────────────────────────────────
  const requiredCapabilities: CanonicalCapability[] = ['chat'];
  if (tools.length > 0) requiredCapabilities.push('tools');

  return {
    request: {
      model: req.model || 'unknown',
      instructions,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice,
      stream: req.stream,
      temperature: req.temperature,
      topP: req.top_p,
      maxTokens: req.max_output_tokens,
      responseFormat,
      metadata: req.metadata,
      extensions,
      bridgeMeta: {
        sourceFormat: 'openai_responses',
        warnings: warnings.getWarnings(),
      },
      requiredCapabilities,
    },
    errors,
  };
}

// ─── Input Item Conversion ───────────────────────────────────────────

function convertInputItem(
  item: ResponsesInputItem,
  position: number,
  warnings: WarningAccumulator,
): CanonicalMessage[] | null {
  // function_call_output → tool result message
  if (item.type === 'function_call_output') {
    return [{
      role: 'tool',
      content: [{
        type: 'tool_result',
        toolCallId: item.call_id,
        content: item.output,
      }],
    }];
  }

  // Message with role
  if (item.type === 'message') {
    const msg = convertInputMessage(item, warnings);
    return msg ? [msg] : null;
  }

  // Direct content items (input_text, input_image, input_file)
  const part = convertInputItemToContentPart(item, warnings);
  if (part) {
    return [{
      role: 'user',
      content: [part],
    }];
  }

  warnings.fieldDropped(`input[]`, `Unknown input item type: ${(item as { type?: string }).type}`);
  return null;
}

function convertInputMessage(
  msg: ResponsesInputMessage,
  warnings: WarningAccumulator,
): CanonicalMessage | null {
  const content: CanonicalContentPart[] = [];

  for (const part of msg.content) {
    const converted = convertContentPart(part, warnings);
    if (converted) content.push(converted);
  }

  if (content.length === 0) return null;

  return {
    role: msg.role,
    content,
  };
}

function convertContentPart(
  part: ResponsesContentPart,
  warnings: WarningAccumulator,
): CanonicalContentPart | null {
  if (part.type === 'input_text') {
    return { type: 'text', text: part.text };
  }

  if (part.type === 'input_image') {
    if (part.data && part.mime_type) {
      return {
        type: 'image',
        source: { type: 'base64', data: part.data, mediaType: part.mime_type },
      };
    }
    if (part.image_url) {
      return {
        type: 'image',
        source: { type: 'url', url: part.image_url },
      };
    }
    warnings.fieldDropped('input[].content[]', 'input_image without image_url or data');
    return null;
  }

  warnings.fieldDropped('input[].content[]', `Unknown content part type: ${(part as { type?: string }).type}`);
  return null;
}

function convertInputItemToContentPart(
  item: ResponsesInputItem,
  warnings: WarningAccumulator,
): CanonicalContentPart | null {
  if ('text' in item && (item as { type?: string }).type === 'input_text') {
    return { type: 'text', text: (item as { text: string }).text };
  }
  if ('image_url' in item || 'data' in item) {
    const imgItem = item as { type?: string; image_url?: string; data?: string; mime_type?: string };
    if (imgItem.data && imgItem.mime_type) {
      return { type: 'image', source: { type: 'base64', data: imgItem.data, mediaType: imgItem.mime_type } };
    }
    if (imgItem.image_url) {
      return { type: 'image', source: { type: 'url', url: imgItem.image_url } };
    }
  }
  if ('content' in item && (item as { type?: string }).type === 'input_file') {
    const fileItem = item as { content?: string; filename?: string };
    warnings.fieldPreserved('input[]', 'input_file preserved as text');
    return { type: 'text', text: fileItem.content || `[file: ${fileItem.filename}]` };
  }
  return null;
}

// ─── Tools Conversion ───────────────────────────────────────────────

function convertTools(
  tools: ResponsesTool[] | undefined,
  warnings: WarningAccumulator,
): CanonicalTool[] {
  if (!tools || tools.length === 0) return [];

  const result: CanonicalTool[] = [];

  for (const tool of tools) {
    if (tool.type === 'function') {
      result.push({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters,
        strict: tool.strict,
      });
    } else if (tool.type === 'web_search_preview' || tool.type === 'web_search') {
      result.push({
        name: tool.type,
        description: 'Web search tool',
        extensions: { responses: tool },
      });
    } else if (tool.type === 'file_search') {
      result.push({
        name: 'file_search',
        description: 'File search tool',
        extensions: { responses: tool },
      });
    } else if (tool.type === 'computer_use_preview' || tool.type === 'computer_use') {
      result.push({
        name: tool.type,
        description: 'Computer use tool',
        extensions: { responses: tool },
      });
    } else if (tool.type === 'code_interpreter') {
      result.push({
        name: 'code_interpreter',
        description: 'Code interpreter tool',
        extensions: { responses: tool },
      });
    } else {
      warnings.fieldDropped(`tools[]`, `Unknown tool type: ${(tool as { type?: string }).type}`);
    }
  }

  return result;
}

function convertToolChoice(
  choice: ResponsesToolChoice | undefined,
): CanonicalToolChoice | undefined {
  if (!choice) return undefined;

  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'none' };
  if (choice === 'required') return { type: 'required' };

  if (typeof choice === 'object') {
    if (choice.type === 'function' && 'name' in choice) {
      return { type: 'tool', name: (choice as { type: 'function'; name: string }).name };
    }
    // Non-function tool choices (web_search, file_search, etc.)
    return { type: 'required' };
  }

  return { type: 'auto' };
}

function convertTextFormat(
  format: ResponsesTextFormat | undefined,
): import('../canonical/request.js').CanonicalResponseFormat | undefined {
  if (!format) return undefined;

  switch (format.type) {
    case 'text': return { type: 'text' };
    case 'json_object': return { type: 'json_object' };
    case 'json_schema': return {
      type: 'json_schema',
      name: format.name,
      schema: format.schema,
      strict: format.strict,
    };
    default: return undefined;
  }
}
