// 8Router — Static Pricing Registry (Phase 2E)
// All values are estimates per 1M tokens

interface ModelPricing {
  input: number;   // cost per 1M input tokens
  output: number;  // cost per 1M output tokens
}

// Intentionally maintained — unknown models return null
const PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o':                  { input: 2.50,  output: 10.00 },
  'gpt-4o-mini':             { input: 0.15,  output: 0.60 },
  'gpt-4-turbo':             { input: 10.00, output: 30.00 },
  'gpt-4':                   { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo':           { input: 0.50,  output: 1.50 },
  'o1':                      { input: 15.00, output: 60.00 },
  'o1-mini':                 { input: 3.00,  output: 12.00 },
  'o3':                      { input: 10.00, output: 40.00 },
  'o3-mini':                 { input: 1.10,  output: 4.40 },
  'o4-mini':                 { input: 1.10,  output: 4.40 },
  'gpt-4.1':                 { input: 2.00,  output: 8.00 },
  'gpt-4.1-mini':            { input: 0.40,  output: 1.60 },
  'gpt-4.1-nano':            { input: 0.10,  output: 0.40 },
  // Anthropic
  'claude-opus-4':           { input: 15.00, output: 75.00 },
  'claude-sonnet-4':         { input: 3.00,  output: 15.00 },
  'claude-3-5-sonnet':       { input: 3.00,  output: 15.00 },
  'claude-3-5-haiku':        { input: 0.80,  output: 4.00 },
  'claude-3-opus':           { input: 15.00, output: 75.00 },
  'claude-3-haiku':          { input: 0.25,  output: 1.25 },
  // Gemini
  'gemini-2.0-flash':        { input: 0.10,  output: 0.40 },
  'gemini-2.5-pro':          { input: 1.25,  output: 10.00 },
  'gemini-1.5-pro':          { input: 1.25,  output: 5.00 },
  'gemini-1.5-flash':        { input: 0.075, output: 0.30 },
  // Groq
  'llama-3.3-70b-versatile': { input: 0.59,  output: 0.79 },
  'llama-3.1-8b-instant':    { input: 0.05,  output: 0.08 },
  'mixtral-8x7b-32768':      { input: 0.24,  output: 0.24 },
  'gemma2-9b-it':            { input: 0.20,  output: 0.20 },
  // Mistral
  'mistral-large-latest':    { input: 2.00,  output: 6.00 },
  'mistral-small-latest':    { input: 0.10,  output: 0.30 },
  // DeepSeek
  'deepseek-chat':           { input: 0.14,  output: 0.28 },
  'deepseek-reasoner':       { input: 0.55,  output: 2.19 },
  // xAI
  'grok-2':                  { input: 2.00,  output: 10.00 },
  'grok-3':                  { input: 3.00,  output: 15.00 },
  'grok-3-mini':             { input: 0.30,  output: 0.50 },
};

export function getModelPricing(model: string): ModelPricing | null {
  return PRICING[model] ?? null;
}

export function estimateModelCost(model: string, inputTokens: number, outputTokens: number): { inputCost: number; outputCost: number; totalCost: number } | null {
  const pricing = PRICING[model];
  if (!pricing) return null;
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}
