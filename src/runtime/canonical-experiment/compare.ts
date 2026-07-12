// 8Router — Canonical Experiment Compare (Phase 2H)
// Structural comparison of normalized request/response data.

import type { CanonicalComparisonResult, CanonicalMismatchKind } from './types.js';
import { normalizeRequestForComparison, normalizeResponseForComparison, fingerprint } from './normalize.js';

/**
 * Compare legacy and canonical request structures.
 */
export function compareRequests(
  legacyReq: Record<string, unknown>,
  canonicalReq: Record<string, unknown>,
): { matched: boolean; mismatches: CanonicalMismatchKind[] } {
  const lNorm = normalizeRequestForComparison(legacyReq);
  const cNorm = normalizeRequestForComparison(canonicalReq);
  const mismatches: CanonicalMismatchKind[] = [];

  // Model
  if (lNorm.model !== cNorm.model) {
    mismatches.push('request_model');
  }

  // Messages count
  const lMsgs = Array.isArray(lNorm.messages) ? lNorm.messages.length : 0;
  const cMsgs = Array.isArray(cNorm.messages) ? cNorm.messages.length : 0;
  if (lMsgs !== cMsgs) {
    mismatches.push('request_content_count');
  } else if (Array.isArray(lNorm.messages) && Array.isArray(cNorm.messages)) {
    // Compare roles
    for (let i = 0; i < lMsgs; i++) {
      const lMsg = lNorm.messages[i] as Record<string, unknown>;
      const cMsg = cNorm.messages[i] as Record<string, unknown>;
      if (lMsg.role !== cMsg.role) {
        mismatches.push('request_role');
        break;
      }
    }
  }

  // Tools count
  const lTools = Array.isArray(lNorm.tools) ? lNorm.tools.length : 0;
  const cTools = Array.isArray(cNorm.tools) ? cNorm.tools.length : 0;
  if (lTools !== cTools) {
    mismatches.push('request_tool_definition');
  }

  // Tool choice
  if (JSON.stringify(lNorm.tool_choice) !== JSON.stringify(cNorm.tool_choice)) {
    mismatches.push('request_tool_choice');
  }

  // Generation config
  const genFields = ['temperature', 'top_p', 'max_tokens', 'max_completion_tokens'];
  for (const f of genFields) {
    if (lNorm[f] !== cNorm[f]) {
      mismatches.push('request_generation_config');
      break;
    }
  }

  return { matched: mismatches.length === 0, mismatches };
}

/**
 * Compare legacy and canonical response structures.
 */
export function compareResponses(
  legacyResp: Record<string, unknown>,
  canonicalResp: Record<string, unknown>,
  compareToolCalls: boolean,
  compareUsage: boolean,
): { matched: boolean; mismatches: CanonicalMismatchKind[] } {
  const lNorm = normalizeResponseForComparison(legacyResp);
  const cNorm = normalizeResponseForComparison(canonicalResp);
  const mismatches: CanonicalMismatchKind[] = [];

  // Choices
  const lChoices = Array.isArray(lNorm.choices) ? lNorm.choices as Record<string, unknown>[] : [];
  const cChoices = Array.isArray(cNorm.choices) ? cNorm.choices as Record<string, unknown>[] : [];

  if (lChoices.length !== cChoices.length) {
    mismatches.push('response_role');
  } else {
    for (let i = 0; i < lChoices.length; i++) {
      const l = lChoices[i];
      const c = cChoices[i];

      // Finish reason
      if (l.finish_reason !== c.finish_reason) {
        mismatches.push('response_finish_reason');
      }

      // Message content
      const lMsg = l.message as Record<string, unknown> | undefined;
      const cMsg = c.message as Record<string, unknown> | undefined;
      if (lMsg && cMsg) {
        if (lMsg.role !== cMsg.role) {
          mismatches.push('response_role');
        }
        // Content length comparison
        if (lMsg.contentLength !== cMsg.contentLength) {
          mismatches.push('response_text_length');
        }
        // Content hash comparison (different content even if same length)
        if (lMsg.contentHash !== cMsg.contentHash) {
          mismatches.push('response_text_hash');
        }

        // Tool calls
        if (compareToolCalls) {
          const lTC = Array.isArray(lMsg.tool_calls) ? lMsg.tool_calls as Record<string, unknown>[] : [];
          const cTC = Array.isArray(cMsg.tool_calls) ? cMsg.tool_calls as Record<string, unknown>[] : [];
          if (lTC.length !== cTC.length) {
            mismatches.push('response_tool_call_count');
          } else {
            for (let j = 0; j < lTC.length; j++) {
              const lt = lTC[j];
              const ct = cTC[j];
              const lf = lt.function as Record<string, unknown> | undefined;
              const cf = ct.function as Record<string, unknown> | undefined;
              if (lf?.name !== cf?.name) mismatches.push('response_tool_call_name');
              if (lt.id !== ct.id) mismatches.push('response_tool_call_id');
              // Compare argument hashes (detects content changes without storing plaintext)
              if (lf?.argumentsHash !== cf?.argumentsHash) mismatches.push('response_tool_call_arguments_shape');
            }
          }
        }
      }
    }
  }

  // Usage
  if (compareUsage) {
    const lu = lNorm.usage as Record<string, unknown> | undefined;
    const cu = cNorm.usage as Record<string, unknown> | undefined;
    if (lu && cu) {
      if (lu.prompt_tokens !== cu.prompt_tokens || lu.completion_tokens !== cu.completion_tokens) {
        mismatches.push('response_usage');
      }
    }
  }

  return { matched: mismatches.length === 0, mismatches };
}

/**
 * Full comparison: request + optional response.
 */
export function runComparison(
  legacyReq: Record<string, unknown>,
  canonicalReq: Record<string, unknown>,
  legacyResp?: Record<string, unknown>,
  canonicalResp?: Record<string, unknown>,
  options?: { compareToolCalls?: boolean; compareUsage?: boolean; compareMetadata?: boolean },
): CanonicalComparisonResult {
  const start = Date.now();
  const reqResult = compareRequests(legacyReq, canonicalReq);
  let responseMatched = true;
  const allMismatches: CanonicalMismatchKind[] = [...reqResult.mismatches];

  if (legacyResp && canonicalResp) {
    const respResult = compareResponses(legacyResp, canonicalResp, options?.compareToolCalls ?? true, options?.compareUsage ?? true);
    responseMatched = respResult.matched;
    allMismatches.push(...respResult.mismatches);
  }

  const legacyFP = fingerprint(normalizeRequestForComparison(legacyReq));
  const canonicalFP = fingerprint(normalizeRequestForComparison(canonicalReq));

  return {
    matched: reqResult.matched && responseMatched,
    requestMatched: reqResult.matched,
    responseMatched,
    mismatchKinds: allMismatches,
    mismatchCount: allMismatches.length,
    safeSummary: {
      legacyModel: legacyReq.model,
      canonicalModel: canonicalReq.model,
      messageCount: Array.isArray(legacyReq.messages) ? legacyReq.messages.length : 0,
      toolCount: Array.isArray(legacyReq.tools) ? legacyReq.tools.length : 0,
    },
    legacyFingerprint: legacyFP,
    canonicalFingerprint: canonicalFP,
    comparisonLatencyMs: Date.now() - start,
  };
}
