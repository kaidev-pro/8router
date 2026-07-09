// 8Router — Canonical Request → Gemini Request Converter
// Phase 1E: Convert CanonicalRequest to Gemini generateContent request format.

import type { CanonicalContentPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalTool, CanonicalToolCall, CanonicalToolChoice } from '../canonical/tools.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type {
  GeminiRequest,
  GeminiContent,
  GeminiPart,
  GeminiTool,
  GeminiToolConfig,
  GeminiGenerationConfig,
} from './types.js';
import type { GeminiExtensions } from '../canonical/extensions.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Result of serializing a canonical request to Gemini format. */
export interface GeminiSerializationResult {
  request: GeminiRequest;
  errors: CanonicalError[];
}

/**
 * Serialize CanonicalRequest → Gemini generateContent request.
 *
 * Key semantics:
 * - instructions[] (role:'system') → systemInstruction
 * - messages → contents with role:'user' or role:'model'
 * - tool result messages → functionResponse parts in user contents
 * - tools → functionDeclarations
 * - toolChoice → toolConfig.functionCallingConfig
 * - temperature, topP, maxTokens, stop → generationConfig
 * - responseFormat → generationConfig.responseMimeType + responseSchema
 * - extensions.gemini.topK → generationConfig.topK
 * - extensions.gemini.safetySettings → safetySettings
 */
export function canonicalRequestToGemini(req: CanonicalRequest): GeminiSerializationResult {
  const warnings = new WarningAccumulator();
  const errors: CanonicalError[] = [];

  // ─── System Instruction ──────────────────────────────────────────
  const systemInstruction = convertInstructions(req.instructions);

  // ─── Messages → Contents ─────────────────────────────────────────
  const contents = convertMessages(req.messages, warnings);

  // ─── Tools ───────────────────────────────────────────────────────
  const tools = req.tools ? convertTools(req.tools) : undefined;

  // ─── Tool Config ─────────────────────────────────────────────────
  const toolConfig = convertToolChoice(req.toolChoice);

  // ─── Generation Config ───────────────────────────────────────────
  const generationConfig = convertGenerationConfig(req);

  // ─── Extensions ──────────────────────────────────────────────────
  const geminiExt = req.extensions?.gemini;

  return {
    request: {
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      ...(tools && tools.length > 0 ? { tools } : {}),
      ...(toolConfig ? { toolConfig } : {}),
      ...(generationConfig ? { generationConfig } : {}),
      ...(geminiExt?.safetySettings ? { safetySettings: geminiExt.safetySettings } : {}),
    },
    errors,
  };
}

// ─── Instructions → System Instruction ──────────────────────────────

function convertInstructions(instructions: CanonicalInstruction[]): GeminiRequest['systemInstruction'] | undefined {
  if (instructions.length === 0) return undefined;

  const parts: { text: string }[] = [];
  for (const inst of instructions) {
    for (const part of inst.content) {
      if (part.type === 'text') {
        parts.push({ text: part.text });
      }
    }
  }

  return parts.length > 0 ? { parts } : undefined;
}

// ─── Messages → Contents ────────────────────────────────────────────

function convertMessages(
  messages: CanonicalMessage[],
  warnings: WarningAccumulator,
): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const msg of messages) {
    // Tool results → user content with functionResponse parts
    if (msg.role === 'tool') {
      const fnResponseParts = convertToolResultParts(msg);
      if (fnResponseParts.length > 0) {
        // Merge with existing user content or create new
        const existing = contents.find(c => c.role === 'user' && c.parts.every(p => !('functionResponse' in p)));
        if (existing) {
          existing.parts.push(...fnResponseParts);
        } else {
          contents.push({ role: 'user', parts: fnResponseParts });
        }
      }
      continue;
    }

    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = convertContentParts(msg, warnings);

    // Tool calls in assistant content → functionCall parts
    const toolCallParts = convertToolCalls(msg.toolCalls);
    const allParts: GeminiPart[] = [...parts, ...toolCallParts];

    if (allParts.length === 0) {
      // Empty message — skip
      continue;
    }

    contents.push({ role, parts: allParts });
  }

  return contents;
}

