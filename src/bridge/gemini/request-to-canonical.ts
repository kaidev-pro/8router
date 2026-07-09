// 8Router — Gemini Request → Canonical Request Converter
// Phase 1E: Convert Gemini generateContent request to CanonicalRequest.

import { randomUUID } from 'node:crypto';
import type { CanonicalContentPart, CanonicalToolUsePart, CanonicalToolResultPart } from '../canonical/content.js';
import type { CanonicalInstruction } from '../canonical/instruction.js';
import type { CanonicalMessage } from '../canonical/message.js';
import type { CanonicalTool, CanonicalToolChoice } from '../canonical/tools.js';
import type { CanonicalRequest } from '../canonical/request.js';
import type { CanonicalError } from '../canonical/errors.js';
import type { CanonicalCapability } from '../canonical/capabilities.js';
import type {
  GeminiRequest,
  GeminiContent,
  GeminiPart,
  GeminiFunctionDeclaration,
} from './types.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Conversion result with request + errors */
export interface GeminiConversionResult {
  request: CanonicalRequest;
  errors: CanonicalError[];
}

/**
 * Convert Gemini generateContent request → CanonicalRequest.
 *
 * Key semantics:
 * - systemInstruction → CanonicalInstruction[] (role: 'system')
 * - functionCall parts in model messages → tool_use content parts + CanonicalToolCall[]
 * - functionResponse parts in user messages → elevated to role:'tool' CanonicalMessage
 * - topK → extensions.gemini.topK
 * - safetySettings → extensions.gemini.safetySettings
 * - generationConfig.responseMimeType/responseSchema → responseFormat
 * - inlineData parts → CanonicalImagePart (image types) or dropped with warning
 */
export function geminiRequestToCanonical(req: GeminiRequest): GeminiConversionResult {
  const warnings = new WarningAccumulator();
  const errors: CanonicalError[] = [];

  // Validate required fields
  if (!req.contents || !Array.isArray(req.contents) || req.contents.length === 0) {
    errors.push({
      code: 'missing_contents',
      message: 'Gemini request must have at least one content block',
      fieldPath: 'contents',
      retryable: false,
      sanitized: true,
    });
    return {
      request: {
        model: 'unknown',
        instructions: [],
        messages: [],
        bridgeMeta: { sourceFormat: 'gemini', warnings: warnings.getWarnings() },
      },
      errors,
    };
  }

  // Extract model — Gemini puts model in the URL path, not in the request body.
  // We'll set it to a placeholder; the routing layer fills it from the URL.
  const model = 'gemini';

  // ─── System Instruction ──────────────────────────────────────────
  const instructions: CanonicalInstruction[] = [];
  if (req.systemInstruction?.parts) {
    const textParts = req.systemInstruction.parts
      .filter(p => p.text !== undefined)
      .map(p => ({ type: 'text' as const, text: p.text! }));

    if (textParts.length > 0) {
      instructions.push({
        role: 'system',
        content: textParts,
        position: 0,
      });
    }
  }

  // ─── Contents → Messages ─────────────────────────────────────────
  const messages: CanonicalMessage[] = [];
  let position = 0;

  for (const content of req.contents) {
    const { message, toolMessages } = convertGeminiContent(content, position, warnings);
    if (message) {
      messages.push(message);
      position++;
    }
    // Insert elevated tool result messages right after
    for (const tm of toolMessages) {
      messages.push({ ...tm, position: position++ });
    }
  }

  // ─── Tools ───────────────────────────────────────────────────────
  const tools = convertGeminiTools(req.tools, warnings);
  const toolChoice = convertGeminiToolConfig(req.toolConfig);

  // ─── Generation Config ───────────────────────────────────────────
  const gc = req.generationConfig;
  let responseFormat = undefined;
  if (gc?.responseMimeType === 'application/json' || gc?.responseSchema) {
    responseFormat = {
      type: gc.responseSchema ? 'json_schema' as const : 'json_object' as const,
      schema: gc.responseSchema,
    };
  }

  // ─── Extensions ──────────────────────────────────────────────────
  const extensions: import('../canonical/extensions.js').CanonicalExtensions = {};
  if (gc?.topK !== undefined || req.safetySettings) {
    extensions.gemini = {
      topK: gc?.topK,
      safetySettings: req.safetySettings,
    };
  }

  // ─── Required capabilities ───────────────────────────────────────
  const requiredCapabilities: CanonicalCapability[] = ['chat'];
  if (tools && tools.length > 0) {
    requiredCapabilities.push('tools');
  }

  return {
    request: {
      model,
      instructions,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      toolChoice,
      temperature: gc?.temperature,
      topP: gc?.topP,
      maxTokens: gc?.maxOutputTokens,
      stop: gc?.stopSequences,
      responseFormat,
      extensions,
      bridgeMeta: {
        sourceFormat: 'gemini',
        warnings: warnings.getWarnings(),
      },
      requiredCapabilities,
    },
    errors,
  };
}

