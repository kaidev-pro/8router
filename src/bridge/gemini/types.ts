// 8Router — Gemini (Google AI) Request Types
// Phase 1E: Types for Gemini generateContent ↔ Canonical conversion.

/** Gemini generateContent request */
export interface GeminiRequest {
  /** Conversation contents */
  contents: GeminiContent[];
  /** System instruction (separate from contents) */
  systemInstruction?: GeminiSystemInstruction;
  /** Tool definitions */
  tools?: GeminiTool[];
  /** Tool calling configuration */
  toolConfig?: GeminiToolConfig;
  /** Generation configuration */
  generationConfig?: GeminiGenerationConfig;
  /** Safety settings */
  safetySettings?: GeminiSafetySetting[];
  /** Cached content reference */
  cachedContent?: string;
}

/** A content block in a Gemini request */
export interface GeminiContent {
  /** Role: 'user' or 'model' */
  role: 'user' | 'model';
  /** Content parts */
  parts: GeminiPart[];
}

/** A single part within a Gemini content block */
export type GeminiPart =
  | GeminiTextPart
  | GeminiInlineDataPart
  | GeminiFileDataPart
  | GeminiFunctionCallPart
  | GeminiFunctionResponsePart;

/** Text part */
export interface GeminiTextPart {
  text: string;
}

/** Inline binary data (base64) */
export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

/** File data reference (Google Cloud Storage URI) */
export interface GeminiFileDataPart {
  fileData: {
    mimeType: string;
    fileUri: string;
  };
}

/** Function call from the model */
export interface GeminiFunctionCallPart {
  functionCall: {
    name: string;
    args?: Record<string, unknown>;
  };
}

/** Function response (tool result) from the user */
export interface GeminiFunctionResponsePart {
  functionResponse: {
    name: string;
    response: Record<string, unknown>;
  };
}

/** System instruction */
export interface GeminiSystemInstruction {
  parts: GeminiTextPart[];
}

/** Tool definition */
export interface GeminiTool {
  functionDeclarations?: GeminiFunctionDeclaration[];
  /** Google Search retrieval tool */
  googleSearchRetrieval?: Record<string, unknown>;
  /** Code execution tool */
  codeExecution?: Record<string, unknown>;
}

/** Function declaration within a tool */
export interface GeminiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/** Tool calling configuration */
export interface GeminiToolConfig {
  functionCallingConfig?: {
    mode?: 'AUTO' | 'ANY' | 'NONE';
    allowedFunctionNames?: string[];
  };
}

/** Generation configuration */
export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  candidateCount?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, unknown>;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/** Safety setting */
export interface GeminiSafetySetting {
  category: string;
  threshold: string;
}
