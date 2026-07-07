// 8Router — OpenAI Content Part Conversion
// Phase 1B: Convert between OpenAI content parts and CanonicalContentPart

import type { CanonicalContentPart, CanonicalImagePart } from '../canonical/content.js';
import type { OpenAIContentPart } from './types.js';
import type { CanonicalError } from '../canonical/errors.js';

/**
 * Convert OpenAI content to canonical content parts.
 * String content → single text part.
 * Array content → mapped per type.
 */
export function openaiContentToCanonical(
  content: string | OpenAIContentPart[] | null | undefined,
): CanonicalContentPart[] {
  if (content === null || content === undefined) return [];
  if (typeof content === 'string') return [{ type: 'text', text: content }];

  return content.map(openaiContentPartToCanonical);
}

/**
 * Convert a single OpenAI content part to canonical.
 */
function openaiContentPartToCanonical(part: OpenAIContentPart): CanonicalContentPart {
  if (part.type === 'text') {
    return { type: 'text', text: part.text };
  }

  if (part.type === 'image_url') {
    return openaiImageToCanonical(part);
  }

  // Unknown content part type — we don't silently drop
  throw {
    code: 'unsupported_content_type',
    message: `Unsupported content part type: ${(part as { type: string }).type}`,
    fieldPath: `messages[].content[].type:${(part as { type: string }).type}`,
    retryable: false,
    sanitized: true,
  } satisfies CanonicalError;
}

/**
 * Convert OpenAI image_url to CanonicalImagePart.
 * Handles both URL and base64 data URLs.
 */
function openaiImageToCanonical(
  part: { type: 'image_url'; image_url: { url: string; detail?: string } },
): CanonicalImagePart {
  const url = part.image_url.url;

  if (!url || typeof url !== 'string') {
    throw {
      code: 'invalid_image_url',
      message: 'Image URL is missing or invalid',
      fieldPath: 'messages[].content[].image_url.url',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  // Detect base64 data URL
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw {
        code: 'malformed_data_url',
        message: 'Base64 data URL is malformed. Expected format: data:<mediaType>;base64,<data>',
        fieldPath: 'messages[].content[].image_url.url',
        retryable: false,
        sanitized: true,
      } satisfies CanonicalError;
    }

    return {
      type: 'image',
      source: { type: 'base64', data: match[2], mediaType: match[1] },
      detail: part.image_url.detail as CanonicalImagePart['detail'],
    };
  }

  // Regular URL
  return {
    type: 'image',
    source: { type: 'url', url },
    detail: part.image_url.detail as CanonicalImagePart['detail'],
  };
}

/**
 * Convert canonical content parts back to OpenAI format.
 * Text parts → string if single text part, array otherwise.
 * Image parts → image_url format.
 */
export function canonicalContentToOpenai(
  parts: CanonicalContentPart[],
): string | OpenAIContentPart[] | null {
  if (parts.length === 0) return null;

  // Single text part → simplify to string
  if (parts.length === 1 && parts[0].type === 'text') {
    return parts[0].text;
  }

  return parts.map(canonicalPartToOpenai);
}

/**
 * Convert a single canonical content part to OpenAI format.
 */
function canonicalPartToOpenai(part: CanonicalContentPart): OpenAIContentPart {
  if (part.type === 'text') {
    return { type: 'text', text: part.text };
  }

  if (part.type === 'image') {
    return canonicalImageToOpenai(part);
  }

  if (part.type === 'tool_use') {
    // tool_use parts are handled separately in message serialization
    // This should not be called for tool_use — skip
    return { type: 'text', text: '' };
  }

  if (part.type === 'tool_result') {
    // tool_result handled at message level
    return { type: 'text', text: part.content };
  }

  if (part.type === 'thinking') {
    // thinking is not part of OpenAI content — skip
    return { type: 'text', text: '' };
  }

  return { type: 'text', text: '' };
}

/**
 * Convert CanonicalImagePart back to OpenAI image_url format.
 */
function canonicalImageToOpenai(img: CanonicalImagePart): OpenAIContentPart {
  if (img.source.type === 'base64') {
    const dataUrl = `data:${img.source.mediaType};base64,${img.source.data}`;
    return {
      type: 'image_url',
      image_url: { url: dataUrl, detail: img.detail },
    };
  }

  return {
    type: 'image_url',
    image_url: { url: img.source.url, detail: img.detail },
  };
}
