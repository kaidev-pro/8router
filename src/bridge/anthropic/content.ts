// 8Router — Anthropic Content Part Conversion
// Phase 1C: Convert between Anthropic content parts and CanonicalContentPart

import type { CanonicalContentPart, CanonicalImagePart, CanonicalToolUsePart, CanonicalToolResultPart, CanonicalThinkingPart } from '../canonical/content.js';
import type { AnthropicContentBlock, AnthropicTextBlock, AnthropicImageBlock, AnthropicToolUseBlock, AnthropicToolResultBlock, AnthropicThinkingBlock } from './types.js';
import type { CanonicalError } from '../canonical/errors.js';

/**
 * Convert Anthropic content (string or block array) to canonical content parts.
 * String → single text part. Array → mapped per type.
 */
export function anthropicContentToCanonical(
  content: string | AnthropicContentBlock[],
): CanonicalContentPart[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  return content.map(anthropicBlockToCanonical);
}

/**
 * Convert a single Anthropic content block to canonical.
 */
export function anthropicBlockToCanonical(block: AnthropicContentBlock): CanonicalContentPart {
  switch (block.type) {
    case 'text':
      return anthropicTextToCanonical(block);
    case 'image':
      return anthropicImageToCanonical(block);
    case 'tool_use':
      return anthropicToolUseToCanonical(block);
    case 'tool_result':
      return anthropicToolResultToCanonical(block);
    case 'thinking':
      return anthropicThinkingToCanonical(block);
    default:
      throw {
        code: 'unsupported_content_type',
        message: `Unsupported Anthropic content type: ${(block as { type: string }).type}`,
        fieldPath: `messages[].content[].type:${(block as { type: string }).type}`,
        retryable: false,
        sanitized: true,
      } satisfies CanonicalError;
  }
}

function anthropicTextToCanonical(block: AnthropicTextBlock): CanonicalContentPart {
  return { type: 'text', text: block.text };
}

function anthropicImageToCanonical(block: AnthropicImageBlock): CanonicalImagePart {
  const src = block.source;
  if (src.type === 'base64') {
    return {
      type: 'image',
      source: { type: 'base64', data: src.data, mediaType: src.media_type },
    };
  }
  // URL source
  return {
    type: 'image',
    source: { type: 'url', url: src.url },
  };
}

function anthropicToolUseToCanonical(block: AnthropicToolUseBlock): CanonicalToolUsePart {
  return {
    type: 'tool_use',
    id: block.id,
    name: block.name,
    input: block.input,
  };
}

function anthropicToolResultToCanonical(block: AnthropicToolResultBlock): CanonicalToolResultPart {
  let contentStr: string;
  if (typeof block.content === 'string') {
    contentStr = block.content;
  } else if (Array.isArray(block.content)) {
    // Extract text from content blocks
    contentStr = block.content
      .filter((p): p is AnthropicTextBlock => p.type === 'text')
      .map(p => p.text)
      .join('');
  } else {
    contentStr = '';
  }
  return {
    type: 'tool_result',
    toolCallId: block.tool_use_id,
    content: contentStr,
    isError: block.is_error,
  };
}

function anthropicThinkingToCanonical(block: AnthropicThinkingBlock): CanonicalThinkingPart {
  return {
    type: 'thinking',
    text: block.thinking,
  };
}

/**
 * Convert canonical content parts back to Anthropic format.
 * Single text → string. Otherwise → AnthropicContentBlock[].
 */
export function canonicalContentToAnthropic(
  parts: CanonicalContentPart[],
): string | AnthropicContentBlock[] | undefined {
  if (parts.length === 0) return undefined;

  // Single text → simplify to string
  if (parts.length === 1 && parts[0].type === 'text') {
    return parts[0].text;
  }

  return parts.map(canonicalPartToAnthropic);
}

/**
 * Convert a single canonical content part to Anthropic format.
 */
function canonicalPartToAnthropic(part: CanonicalContentPart): AnthropicContentBlock {
  if (part.type === 'text') {
    return { type: 'text', text: part.text };
  }

  if (part.type === 'image') {
    return canonicalImageToAnthropic(part);
  }

  if (part.type === 'tool_use') {
    return {
      type: 'tool_use',
      id: part.id,
      name: part.name,
      input: part.input,
    };
  }

  if (part.type === 'tool_result') {
    return {
      type: 'tool_result',
      tool_use_id: part.toolCallId,
      content: part.content,
      is_error: part.isError,
    };
  }

  if (part.type === 'thinking') {
    return { type: 'thinking', thinking: part.text };
  }

  // Fallback — should never reach here with discriminated union
  return { type: 'text', text: '' };
}

/**
 * Convert CanonicalImagePart to Anthropic image block.
 */
function canonicalImageToAnthropic(img: import('../canonical/content.js').CanonicalImagePart): AnthropicImageBlock {
  if (img.source.type === 'base64') {
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.source.mediaType,
        data: img.source.data,
      },
    };
  }
  return {
    type: 'image',
    source: { type: 'url', url: img.source.url },
  };
}

/**
 * Convert CanonicalToolUsePart to Anthropic tool_use block.
 */
function canonicalToolUseToAnthropic(part: import('../canonical/content.js').CanonicalToolUsePart): AnthropicToolUseBlock {
  return {
    type: 'tool_use',
    id: part.id,
    name: part.name,
    input: part.input,
  };
}

/**
 * Convert CanonicalToolResultPart to Anthropic tool_result block.
 */
function canonicalToolResultToAnthropic(part: import('../canonical/content.js').CanonicalToolResultPart): AnthropicToolResultBlock {
  return {
    type: 'tool_result',
    tool_use_id: part.toolCallId,
    content: part.content,
    is_error: part.isError,
  };
}