function convertContentParts(
  msg: CanonicalMessage,
  warnings: WarningAccumulator,
): GeminiPart[] {
  const parts: GeminiPart[] = [];

  for (const part of msg.content) {
    if (part.type === 'text') {
      parts.push({ text: part.text });
    } else if (part.type === 'image') {
      if (part.source.type === 'base64') {
        parts.push({
          inlineData: {
            mimeType: part.mediaType || 'image/png',
            data: part.source.data,
          },
        });
      } else {
        // URL images — use fileData if it's a valid URI
        parts.push({
          fileData: {
            mimeType: part.mediaType || 'image/png',
            fileUri: part.source.url,
          },
        });
      }
    } else if (part.type === 'tool_use') {
      // Tool use is handled separately via convertToolCalls
    } else if (part.type === 'tool_result') {
      // Handled at message level
    } else if (part.type === 'thinking') {
      warnings.fieldDropped('messages[].content[].thinking', 'Thinking content not supported in Gemini');
    }
  }

  return parts;
}

function convertToolCalls(toolCalls: CanonicalToolCall[] | undefined): GeminiPart[] {
  if (!toolCalls || toolCalls.length === 0) return [];
  return toolCalls.map(tc => ({
    functionCall: {
      name: tc.name,
      args: Object.keys(tc.arguments).length > 0 ? tc.arguments : undefined,
    },
  }));
}

function convertToolResultParts(msg: CanonicalMessage): GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const part of msg.content) {
    if (part.type === 'tool_result') {
      let response: Record<string, unknown>;
      try {
        response = JSON.parse(part.content);
      } catch {
        response = { result: part.content };
      }
      parts.push({
        functionResponse: {
          name: 'unknown', // Gemini requires the function name
          response,
        },
      });
    }
  }
  return parts;
}

// ─── Tools Conversion ───────────────────────────────────────────────

function convertTools(tools: CanonicalTool[]): GeminiTool[] {
  if (tools.length === 0) return [];

  return [{
    functionDeclarations: tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    })),
  }];
}

// ─── Tool Config Conversion ─────────────────────────────────────────

function convertToolChoice(toolChoice: CanonicalToolChoice | undefined): GeminiToolConfig | undefined {
  if (!toolChoice) return undefined;

  let mode: 'AUTO' | 'ANY' | 'NONE';
  const allowedFunctionNames: string[] | undefined = undefined;

  switch (toolChoice.type) {
    case 'auto': mode = 'AUTO'; break;
    case 'required': mode = 'ANY'; break;
    case 'none': mode = 'NONE'; break;
    case 'tool': mode = 'ANY'; break;
    default: mode = 'AUTO';
  }

  const config: GeminiToolConfig = {
    functionCallingConfig: {
      mode,
      ...(toolChoice.type === 'tool' ? { allowedFunctionNames: [toolChoice.name] } : {}),
    },
  };

  return config;
}

// ─── Generation Config ──────────────────────────────────────────────

function convertGenerationConfig(req: CanonicalRequest): GeminiGenerationConfig | undefined {
  const gc: GeminiGenerationConfig = {};
  let hasFields = false;

  if (req.temperature !== undefined) {
    gc.temperature = req.temperature;
    hasFields = true;
  }
  if (req.topP !== undefined) {
    gc.topP = req.topP;
    hasFields = true;
  }
  if (req.maxTokens !== undefined) {
    gc.maxOutputTokens = req.maxTokens;
    hasFields = true;
  }
  if (req.stop && req.stop.length > 0) {
    gc.stopSequences = req.stop;
    hasFields = true;
  }
  if (req.responseFormat) {
    if (req.responseFormat.type === 'json_object') {
      gc.responseMimeType = 'application/json';
      hasFields = true;
    } else if (req.responseFormat.type === 'json_schema') {
      gc.responseMimeType = 'application/json';
      if (req.responseFormat.schema) {
        gc.responseSchema = req.responseFormat.schema;
      }
      hasFields = true;
    }
  }

  // Gemini-specific extension fields
  const geminiExt = req.extensions?.gemini;
  if (geminiExt?.topK !== undefined) {
    gc.topK = geminiExt.topK;
    hasFields = true;
  }

  return hasFields ? gc : undefined;
}
