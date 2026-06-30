// 8Router — Guardrails Module
// Prompt injection detection, API key/secret redaction, provider key leakage prevention

// ═══════════════════════════════════════════════
// GUARDRAIL CONFIGURATION (persisted in settings DB)
// ═══════════════════════════════════════════════

export interface GuardrailsConfig {
  enabled: boolean;
  blockPromptInjection: boolean;
  redactSecrets: boolean;
  preventKeyLeakage: boolean;
}

const DEFAULT_CONFIG: GuardrailsConfig = {
  enabled: true,
  blockPromptInjection: true,
  redactSecrets: true,
  preventKeyLeakage: true,
};

// In-memory cache synced with DB
let cachedConfig: GuardrailsConfig | null = null;

export function getGuardrailsConfig(): GuardrailsConfig {
  if (cachedConfig) return cachedConfig;
  let config: GuardrailsConfig = { ...DEFAULT_CONFIG };
  try {
    const db = require('./database.js');
    const raw = db.getSetting('guardrails_config');
    if (raw) {
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // fall back to defaults
  }
  cachedConfig = config;
  return config;
}

export function setGuardrailsConfig(config: Partial<GuardrailsConfig>): GuardrailsConfig {
  const current = getGuardrailsConfig();
  cachedConfig = { ...current, ...config };
  try {
    const db = require('./database.js');
    db.setSetting('guardrails_config', JSON.stringify(cachedConfig));
  } catch {
    // Non-critical, continue with in-memory
  }
  return cachedConfig;
}

// ═══════════════════════════════════════════════
// PROMPT INJECTION DETECTION
// ═══════════════════════════════════════════════

const INJECTION_PATTERNS: RegExp[] = [
  // Direct instruction override attempts
  /ignore\s+(all\s+)?(previous|prior|above|earlier|preceding)\s+(instructions|prompts|rules|guidelines|directives)/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/i,
  /forget\s+(everything|all|your)\s+(you\s+)?(were|have\s+been)\s+(told|instructed)/i,

  // System prompt extraction
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /what\s+(is|are)\s+your\s+(system\s+)?(prompt|instructions|rules)/i,
  /show\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions|rules)/i,
  /print\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /output\s+(the|your)\s+(system\s+)?prompt/i,
  /repeat\s+(the|your|everything\s+in)\s+(system\s+)?(prompt|instructions)/i,
  /copy\s+(the|your)\s+(system\s+)?(prompt|instructions)/i,

  // Role hijacking
  /you\s+are\s+now\s+(a|an|the)\s+(different|new|another)/i,
  /act\s+as\s+(if\s+)?you\s+(have\s+)?(no|zero)\s+(rules|restrictions|limitations)/i,
  /pretend\s+(you\s+)?(are|have|don.t)\s+(no|zero)\s+(rules|restrictions|guidelines)/i,
  /switch\s+to\s+(developer|admin|root|debug)\s+mode/i,
  /enter\s+(developer|admin|root|debug|god)\s+mode/i,
  /enable\s+(developer|admin|root|debug)\s+mode/i,

  // Jailbreak patterns
  /DAN\s+mode/i,
  /do\s+anything\s+now/i,
  /jailbreak/i,
  /bypass\s+(all\s+)?(safety|content|security|filter)/i,

  // Encoded/obfuscated injection attempts
  /\bbase64\b.*\bdecode\b/i,
  /\brot13\b/i,

  // Prompt injection via markdown/code
  /```.*ignore.*previous/si,
  /<script>.*ignore/si,
];

export interface InjectionCheckResult {
  blocked: boolean;
  patterns?: string[];
  reason?: string;
}

export function detectPromptInjection(text: string): InjectionCheckResult {
  const config = getGuardrailsConfig();
  if (!config.enabled || !config.blockPromptInjection) {
    return { blocked: false };
  }

  const matchedPatterns: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      matchedPatterns.push(pattern.source.slice(0, 60));
    }
  }

  if (matchedPatterns.length > 0) {
    return {
      blocked: true,
      patterns: matchedPatterns,
      reason: `Prompt injection detected: ${matchedPatterns.length} suspicious pattern(s) matched`,
    };
  }

  return { blocked: false };
}

// ═══════════════════════════════════════════════
// SECRET / API KEY REDACTION
// ═══════════════════════════════════════════════

// Common patterns for secrets in text
const SECRET_PATTERNS: { pattern: RegExp; replacement: string | ((match: string) => string) }[] = [
  // OpenAI
  { pattern: /sk-[A-Za-z0-9_-]{20,}/g, replacement: 'sk-***REDACTED***' },
  { pattern: /sk-proj-[A-Za-z0-9_-]{20,}/g, replacement: 'sk-proj-***REDACTED***' },
  // Anthropic
  { pattern: /sk-ant-[A-Za-z0-9_-]{20,}/g, replacement: 'sk-ant-***REDACTED***' },
  // Google
  { pattern: /AIza[A-Za-z0-9_-]{35}/g, replacement: 'AIza***REDACTED***' },
  // Azure
  { pattern: /[A-Za-z0-9]{32,40}(?=\s|$)/g, replacement: '***REDACTED***' },
  // Generic API key patterns
  { pattern: /(?:api[_-]?key|apikey|api[_-]?secret|access[_-]?key|secret[_-]?key|auth[_-]?token|bearer)\s*[:=]\s*['"]?[A-Za-z0-9_.-]{16,}['"]?/gi, replacement: (match: string) => {
    const eqIdx = match.search(/[:=]/);
    if (eqIdx >= 0) {
      return match.slice(0, eqIdx + 1) + ' ***REDACTED***';
    }
    return '***REDACTED***';
  }},
  // JWT tokens
  { pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, replacement: 'eyJ***.***.***REDACTED***' },
  // AWS keys
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: 'AKIA***REDACTED***' },
  // GitHub tokens
  { pattern: /ghp_[A-Za-z0-9]{36}/g, replacement: 'ghp_***REDACTED***' },
  { pattern: /gho_[A-Za-z0-9]{36}/g, replacement: 'gho_***REDACTED***' },
  { pattern: /github_pat_[A-Za-z0-9_]{22,}/g, replacement: 'github_pat_***REDACTED***' },
  // Slack tokens
  { pattern: /xoxb-[0-9A-Za-z-]+/g, replacement: 'xoxb-***REDACTED***' },
  { pattern: /xoxp-[0-9A-Za-z-]+/g, replacement: 'xoxp-***REDACTED***' },
  // Private keys
  { pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/g, replacement: '-----BEGIN PRIVATE KEY ***REDACTED***' },
];

export function redactSecrets(text: string): { text: string; redactedCount: number } {
  const config = getGuardrailsConfig();
  if (!config.enabled || !config.redactSecrets) {
    return { text, redactedCount: 0 };
  }

  let redactedCount = 0;
  let result = text;

  for (const { pattern, replacement } of SECRET_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    const matches = result.match(pattern);
    if (matches) {
      redactedCount += matches.length;
      pattern.lastIndex = 0;
      if (typeof replacement === 'function') {
        result = result.replace(pattern, replacement as any);
      } else {
        result = result.replace(pattern, replacement);
      }
    }
  }

  return { text: result, redactedCount };
}

// ═══════════════════════════════════════════════
// PROVIDER KEY LEAKAGE PREVENTION
// ═══════════════════════════════════════════════

// Known provider key prefixes for detection
const PROVIDER_KEY_PREFIXES = [
  'sk-', 'sk-ant-', 'sk-proj-', 'AIza', 'AKIA', 'ghp_', 'gho_',
  'xoxb-', 'xoxp-', 'Bearer ey', 'Token ',
];

export function detectProviderKeyLeakage(text: string): { leaked: boolean; patterns: string[] } {
  const config = getGuardrailsConfig();
  if (!config.enabled || !config.preventKeyLeakage) {
    return { leaked: false, patterns: [] };
  }

  const patterns: string[] = [];

  for (const prefix of PROVIDER_KEY_PREFIXES) {
    if (text.includes(prefix)) {
      patterns.push(`Provider key prefix detected: "${prefix}"`);
    }
  }

  // Check for env variable references that might leak keys
  const envVarPattern = /(?:process\.env|os\.environ|ENV)\[['"]?([A-Z_]+(?:_KEY|_TOKEN|_SECRET|_PASSWORD))['"]?\]/g;
  let envMatch;
  while ((envMatch = envVarPattern.exec(text)) !== null) {
    patterns.push(`Environment variable reference detected: ${envMatch[0]}`);
  }

  return { leaked: patterns.length > 0, patterns };
}

// ═══════════════════════════════════════════════
// INPUT/OUTPUT FILTERING (main entry point)
// ═══════════════════════════════════════════════

export interface GuardrailsResult {
  allowed: boolean;
  reason?: string;
  injectionBlocked?: boolean;
  secretsRedacted?: number;
  keyLeakageDetected?: boolean;
}

export function applyGuardrails(input: { messages?: any[]; content?: string }): GuardrailsResult {
  const config = getGuardrailsConfig();
  if (!config.enabled) {
    return { allowed: true };
  }

  // Extract text from messages or direct content
  let text = '';
  if (input.content) {
    text = input.content;
  } else if (input.messages && Array.isArray(input.messages)) {
    text = input.messages
      .filter((m: any) => m.content && typeof m.content === 'string')
      .map((m: any) => m.content)
      .join('\n');
  }

  if (!text) return { allowed: true };

  // 1. Check prompt injection
  if (config.blockPromptInjection) {
    const injectionResult = detectPromptInjection(text);
    if (injectionResult.blocked) {
      return {
        allowed: false,
        reason: injectionResult.reason,
        injectionBlocked: true,
      };
    }
  }

  // 2. Check provider key leakage
  if (config.preventKeyLeakage) {
    const leakageResult = detectProviderKeyLeakage(text);
    if (leakageResult.leaked) {
      return {
        allowed: false,
        reason: `Provider key leakage detected: ${leakageResult.patterns.join('; ')}`,
        keyLeakageDetected: true,
      };
    }
  }

  // 3. Redact secrets (non-blocking, just cleans output)
  let secretsRedacted = 0;
  if (config.redactSecrets) {
    const redacted = redactSecrets(text);
    secretsRedacted = redacted.redactedCount;
  }

  return {
    allowed: true,
    secretsRedacted,
  };
}

// Reset cached config (useful for testing)
export function resetGuardrailsCache(): void {
  cachedConfig = null;
}
