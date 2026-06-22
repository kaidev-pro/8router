// 8Router — Format Translation
// Convert between OpenAI, Anthropic (Claude), and Gemini API formats

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  stop?: string | string[];
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

export interface AnthropicContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  tool_use_id?: string;
  content?: string;
  id?: string;
  name?: string;
  input?: any;
}

export interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
  stop_sequences?: string[];
}

export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: any };
  functionResponse?: { name: string; response: any };
}

export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  tools?: any[];
  safetySettings?: any[];
}

// ═══ OpenAI → Anthropic ═══
export function openaiToAnthropic(req: OpenAIRequest): AnthropicRequest {
  const systemMsg = req.messages.find(m => m.role === 'system');
  const nonSystemMsgs = req.messages.filter(m => m.role !== 'system');

  const messages: AnthropicMessage[] = nonSystemMsgs.map(m => ({
    role: m.role === 'tool' ? 'user' : (m.role as 'user' | 'assistant'),
    content: m.content || ''
  }));

  const result: AnthropicRequest = {
    model: req.model,
    max_tokens: req.max_tokens || 4096,
    messages,
    temperature: req.temperature,
    top_p: req.top_p,
    stream: req.stream,
  };

  if (systemMsg?.content) {
    result.system = systemMsg.content as string;
  }

  if (req.tools) {
    result.tools = req.tools.map(t => ({
      name: t.function?.name || t.name,
      description: t.function?.description || t.description,
      input_schema: t.function?.parameters || t.parameters || { type: 'object', properties: {} }
    }));
  }

  if (req.stop) {
    result.stop_sequences = Array.isArray(req.stop) ? req.stop : [req.stop];
  }

  return result;
}

// ═══ Anthropic → OpenAI ═══
export function anthropicToOpenai(resp: any): any {
  if (resp.content) {
    const text = resp.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');

    const toolCalls = resp.content
      .filter((c: any) => c.type === 'tool_use')
      .map((c: any, i: number) => ({
        id: c.id,
        type: 'function',
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input)
        }
      }));

    return {
      id: resp.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: resp.model || 'unknown',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: text || null,
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined
        },
        finish_reason: resp.stop_reason === 'end_turn' ? 'stop' : resp.stop_reason === 'tool_use' ? 'tool_calls' : 'stop'
      }],
      usage: resp.usage ? {
        prompt_tokens: resp.usage.input_tokens,
        completion_tokens: resp.usage.output_tokens,
        total_tokens: resp.usage.input_tokens + resp.usage.output_tokens
      } : undefined
    };
  }

  // Pass through if already OpenAI format
  return resp;
}

// ═══ OpenAI → Gemini ═══
export function openaiToGemini(req: OpenAIRequest): GeminiRequest {
  const systemMsg = req.messages.find(m => m.role === 'system');
  const nonSystemMsgs = req.messages.filter(m => m.role !== 'system');

  const contents: GeminiContent[] = nonSystemMsgs.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }]
  }));

  const result: GeminiRequest = {
    contents,
    generationConfig: {
      temperature: req.temperature,
      topP: req.top_p,
      maxOutputTokens: req.max_tokens,
      stopSequences: req.stop ? (Array.isArray(req.stop) ? req.stop : [req.stop]) : undefined
    }
  };

  if (req.tools) {
    result.tools = [{
      functionDeclarations: req.tools.map(t => ({
        name: t.function?.name || t.name,
        description: t.function?.description || t.description,
        parameters: t.function?.parameters || t.parameters
      }))
    }];
  }

  return result;
}

// ═══ Gemini → OpenAI ═══
export function geminiToOpenai(resp: any, model: string): any {
  const candidate = resp.candidates?.[0];
  if (!candidate) return { error: 'No candidates in response' };

  const parts = candidate.content?.parts || [];
  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
  const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => ({
    id: `call_${Date.now()}`,
    type: 'function',
    function: {
      name: p.functionCall.name,
      arguments: JSON.stringify(p.functionCall.args)
    }
  }));

  const finishReason = candidate.finishReason === 'STOP' ? 'stop' :
    candidate.finishReason === 'MAX_TOKENS' ? 'length' : 'stop';

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: text || null,
        tool_calls: functionCalls.length > 0 ? functionCalls : undefined
      },
      finish_reason: finishReason
    }],
    usage: resp.usageMetadata ? {
      prompt_tokens: resp.usageMetadata.promptTokenCount || 0,
      completion_tokens: resp.usageMetadata.candidatesTokenCount || 0,
      total_tokens: resp.usageMetadata.totalTokenCount || 0
    } : undefined
  };
}

