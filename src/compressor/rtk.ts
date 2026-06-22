// 8Router — RTK Token Compression
// Compresses tool output (git diff, grep, ls, find, tree, shell output)
// to reduce input tokens by 20-40%

import { CompressionConfig } from '../types.js';

interface CompressionResult {
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savedPercent: number;
}

// Estimate token count (~4 chars per token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Remove line numbers from tool output (e.g., "123|content" → "content")
function removeLineNumbers(text: string): string {
  // Pattern: leading digits followed by | or : or tab
  return text.replace(/^\s*\d{1,6}[\s|:]+/gm, '');
}

// Collapse excessive whitespace
function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+$/gm, '')        // trailing spaces
    .replace(/\n{3,}/g, '\n\n')       // 3+ newlines → 2
    .replace(/[ \t]{2,}/g, ' ')       // 2+ spaces → 1 (except leading)
    ;
}

// Compress git diff output
function compressDiff(text: string): string {
  return text
    .replace(/^diff --git .+$/gm, '')           // remove diff header
    .replace(/^index [a-f0-9]+\.\.[a-f0-9]+ .+$/gm, '') // remove index line
    .replace(/^--- a\/.*/gm, '--- ')             // shorten paths
    .replace(/^\+\+\+ b\/.*/gm, '+++ ')
    .replace(/^@@ .+ @@.*$/gm, '@@')             // shorten hunk headers
    .replace(/^\s*$/gm, '')                       // remove empty lines in diff
    ;
}

// Compress grep/search output
function compressGrep(text: string): string {
  // Remove file path prefixes that repeat
  const lines = text.split('\n');
  const result: string[] = [];
  let lastFile = '';

  for (const line of lines) {
    const fileMatch = line.match(/^(.+?)(?::|\|)(\d+)(?::|\|)?(.*)$/);
    if (fileMatch) {
      const [, file, lineNum, content] = fileMatch;
      if (file !== lastFile) {
        result.push(`[${file}]`);
        lastFile = file;
      }
      result.push(`${lineNum}:${content.trim()}`);
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// Compress ls/tree output
function compressTree(text: string): string {
  return text
    .replace(/^(│   |    |├── |└── )+/gm, (match) => {
      // Keep structure but shorten indentation
      return match.replace(/    /g, '  ').replace(/│   /g, '│ ');
    })
    .replace(/^\s*total \d+$/gm, '')              // remove ls total line
    .replace(/^[\w-]+\s+\d+\s+\w+\s+\w+\s+/gm, '') // simplify ls -l
    ;
}

// Compress numbered read output (cat -n style)
function compressNumberedRead(text: string): string {
  return text.replace(/^\s*(\d+)\s{2}/gm, '$1|');
}

// Detect and compress tool output type
function compressToolOutput(text: string, config: CompressionConfig['rtk']): string {
  let result = text;

  // Auto-detect content type
  if (text.includes('diff --git') || text.startsWith('--- a/')) {
    result = compressDiff(result);
  } else if (/^(.+?):\d+:/m.test(text)) {
    result = compressGrep(result);
  } else if (text.includes('├── ') || text.includes('└── ') || text.startsWith('total ')) {
    result = compressTree(result);
  } else if (/^\s*\d{1,6}\s{2}/m.test(text)) {
    result = compressNumberedRead(result);
  }

  if (config.removeLineNumbers) {
    result = removeLineNumbers(result);
  }

  if (config.collapseWhitespace) {
    result = collapseWhitespace(result);
  }

  // Truncate if too long
  const maxTokens = config.maxToolOutputTokens;
  if (estimateTokens(result) > maxTokens) {
    const maxChars = maxTokens * 4;
    result = result.slice(0, maxChars) + '\n... [truncated]';
  }

  return result;
}

// Caveman mode: inject terse system prompt
function getCavemanPrompt(level: number): string {
  const prompts: Record<number, string> = {
    1: 'Be concise. Skip pleasantries.',
    2: 'Be terse. Short sentences. No explanations unless asked.',
    3: 'Answer in minimal tokens. Code > words. Skip markdown formatting unless needed.',
    4: 'Maximum compression. Single words where possible. Code only. No prose.',
    5: 'rtk: respond with absolute minimum tokens. fragments ok. skip all formatting.',
  };
  return prompts[level] || prompts[3];
}

// Main compression function
export function compress(
  messages: { role: string; content: string | null }[],
  config: CompressionConfig
): { messages: { role: string; content: string | null }[]; savedTokens: number } {
  let totalSaved = 0;
  let compressedSystemInjected = false;

  const result = messages.map(msg => {
    if (!msg.content) return msg;

    const originalTokens = estimateTokens(msg.content);

    // Compress tool output in user/tool messages
    if (config.rtk.enabled && config.rtk.compressToolOutput && (msg.role === 'user' || msg.role === 'tool')) {
      const compressed = compressToolOutput(msg.content, config.rtk);
      const newTokens = estimateTokens(compressed);
      totalSaved += originalTokens - newTokens;
      return { ...msg, content: compressed };
    }

    return msg;
  });

  // Inject caveman system prompt
  if (config.caveman.enabled && !compressedSystemInjected) {
    const cavemanMsg = {
      role: 'system',
      content: getCavemanPrompt(config.caveman.level),
    };
    const systemIdx = result.findIndex(m => m.role === 'system');
    if (systemIdx >= 0) {
      result[systemIdx] = {
        ...result[systemIdx],
        content: `${result[systemIdx].content}\n\n${cavemanMsg.content}`,
      };
    } else {
      result.unshift(cavemanMsg);
    }
  }

  return { messages: result, savedTokens: totalSaved };
}

export { estimateTokens, CompressionResult };