// ─── Content Conversion ─────────────────────────────────────────────

function convertGeminiContent(
  content: GeminiContent,
  position: number,
  warnings: WarningAccumulator,
): { message: CanonicalMessage | null; toolMessages: CanonicalMessage[] } {
  const role = content.role;
  const parts = content.parts;
  const toolMessages: CanonicalMessage[] = [];
  const contentParts: CanonicalContentPart[] = [];
  const toolCalls: import('../canonical/tools.js').CanonicalToolCall[] = [];

  for (const part of parts) {
    if ('text' in part && part.text !== undefined) {
      contentParts.push({ type: 'text', text: part.text });
    } else if ('inlineData' in part) {
      const mimeType = part.inlineData.mimeType;
      if (mimeType.startsWith('image/')) {
        contentParts.push({
          type: 'image',
          source: { type: 'base64', data: part.inlineData.data, mediaType: mimeType },
        });
      } else {
        warnings.fieldDropped('contents[].parts[].inlineData', `Non-image inlineData (${mimeType}) dropped`);
      }
    } else if ('fileData' in part) {
      warnings.fieldPreserved('contents[].parts[].fileData', 'fileData preserved in metadata');
      contentParts.push({
        type: 'text',
        text: `[file: ${part.fileData.fileUri} (${part.fileData.mimeType})]`,
      });
    } else if ('functionCall' in part) {
      // Model's function call → tool_use content part + CanonicalToolCall
      const id = `gemini-call-${randomUUID().slice(0, 8)}`;
      contentParts.push({
        type: 'tool_use',
        id,
        name: part.functionCall.name,
        input: part.functionCall.args || {},
      });
      toolCalls.push({
        id,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {},
      });
    } else if ('functionResponse' in part) {
      // User's function response → elevated to role:'tool' message
      toolMessages.push({
        role: 'tool',
        content: [{
          type: 'tool_result',
          toolCallId: `gemini-response-${part.functionResponse.name}`,
          content: JSON.stringify(part.functionResponse.response),
        }],
      });
    }
  }

  // If all parts were functionResponses, this content becomes empty — skip it
  if (contentParts.length === 0 && toolCalls.length === 0 && toolMessages.length > 0) {
    return { message: null, toolMessages };
  }

  const canonicalRole = role === 'model' ? 'assistant' : role;

  return {
    message: {
      role: canonicalRole as 'user' | 'assistant',
      content: contentParts,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      position,
    },
    toolMessages,
  };
}

// ─── Tools Conversion ───────────────────────────────────────────────

function convertGeminiTools(
  tools: import('./types.js').GeminiTool[] | undefined,
  warnings: WarningAccumulator,
): CanonicalTool[] {
  if (!tools || tools.length === 0) return [];

  const result: CanonicalTool[] = [];

  for (const tool of tools) {
    if (tool.functionDeclarations) {
      for (const decl of tool.functionDeclarations) {
        result.push(convertFunctionDeclaration(decl));
      }
    }
    if (tool.googleSearchRetrieval) {
      warnings.fieldDropped('tools[].googleSearchRetrieval', 'Google Search retrieval not supported in canonical');
    }
    if (tool.codeExecution) {
      warnings.fieldDropped('tools[].codeExecution', 'Code execution not supported in canonical');
    }
  }

  return result;
}

function convertFunctionDeclaration(decl: GeminiFunctionDeclaration): CanonicalTool {
  return {
    name: decl.name,
    description: decl.description,
    inputSchema: decl.parameters,
  };
}

// ─── Tool Config Conversion ─────────────────────────────────────────

function convertGeminiToolConfig(
  toolConfig: import('./types.js').GeminiToolConfig | undefined,
): CanonicalToolChoice | undefined {
  if (!toolConfig?.functionCallingConfig) return undefined;

  const mode = toolConfig.functionCallingConfig.mode;
  switch (mode) {
    case 'AUTO': return { type: 'auto' };
    case 'ANY': return { type: 'required' };
    case 'NONE': return { type: 'none' };
    default: return { type: 'auto' };
  }
}
