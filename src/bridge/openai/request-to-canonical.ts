// 8Router — OpenAI Chat Completions → Canonical Request Converter
// Phase 1B: No runtime production path change. Pure conversion function.

import { createHash } from 'node:crypto';
import type { CanonicalContentPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type { CanonicalCapability } from '../canonical/capabilities.js';
import type { OpenAIChatRequest, OpenAIChatMessage } from './types.js';
import { openaiContentToCanonical } from './content.js';
import { openaiToolsToCanonical, openaiToolChoiceToCanonical, openaiToolCallsToCanonical } from './tools.js';
import { WarningAccumulator } from './warnings.js';
import { OPENAI_EXTENSION_ALLOWLIST, SUSPICIOUS_FIELD_PATTERNS } from './constants.js';

/** Conversion result with request + errors */
export interface ConversionResult {
  request: CanonicalRequest;
  errors: CanonicalError[];
}

/**
 * Metadata fields that could be prototype pollution vectors.
 */
const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Maximum metadata depth (nesting levels).
 */
const METADATA_MAX_DEPTH = 4;

/**
 * Maximum metadata serialized size in bytes.
 */
const METADATA_MAX_BYTES = 8192;

/**
 * Known allowlisted OpenAI extension field names (snake_case, matching the API).
 */
const OPENAI_EXT_SET = new Set(OPENAI_EXTENSION_ALLOWLIST);

/**
 * Validate and sanitize metadata object.
 * Returns sanitized copy or null if invalid.
 */
function validateMetadata(
  meta: Record<string, unknown> | undefined,
  warnings: WarningAccumulator,
): Record<string, unknown> | undefined {
  if (meta === undefined || meta === null) return undefined;

  if (typeof meta !== 'object' || Array.isArray(meta)) {
    warnings.fieldDropped('metadata', 'metadata is not a plain object — dropped');
    return undefined;
  }

  // Check for prototype pollution keys at top level
  for (const key of Object.keys(meta)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      warnings.fieldDropped(`metadata.${key}`, 'metadata contains prototype pollution key — dropped');
      return undefined;
    }
  }

  // Check depth
  if (!checkDepth(meta, METADATA_MAX_DEPTH)) {
    warnings.fieldDropped('metadata', `metadata exceeds max depth (${METADATA_MAX_DEPTH}) — dropped`);
    return undefined;
  }

  // Check serialized size
  const serialized = JSON.stringify(meta);
  if (serialized.length > METADATA_MAX_BYTES) {
    warnings.fieldDropped('metadata', `metadata exceeds max size (${METADATA_MAX_BYTES} bytes) — dropped`);
    return undefined;
  }

  // Return a shallow clone to avoid mutating source
  return { ...meta };
}

/**
 * Check object nesting depth.
 */
function checkDepth(obj: unknown, maxDepth: number, currentDepth = 0): boolean {
  if (currentDepth >= maxDepth) return false;
  if (obj === null || typeof obj !== 'object') return true;
  for (const val of Object.values(obj as Record<string, unknown>)) {
    if (!checkDepth(val, maxDepth, currentDepth + 1)) return false;
  }
  return true;
}

/**
 * Check if a field name matches suspicious patterns (auth, token, secret, etc.)
 */
