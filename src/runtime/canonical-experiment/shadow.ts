// 8Router — Canonical Experiment Shadow (Phase 2H)
// Shadow mode: convert request/response in parallel, compare, log mismatches.
// Never changes user response. Never makes a second provider call.

import type { CanonicalExperimentConfig, CanonicalComparisonResult } from './types.js';
import { runComparison } from './compare.js';
import { recordShadow, recordMismatch, recordCanonicalFailure } from './state.js';
import { recordMismatchKind } from './metrics.js';

/**
 * Run shadow comparison.
 * Converts the request through canonical bridge conceptually and compares.
 * In shadow mode, we do NOT actually call the provider again.
 * We only compare the structural transformation.
 */
export function runShadow(
  legacyRequest: Record<string, unknown>,
  legacyResponse: Record<string, unknown> | undefined,
  config: CanonicalExperimentConfig,
): CanonicalComparisonResult | null {
  recordShadow();

  try {
    // For shadow mode, we simulate a canonical conversion by re-parsing the request
    // through the same structural transformation path.
    // The canonical request is the legacy request itself (since the canonical bridge
    // converts OpenAI → canonical → OpenAI, the round-trip should be structurally equivalent).
    const canonicalRequest = simulateCanonicalConversion(legacyRequest);
    let canonicalResponse: Record<string, unknown> | undefined;
    if (legacyResponse) {
      canonicalResponse = simulateCanonicalResponseConversion(legacyResponse);
    }

    const result = runComparison(
      legacyRequest,
      canonicalRequest,
      legacyResponse,
      canonicalResponse,
      {
        compareToolCalls: config.compareToolCalls,
        compareUsage: config.compareUsage,
        compareMetadata: config.compareMetadata,
      },
    );

    if (!result.matched) {
      recordMismatch();
      for (const kind of result.mismatchKinds) {
        recordMismatchKind(kind);
      }
    }

    return result;
  } catch (err: unknown) {
    recordCanonicalFailure();
    const errMsg = err instanceof Error ? err.message : 'unknown';
    return {
      matched: false,
      requestMatched: false,
      responseMatched: false,
      mismatchKinds: ['conversion_error'],
      mismatchCount: 1,
      safeSummary: { error: errMsg.slice(0, 200) },
      comparisonLatencyMs: 0,
    };
  }
}

/**
 * Simulate canonical round-trip: OpenAI → canonical → OpenAI.
 * In a full implementation this would use the actual canonical bridge.
 * For Phase 2H, we perform a structural pass-through that preserves
 * all semantic fields while normalizing non-semantic differences.
 */
function simulateCanonicalConversion(req: Record<string, unknown>): Record<string, unknown> {
  // The canonical bridge round-trip preserves all OpenAI fields.
  // We simulate this by cloning the request (simulating a lossless conversion).
  const clone: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
  };
  if (req.tools) clone.tools = req.tools;
  if (req.tool_choice !== undefined) clone.tool_choice = req.tool_choice;
  if (req.temperature !== undefined) clone.temperature = req.temperature;
  if (req.top_p !== undefined) clone.top_p = req.top_p;
  if (req.max_tokens !== undefined) clone.max_tokens = req.max_tokens;
  if (req.max_completion_tokens !== undefined) clone.max_completion_tokens = req.max_completion_tokens;
  if (req.stream !== undefined) clone.stream = req.stream;
  return clone;
}

function simulateCanonicalResponseConversion(resp: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {
    id: resp.id,
    model: resp.model,
    choices: resp.choices,
  };
  if (resp.usage) clone.usage = resp.usage;
  return clone;
}
