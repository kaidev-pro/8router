// 8Router — Provider Credentials Tests (Phase 2A)
// Tests encryption, masking, redaction, credential CRUD, and provider metadata.

import { encrypt, decrypt, isEncrypted, assertEncryptionReady } from '../security/credentials/encrypt.js';
import { maskCredential, redactSecrets, sanitizeError, looksLikeSecret } from '../security/credentials/redact.js';
import { getProviderMeta, isProviderConfigurable, PROVIDER_SECURITY_META } from '../security/credentials/provider-meta.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.log(`   ❌ ${label}`);
    failed++;
  }
}

function assertIncludes(str: string, substr: string, label: string): void {
  assert(str.includes(substr), label);
}

function assertNotIncludes(str: string, substr: string, label: string): void {
  assert(!str.includes(substr), label);
}

export function runProviderCredentialsTests(): void {
  console.log('Provider Credentials Tests\n');

  // ─── Encryption ─────────────────────────────────────────────────────
  console.log(' Encryption:');
  assertEncryptionReady();

  const key1 = 'sk-proj-abc123456789xyz';
  const enc1 = encrypt(key1);
  assert(isEncrypted(enc1), 'isEncrypted returns true for encrypted value');
  assertNotIncludes(enc1, key1, 'encrypted value does not contain plaintext');
  assert(enc1.startsWith('enc:v1:'), 'encrypted value has version prefix');

  const dec1 = decrypt(enc1);
  assert(dec1 === key1, 'decrypt returns original plaintext');

  // Same plaintext should produce different ciphertext (random IV)
  const enc2 = encrypt(key1);
  assert(enc1 !== enc2, 'same plaintext produces different ciphertext (random IV)');
  assert(decrypt(enc2) === key1, 'second ciphertext also decrypts correctly');

  // Empty string
  const encEmpty = encrypt('');
  assert(decrypt(encEmpty) === '', 'empty string encrypts/decrypts');

  // Long key
  const longKey = 'A'.repeat(200);
  assert(decrypt(encrypt(longKey)) === longKey, 'long key encrypts/decrypts');

  // ─── Masking ────────────────────────────────────────────────────────
  console.log('\n Masking:');
  assert(maskCredential(key1).startsWith('sk-p'), 'mask: starts with prefix');
  assert(maskCredential(key1).includes('...'), 'mask: includes ellipsis');
  assert(maskCredential(key1).endsWith('xyz'), 'mask: ends with last 4');
  assert(maskCredential(key1).length < key1.length, 'mask: shorter than original');
  assert(maskCredential('short') === '****', 'mask: short string returns ****');
  assert(maskCredential('') === '****', 'mask: empty returns ****');
  assert(maskCredential('http://localhost:11434') === 'localhost:11434', 'mask: URL returns hostname:port');
  assert(maskCredential('https://api.openai.com/v1/models') === 'api.openai.com', 'mask: HTTPS URL returns hostname');
  assert(maskCredential('AIzaSyDxxxxxabcd').startsWith('AIza'), 'mask: Gemini key prefix');
  assert(maskCredential('AIzaSyDxxxxxabcd').endsWith('abcd'), 'mask: Gemini key suffix');

  // ─── Redaction ──────────────────────────────────────────────────────
  console.log('\n Redaction:');
  assertIncludes(redactSecrets('Bearer sk-proj-abc123456789xyz1234'), '[REDACTED]', 'redacts Bearer token');
  assertIncludes(redactSecrets('/api?key=sk-1234567890abcdef1234'), '[REDACTED]', 'redacts key= param in URL');
  assertIncludes(redactSecrets('AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxxxxx'), '[REDACTED]', 'redacts Gemini key');
  assertNotIncludes(redactSecrets('Bearer sk-proj-abc123456789xyz1234'), 'abc123456789xyz1234', 'redacted value no longer contains secret');
  assert(redactSecrets('no secrets here') === 'no secrets here', 'no-op when no secrets');

  // Sanitize error
  const err = sanitizeError(new Error('Auth failed with sk-proj-abc123456789xyz12345'));
  assertNotIncludes(err, 'abc123456789xyz12345', 'sanitizeError redacts secrets from error');
  assert(err.length <= 500, 'sanitizeError truncates to 500 chars');

  // looksLikeSecret
  assert(looksLikeSecret('sk-proj-abc123456789xyz'), 'detects OpenAI key as secret');
  assert(looksLikeSecret('AIzaSyDxxxxxxxxxxxxxxxxxx'), 'detects Gemini key as secret');
  assert(!looksLikeSecret('http://localhost:11434'), 'does not flag URL as secret');
  assert(!looksLikeSecret('hello'), 'does not flag short string as secret');
  assert(!looksLikeSecret(''), 'does not flag empty as secret');

  // ─── Provider Metadata ──────────────────────────────────────────────
  console.log('\n Provider Metadata:');
  assert(PROVIDER_SECURITY_META.length >= 12, `registry has ${PROVIDER_SECURITY_META.length} providers (>=12)`);

  const openai = getProviderMeta('openai');
  assert(openai !== undefined, 'openai meta exists');
  assert(openai!.name === 'OpenAI', 'openai name correct');
  assert(openai!.defaultBaseUrl.includes('api.openai.com'), 'openai default base URL');
  assert(openai!.supportsModelsEndpoint === true, 'openai supports models endpoint');
  assert(openai!.status === 'available', 'openai status is available');
  assert(openai!.requiresKey === true, 'openai requires key');

  const ollama = getProviderMeta('ollama');
  assert(ollama !== undefined, 'ollama meta exists');
  assert(ollama!.credentialType === 'local_endpoint', 'ollama credential type is local_endpoint');
  assert(ollama!.requiresKey === false, 'ollama does not require key');
  assert(ollama!.status === 'local', 'ollama status is local');

  const xai = getProviderMeta('xai');
  assert(xai !== undefined, 'xai meta exists');
  assert(xai!.status === 'coming_soon', 'xai status is coming_soon');

  assert(isProviderConfigurable('openai') === true, 'openai is configurable');
  assert(isProviderConfigurable('ollama') === true, 'ollama is configurable');
  assert(isProviderConfigurable('xai') === false, 'xai is NOT configurable (coming soon)');
  assert(getProviderMeta('nonexistent') === undefined, 'unknown provider returns undefined');

  // Check all providers have required fields
  for (const p of PROVIDER_SECURITY_META) {
    assert(!!p.id, `${p.id} has id`);
    assert(!!p.name, `${p.id} has name`);
    assert(!!p.defaultBaseUrl, `${p.id} has defaultBaseUrl`);
    assert(!!p.docsUrl, `${p.id} has docsUrl`);
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Run directly
runProviderCredentialsTests();
