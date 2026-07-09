// 8Router — Gemini Bridge Barrel Exports
// Phase 1E: Request ↔ Canonical conversion.

// Types
export type {
  GeminiRequest,
  GeminiContent,
  GeminiPart,
  GeminiTextPart,
  GeminiInlineDataPart,
  GeminiFileDataPart,
  GeminiFunctionCallPart,
  GeminiFunctionResponsePart,
  GeminiSystemInstruction,
  GeminiTool,
  GeminiFunctionDeclaration,
  GeminiToolConfig,
  GeminiGenerationConfig,
  GeminiSafetySetting,
} from './types.js';

// Request conversion
export { geminiRequestToCanonical, type GeminiConversionResult } from './request-to-canonical.js';
export { canonicalRequestToGemini, type GeminiSerializationResult } from './canonical-to-request.js';