function isSuspiciousField(name: string): boolean {
  for (const pattern of SUSPICIOUS_FIELD_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Convert OpenAI Chat Completions request → CanonicalRequest.
 *
 * Ordering semantics:
 * - system/developer messages become CanonicalInstruction with preserved position
 * - user/assistant/tool messages become CanonicalMessage with preserved position
 * - instructions and messages are stored in separate arrays, each with position
 * - round-trip serializer merges by position to restore original order
 *
 * No runtime production path is modified by this function.
 */
export function openaiRequestToCanonical(req: OpenAIChatRequest): ConversionResult {
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

  // If critical errors, return early
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

  // Process messages: separate instructions from conversation messages
  const instructions: CanonicalInstruction[] = [];
  const messages: CanonicalMessage[] = [];

  for (let i = 0; i < req.messages.length; i++) {
    const msg = req.messages[i];

    if (msg.role === 'system' || msg.role === 'developer') {
      // Convert to canonical instruction
      const content = openaiContentToCanonical(msg.content);
      instructions.push({
        role: msg.role,
        content,
        position: i,
      });
    } else if (msg.role === 'user') {
      const content = openaiContentToCanonical(msg.content);
      messages.push({
        role: 'user',
        content,
        name: msg.name,
        position: i,
      });
    } else if (msg.role === 'assistant') {
      const content = openaiContentToCanonical(msg.content);
      let toolCallsResult: typeof messages[0]['toolCalls'] = undefined;

      if (msg.tool_calls) {
        const { calls, errors: tcErrors } = openaiToolCallsToCanonical(msg.tool_calls);
        if (tcErrors.length > 0) {
          // Malformed tool calls are fatal errors — do not produce partial canonical request
          for (const e of tcErrors) {
            errors.push({
              code: 'malformed_tool_arguments',
              message: 'Tool call has malformed JSON arguments — conversion failed',
              fieldPath: `messages[${i}].tool_calls[].function.arguments`,
              retryable: false,
              sanitized: true,
            });
          }
        } else {
          toolCallsResult = calls;
        }
      }

      messages.push({
        role: 'assistant',
        content,
        name: msg.name,
        position: i,
        ...(toolCallsResult && toolCallsResult.length > 0 ? { toolCalls: toolCallsResult } : {}),
      });
    } else if (msg.role === 'tool') {
      if (!msg.tool_call_id) {
        errors.push({
          code: 'missing_tool_call_id',
          message: 'Tool message is missing required field: tool_call_id',
          fieldPath: `messages[${i}].tool_call_id`,
          retryable: false,
          sanitized: true,
        });
      }

      const toolContent = msg.content !== null && msg.content !== undefined
        ? (typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))
        : '';

      messages.push({
        role: 'tool',
        content: [{
          type: 'tool_result',
          toolCallId: msg.tool_call_id || '',
          content: toolContent,
        }],
        position: i,
      });
    }
  }

  // Handle max_tokens vs max_completion_tokens precedence
  let maxTokens: number | undefined;
  let maxTokenField: 'max_tokens' | 'max_completion_tokens' | undefined;
  if (req.max_completion_tokens !== undefined) {
    maxTokens = req.max_completion_tokens;
    maxTokenField = 'max_completion_tokens';
    if (req.max_tokens !== undefined) {
      warnings.fieldTransformed('max_tokens', 'max_tokens ignored when max_completion_tokens is set');
    }
  } else if (req.max_tokens !== undefined) {
    maxTokens = req.max_tokens;
    maxTokenField = 'max_tokens';
  }

  // Detect required capabilities
  const requiredCapabilities: CanonicalCapability[] = ['chat'];
  if (req.stream) requiredCapabilities.push('streaming');
  if (req.tools && req.tools.length > 0) requiredCapabilities.push('tools');
  if (hasImageContent(req.messages)) requiredCapabilities.push('vision');
  if (req.response_format) requiredCapabilities.push('json_mode');

  // Extract provider-specific fields for extensions — allowlisted only
  const extensions: CanonicalRequest['extensions'] = {};
  const openaiExt: Record<string, unknown> = {};
  if (req.frequency_penalty !== undefined) openaiExt.frequency_penalty = req.frequency_penalty;
  if (req.presence_penalty !== undefined) openaiExt.presence_penalty = req.presence_penalty;
  if (req.seed !== undefined) openaiExt.seed = req.seed;
  if (req.user !== undefined) openaiExt.user = req.user;
  if (req.parallel_tool_calls !== undefined) openaiExt.parallel_tool_calls = req.parallel_tool_calls;
  if (req.service_tier !== undefined) openaiExt.service_tier = req.service_tier;
  if (req.store !== undefined) openaiExt.store = req.store;
  if (maxTokenField !== undefined) openaiExt.maxTokenField = maxTokenField;
  if (Object.keys(openaiExt).length > 0) {
    extensions.openai = openaiExt;
  }

  // Handle unknown fields — DROP them (not preserve)
  // OpenAIChatRequest no longer has index signature, but external input may have extra keys
  const knownKeys = new Set([
    'model', 'messages', 'stream', 'temperature', 'top_p', 'max_tokens', 'max_completion_tokens',
    'stop', 'tools', 'tool_choice', 'response_format', 'metadata',
    'frequency_penalty', 'presence_penalty', 'seed', 'user', 'parallel_tool_calls',
    'service_tier', 'store',
  ]);
  for (const key of Object.keys(req as object)) {
    if (!knownKeys.has(key)) {
      if (isSuspiciousField(key)) {
        // Suspicious field: drop completely, no value in warning/log/error
        warnings.fieldDropped(key, `Suspicious field '${key}' dropped — value not stored`);
      } else {
        // Unknown harmless field: drop with field_dropped warning
        warnings.fieldDropped(key, `Unknown OpenAI field '${key}' dropped`);
      }
      // NEVER store in extensions — value is discarded
    }
  }

  // Validate metadata
  const sanitizedMetadata = validateMetadata(req.metadata, warnings);

  // Build fingerprint (SHA-256 of normalized string)
  const fingerprintInput = JSON.stringify({
    model: req.model,
    messages: req.messages,
    tools: req.tools,
    tool_choice: req.tool_choice,
    temperature: req.temperature,
    top_p: req.top_p,
    max_tokens: req.max_tokens,
    max_completion_tokens: req.max_completion_tokens,
  });
  const fingerprint = createHash('sha256').update(fingerprintInput).digest('hex').slice(0, 16);

  // Infer stop sequences
  const stop = Array.isArray(req.stop)
    ? req.stop
    : typeof req.stop === 'string'
      ? [req.stop]
      : undefined;

  // Infer response format
  let responseFormat: CanonicalRequest['responseFormat'];
  if (req.response_format) {
    const format = req.response_format;
    if (format.type === 'json_schema' && format.json_schema) {
      responseFormat = {
        type: 'json_schema',
        name: format.json_schema.name,
        strict: format.json_schema.strict,
        schema: format.json_schema.schema,
      };
    } else {
      responseFormat = { type: format.type };
    }
  }

  return {
    request: {
      model: req.model,
      instructions,
      messages,
      tools: req.tools ? openaiToolsToCanonical(req.tools) : undefined,
      toolChoice: openaiToolChoiceToCanonical(req.tool_choice),
      stream: req.stream,
      temperature: req.temperature,
      topP: req.top_p,
      maxTokens,
      stop,
      responseFormat,
      metadata: sanitizedMetadata,
      extensions,
      bridgeMeta: {
        sourceFormat: 'openai_chat_completions',
        fingerprint,
        warnings: warnings.getWarnings(),
      },
      requiredCapabilities,
    },
    errors,
  };
}

/** Check if any message has image content */
function hasImageContent(messages: OpenAIChatMessage[]): boolean {
  for (const msg of messages) {
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'image_url') return true;
      }
    }
  }
  return false;
}
