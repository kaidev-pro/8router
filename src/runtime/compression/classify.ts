// 8Router — Content Classifier (Phase 2F)
// Conservative classification for tool output content
// Unknown content is never compressed

import type { ContentKind } from './types.js';

const STACK_FRAMES = /^\s+at\s+\S+/;
const STACK_ERROR = /^(\w+Error|\w+Exception|Error|Exception|PanicError)/;
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

const TEST_PASS = /\d+ passing|✓|PASS|ok \d+/;
const TEST_FAIL = /\d+ failing|✗|FAIL|not ok \d+/;
const TEST_COUNT = /Tests:\s+\d+\s+(passed|failed|skipped)/;

const LINT_PATTERN = /^\S+:\d+:\d+:\s+(error|warning|info)\s+\w+/;

const DIR_PATTERN = /^(├──|└──|│|┌──|╔|╚|├|├─|└─|│  |\s{2,}[├└│])/;
const TREE_DEEP = /^(\s{2,})([├└│─])/;

const GREP_HEADER = /^(Binary file|==\d+==|grep:|rg:|ripgrep:)/;
const GREP_LINE = /^([^:]+):(\d+):/;

const GIT_DIFF_STAT = /^diff --git/;
const GIT_FILE = /^\+\+\+ b\//;
const GIT_HUNK = /^@@\s+-\d+/;

const PROGRESS = /^(Download|Upload|Installing|Compiling|Building|Processing|Loading|Fetching)\s/i;
const PROGRESS_PCT = /\d+(\.\d+)?%/;
const PROGRESS_SPINNER = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏|\\/-]/;

export function classifyContent(content: string): ContentKind {
  if (!content || content.length < 5) return 'unknown';

  const stripped = content.replace(ANSI_RE, '');

  // Structured JSON
  const trimmed = stripped.trimStart();
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) return 'structured_json';
    } catch {
      // Not valid JSON, continue
    }
  }

  // Source code detection
  if (
    /^(import |export |from |const |let |var |function |class |interface |type |enum |module\.exports|require\(|def |if __name__|#!\/)/.test(trimmed) ||
    (/;\s*$/.test(stripped.split('\n')[0] || '')) ||
    (/^\s*\{[\s\S]+\}\s*$/.test(stripped) && (stripped.includes('function') || stripped.includes('=>')))
  ) {
    return 'source_code';
  }

  const lines = stripped.split('\n');
  const lineCount = lines.length;

  // Stack trace detection
  let stackFrameCount = 0;
  for (const line of lines.slice(0, 20)) {
    if (STACK_FRAMES.test(line)) stackFrameCount++;
  }
  if (stackFrameCount >= 2) return 'stack_trace';
  if (lineCount > 3 && STACK_ERROR.test(lines[0] || '')) return 'stack_trace';

  // Test output
  let testLines = 0;
  for (const line of lines) {
    if (TEST_PASS.test(line) || TEST_FAIL.test(line) || TEST_COUNT.test(line)) testLines++;
  }
  if (testLines >= 2) return 'test_output';

  // Lint output
  let lintLines = 0;
  for (const line of lines.slice(0, 30)) {
    if (LINT_PATTERN.test(line.trim())) lintLines++;
  }
  if (lintLines >= 2) return 'lint_output';

  // Directory tree
  let dirLines = 0;
  for (const line of lines.slice(0, 50)) {
    if (DIR_PATTERN.test(line) || TREE_DEEP.test(line)) dirLines++;
  }
  if (dirLines >= 3) return 'directory_tree';

  // Grep output
  let grepLines = 0;
  for (const line of lines.slice(0, 30)) {
    if (GREP_HEADER.test(line) || GREP_LINE.test(line.trim())) grepLines++;
  }
  if (grepLines >= 2) return 'grep_output';

  // Git diff
  let diffLines = 0;
  for (const line of lines.slice(0, 50)) {
    if (GIT_DIFF_STAT.test(line) || GIT_FILE.test(line) || GIT_HUNK.test(line)) diffLines++;
  }
  if (diffLines >= 2) return 'git_diff';

  // Terminal log (generic)
  let progressLines = 0;
  for (const line of lines) {
    if (PROGRESS.test(line) || PROGRESS_PCT.test(line) || PROGRESS_SPINNER.test(line)) progressLines++;
  }
  if (progressLines >= 3 && lineCount >= 10) return 'terminal_log';

  return 'unknown';
}