// ═══ Auto-Detect Format ═══
export function detectFormat(body: any): 'openai' | 'anthropic' | 'gemini' {
  if (body.contents && Array.isArray(body.contents)) return 'gemini';
  if (body.max_tokens !== undefined && body.messages?.[0]?.role === 'user' && !body.messages?.[0]?.content) return 'anthropic';
  if (body.messages && Array.isArray(body.messages)) return 'openai';
  return 'openai'; // default
}

// ═══ Convert Request to OpenAI (normalize) ═══
export function normalizeRequest(body: any): { format: 'openai' | 'anthropic' | 'gemini'; request: OpenAIRequest } {
  const format = detectFormat(body);

  if (format === 'openai') {
    return { format: 'openai', request: body as OpenAIRequest };
  }

  if (format === 'anthropic') {
    // Convert Anthropic → OpenAI
    const systemMsg = body.system ? [{ role: 'system' as const, content: body.system }] : [];
    const messages: OpenAIMessage[] = [
      ...systemMsg,
      ...body.messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: typeof m.content === 'string' ? m.content :
          Array.isArray(m.content) ? m.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('') : ''
      }))
    ];

    return {
      format: 'anthropic',
      request: {
        model: body.model,
        messages,
        max_tokens: body.max_tokens,
        temperature: body.temperature,
        stream: body.stream,
        tools: body.tools?.map((t: any) => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.input_schema
          }
        }))
      }
    };
  }

  if (format === 'gemini') {
    // Convert Gemini → OpenAI
    const messages: OpenAIMessage[] = body.contents.map((c: any) => ({
      role: c.role === 'model' ? 'assistant' as const : 'user' as const,
      content: c.parts?.map((p: any) => p.text || '').join('') || ''
    }));

    return {
      format: 'gemini',
      request: {
        model: body.model || 'gemini-pro',
        messages,
        max_tokens: body.generationConfig?.maxOutputTokens,
        temperature: body.generationConfig?.temperature,
        stream: body.stream
      }
    };
  }

  return { format: 'openai', request: body as OpenAIRequest };
}

// ═══ Convert Response back to original format ═══
export function formatResponse(openaiResp: any, originalFormat: 'openai' | 'anthropic' | 'gemini', model: string): any {
  if (originalFormat === 'openai') return openaiResp;

  if (originalFormat === 'anthropic') {
    const msg = openaiResp.choices?.[0]?.message;
    return {
      id: openaiResp.id,
      type: 'message',
      role: 'assistant',
      content: msg?.tool_calls ? [
        ...msg.tool_calls.map((tc: any) => ({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input: JSON.parse(tc.function.arguments)
        })),
        ...(msg.content ? [{ type: 'text', text: msg.content }] : [])
      ] : [{ type: 'text', text: msg?.content || '' }],
      model: model,
      stop_reason: openaiResp.choices?.[0]?.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
      usage: openaiResp.usage ? {
        input_tokens: openaiResp.usage.prompt_tokens,
        output_tokens: openaiResp.usage.completion_tokens
      } : undefined
    };
  }

  if (originalFormat === 'gemini') {
    const msg = openaiResp.choices?.[0]?.message;
    return {
      candidates: [{
        content: {
          parts: [{ text: msg?.content || '' }],
          role: 'model'
        },
        finishReason: openaiResp.choices?.[0]?.finish_reason === 'stop' ? 'STOP' : 'MAX_TOKENS'
      }],
      usageMetadata: openaiResp.usage ? {
        promptTokenCount: openaiResp.usage.prompt_tokens,
        candidatesTokenCount: openaiResp.usage.completion_tokens,
        totalTokenCount: openaiResp.usage.total_tokens
      } : undefined
    };
  }

  return openaiResp;
}
