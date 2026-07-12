// 8Router — Canonical Experiment Normalize (Phase 2H)
// Normalize non-semantic differences for structural comparison.

import { createHash } from 'crypto';

/**
 * Normalize a request for comparison — removes non-semantic differences.
 * Does NOT normalize away: role, content order, tool names, model identity.
 */
export function normalizeRequestForComparison(req: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // Model identity preserved
  normalized.model = req.model;

  // Messages — normalize structure but preserve semantic order
  if (Array.isArray(req.messages)) {
    normalized.messages = req.messages.map((msg: Record<string, unknown>) => {
      const nm: Record<string, unknown> = { role: msg.role };
      if (msg.content !== undefined) {
        if (typeof msg.content === 'string') {
          nm.content = msg.content;
        } else if (Array.isArray(msg.content)) {
          nm.content = msg.content.map((p: Record<string, unknown>) => normalizeContentPart(p));
        }
      }
      if (msg.tool_calls) nm.tool_calls = msg.tool_calls;
      if (msg.tool_call_id) nm.tool_call_id = msg.tool_call_id;
      if (msg.name) nm.name = msg.name;
      return nm;
    });
  }

  // Tool definitions
  if (Array.isArray(req.tools)) {
    normalized.tools = req.tools.map((t: Record<string, unknown>) => ({
      type: t.type || 'function',
      function: {
        name: (t.function as Record<string, unknown>)?.name,
        // Arguments shape only, not full schema
        parameters: (t.function as Record<string, unknown>)?.parameters
          ? { type: ((t.function as Record<string, unknown>)?.parameters as Record<string, unknown>)?.type }
          : undefined,
      },
    }));
  }

  // Generation config — normalize null vs undefined
  if (req.temperature !== undefined && req.temperature !== null) normalized.temperature = req.temperature;
  if (req.top_p !== undefined && req.top_p !== null) normalized.top_p = req.top_p;
  if (req.max_tokens !== undefined && req.max_tokens !== null) normalized.max_tokens = req.max_tokens;
  if (req.max_completion_tokens !== undefined && req.max_completion_tokens !== null) normalized.max_completion_tokens = req.max_completion_tokens;
  if (req.tool_choice !== undefined) normalized.tool_choice = req.tool_choice;

  return normalized;
}

function normalizeContentPart(part: Record<string, unknown>): Record<string, unknown> {
  const np: Record<string, unknown> = { type: part.type };
  if (part.type === 'text') {
    np.text = part.text;
    np.textLength = typeof part.text === 'string' ? part.text.length : 0;
  } else if (part.type === 'image_url') {
    np.hasImage = true;
  } else if (part.type === 'tool_result') {
    np.tool_use_id = part.tool_use_id;
  } else if (part.type === 'tool_use') {
    np.name = part.name;
    np.id = part.id;
  }
  return np;
}

/**
 * Normalize a response for comparison.
 */
export function normalizeResponseForComparison(resp: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  normalized.id = typeof resp.id === 'string' ? 'normalized' : resp.id;
  normalized.model = resp.model;

  if (Array.isArray(resp.choices)) {
    normalized.choices = resp.choices.map((choice: Record<string, unknown>) => {
      const nc: Record<string, unknown> = {
        index: choice.index,
        finish_reason: normalizeFinishReason(choice.finish_reason as string),
      };
      if (choice.message) {
        const msg = choice.message as Record<string, unknown>;
        const msgNorm: Record<string, unknown> = {
          role: msg.role,
          contentHash: typeof msg.content === 'string' ? hashText(msg.content) : (msg.content === null ? null : null),
          contentLength: typeof msg.content === 'string' ? msg.content.length : (msg.content === null ? 0 : 0),
        };
        if (msg.tool_calls) {
          msgNorm.tool_calls = (msg.tool_calls as Record<string, unknown>[]).map((tc: Record<string, unknown>) => ({
            id: tc.id,
            type: tc.type || 'function',
            function: {
              name: (tc.function as Record<string, unknown>)?.name,
              argumentsHash: hashText(String((tc.function as Record<string, unknown>)?.arguments || '')),
              argumentsLength: String((tc.function as Record<string, unknown>)?.arguments || '').length,
            },
          }));
        }
        nc.message = msgNorm;
      }
      if (choice.delta) {
        const delta = choice.delta as Record<string, unknown>;
        nc.delta = {
          role: delta.role,
          contentLength: typeof delta.content === 'string' ? delta.content.length : 0,
          hasToolCalls: !!delta.tool_calls,
        };
      }
      return nc;
    });
  }

  if (resp.usage) {
    const u = resp.usage as Record<string, unknown>;
    normalized.usage = {
      prompt_tokens: u.prompt_tokens ?? 0,
      completion_tokens: u.completion_tokens ?? 0,
      total_tokens: u.total_tokens ?? 0,
    };
  }

  return normalized;
}

/**
 * Normalize finish reason aliases (e.g., stop vs end_turn).
 */
export function normalizeFinishReason(reason: string | undefined | null): string {
  if (!reason) return 'unknown';
  const r = reason.toLowerCase().trim();
  if (r === 'end_turn' || r === 'stop' || r === 'completed') return 'stop';
  if (r === 'tool_use' || r === 'tool_calls' || r === 'function_call') return 'tool_calls';
  if (r === 'length' || r === 'max_tokens') return 'length';
  if (r === 'content_filter' || r === 'safety') return 'content_filter';
  return r;
}

/**
 * SHA-256 hash of text for safe fingerprinting. No plaintext stored.
 */
export function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

/**
 * Structural fingerprint of normalized data.
 */
export function fingerprint(obj: Record<string, unknown>): string {
  const safe = JSON.stringify(obj, Object.keys(obj).sort());
  return createHash('sha256').update(safe).digest('hex').slice(0, 16);
}
