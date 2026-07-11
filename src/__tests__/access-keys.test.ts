// 8Router — Access Keys Tests (Phase 2B)
// Tests key generation, hashing, masking, validation, and management.

import { generateAccessKey } from '../security/access-keys/generate.js';
import { hashAccessKey, verifyAccessKey, assertAccessKeyHashReady } from '../security/access-keys/hash.js';
import { maskAccessKey } from '../security/access-keys/mask.js';
import {
  createAccessKey,
  listAccessKeys,
  getAccessKeyById,
  updateAccessKey,
  revokeAccessKey,
  rotateAccessKey,
  deleteAccessKey,
} from '../security/access-keys/manager.js';
import { validateAccessKey } from '../security/access-keys/validate.js';
import { getDB } from '../database.js';

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

function assertNotIncludes(str: string, substr: string, label: string): void {
  assert(!str.includes(substr), label);
}

export function runAccessKeyTests(): void {
  console.log('Access Keys Tests\n');

  // ─── Hashing ──────────────────────────────────────────────────────
  console.log(' Hashing:');
  assertAccessKeyHashReady();

  const rawKey1 = 'sk-8router_test1234567890abcdef1234567890';
  const rawKey2 = 'sk-8router_test9876543210fedcba9876543210';

  const hash1 = hashAccessKey(rawKey1);
  assert(hash1.length === 64, 'hash is 64 hex chars (SHA256)');
  assert(hash1 !== rawKey1, 'hash !== raw key');

  const hash2 = hashAccessKey(rawKey2);
  assert(hash1 !== hash2, 'different keys produce different hashes');

  // Same key, same hash (deterministic with same secret)
  const hash1b = hashAccessKey(rawKey1);
  assert(hash1 === hash1b, 'same key produces same hash (HMAC)');

  assert(verifyAccessKey(rawKey1, hash1), 'verify succeeds for correct key');
  assert(!verifyAccessKey(rawKey1, hash2), 'verify fails for wrong hash');
  assert(!verifyAccessKey(rawKey2, hash1), 'verify fails for wrong key');

  // ─── Generation ───────────────────────────────────────────────────
  console.log('\n Generation:');
  const gen1 = generateAccessKey();
  assert(gen1.rawKey.startsWith('sk-8router_'), 'raw key starts with sk-8router_');
  assert(gen1.rawKey.length >= 50, `raw key has sufficient length (${gen1.rawKey.length})`);
  assert(gen1.keyPrefix.startsWith('sk-8router_'), 'key prefix starts with sk-8router_');
  assert(gen1.keyPrefix.length === 20, 'key prefix is 20 chars');
  assert(gen1.keyHint.includes('...'), 'key hint includes ellipsis');

  const gen2 = generateAccessKey();
  assert(gen1.rawKey !== gen2.rawKey, 'generated keys are unique');

  // ─── Masking ──────────────────────────────────────────────────────
  console.log('\n Masking:');
  assert(maskAccessKey(gen1.rawKey).startsWith('sk-8router_'), 'masked starts with prefix');
  assert(maskAccessKey(gen1.rawKey).includes('...'), 'masked includes ellipsis');
  assert(maskAccessKey('short') === '****', 'short string returns ****');
  assert(maskAccessKey('') === '****', 'empty returns ****');
  assert(maskAccessKey('http://localhost:11434') === 'localhost:11434', 'URL returns hostname:port');

  // ─── CRUD ─────────────────────────────────────────────────────────
  console.log('\n CRUD:');

  // Create
  const created = createAccessKey({
    name: 'Test Key',
    projectName: 'My Project',
    routingMode: 'auto',
    allowedProviders: ['openai', 'gemini'],
    allowedModels: ['8router/auto'],
  });
  assert(created.rawKey.startsWith('sk-8router_'), 'create returns raw key');
  assert(created.accessKey.id.length > 0, 'create returns id');
  assert(created.accessKey.name === 'Test Key', 'create returns name');
  assert(created.accessKey.status === 'active', 'create returns active status');
  assert(created.accessKey.isEnabled === true, 'create returns enabled');
  assert(created.accessKey.defaultModelAlias === '8router/auto', 'default model alias is 8router/auto');
  assert(created.accessKey.routingMode === 'auto', 'routing mode is auto');
  assert(created.accessKey.allowedProviders.includes('openai'), 'allowed providers stored');
  assert(created.accessKey.allowedModels.includes('8router/auto'), 'allowed models stored');
  assert(created.accessKey.keyHint.startsWith('sk-8router_'), 'key hint starts with prefix');
  assertNotIncludes(JSON.stringify(created.accessKey), created.rawKey, 'safe response does NOT contain raw key');

  // List
  const listed = listAccessKeys();
  assert(listed.length >= 1, 'list returns keys');
  const found = listed.find(k => k.id === created.accessKey.id);
  assert(!!found, 'created key appears in list');
  assertNotIncludes(JSON.stringify(listed), created.rawKey, 'list does NOT contain raw key');
  assertNotIncludes(JSON.stringify(listed), 'keyHash', 'list does NOT contain keyHash');

  // Get by ID
  const fetched = getAccessKeyById(created.accessKey.id);
  assert(fetched !== null, 'get by id returns key');
  assertNotIncludes(JSON.stringify(fetched), created.rawKey, 'get by id does NOT contain raw key');
  assertNotIncludes(JSON.stringify(fetched), 'keyHash', 'get by id does NOT contain keyHash');

  // Update
  const updated = updateAccessKey(created.accessKey.id, {
    name: 'Updated Key',
    projectName: 'Updated Project',
    allowedProviders: ['openai', 'anthropic'],
    routingMode: 'cheap',
  });
  assert(updated !== null, 'update returns key');
  assert(updated!.name === 'Updated Key', 'update applies name change');
  assert(updated!.projectName === 'Updated Project', 'update applies project change');
  assert(updated!.routingMode === 'cheap', 'update applies routing mode');
  assert(updated!.allowedProviders.includes('anthropic'), 'update applies allowed providers');

  // Enable/Disable
  const disabled = updateAccessKey(created.accessKey.id, { isEnabled: false });
  assert(disabled!.isEnabled === false, 'disable works');
  const enabled = updateAccessKey(created.accessKey.id, { isEnabled: true });
  assert(enabled!.isEnabled === true, 'enable works');

  // ─── Validation ───────────────────────────────────────────────────
  console.log('\n Validation:');

  // Active key validates
  const validated = validateAccessKey(created.rawKey);
  assert(validated.valid === true, 'active key validates');
  if (validated.valid) {
    assert(validated.accessKeyId === created.accessKey.id, 'validation returns correct id');
    assert(validated.name === 'Updated Key', 'validation returns correct name');
    assert(validated.defaultModelAlias === '8router/auto', 'validation returns default model');
    assert(validated.routingMode === 'cheap', 'validation returns routing mode');
    assert(validated.allowedProviders.includes('openai'), 'validation returns allowed providers');
  }

  // Invalid format
  const invalidFormat = validateAccessKey('invalid-key');
  assert(invalidFormat.valid === false, 'invalid format returns invalid');
  assert(!invalidFormat.valid && invalidFormat.reason === 'invalid_format', 'reason is invalid_format');

  // Missing key
  const missing = validateAccessKey('');
  assert(missing.valid === false, 'empty key returns invalid');
  assert(!missing.valid && missing.reason === 'missing', 'reason is missing');

  // Wrong key (valid format but not in DB)
  const wrongKey = validateAccessKey('sk-8router_000000000000000000000000000000000000000000000000000000000000000000000000');
  assert(wrongKey.valid === false, 'wrong key returns invalid');
  assert(!wrongKey.valid && wrongKey.reason === 'not_found', 'reason is not_found');

  // Disabled key fails
  updateAccessKey(created.accessKey.id, { isEnabled: false });
  const disabledResult = validateAccessKey(created.rawKey);
  assert(disabledResult.valid === false, 'disabled key fails validation');
  assert(!disabledResult.valid && disabledResult.reason === 'disabled', 'reason is disabled');
  updateAccessKey(created.accessKey.id, { isEnabled: true }); // re-enable

  // Revoked key fails
  const revoked = revokeAccessKey(created.accessKey.id);
  assert(revoked === true, 'revoke returns true');
  const revokedResult = validateAccessKey(created.rawKey);
  assert(revokedResult.valid === false, 'revoked key fails validation');
  assert(!revokedResult.valid && revokedResult.reason === 'revoked', 'reason is revoked');

  // ─── Rotate ───────────────────────────────────────────────────────
  console.log('\n Rotate:');
  // Create a new key for rotation test
  const rotKey = createAccessKey({ name: 'Rotate Test' });
  const oldRaw = rotKey.rawKey;

  const rotated = rotateAccessKey(rotKey.accessKey.id);
  assert(rotated !== null, 'rotate returns result');
  assert(rotated!.rawKey.startsWith('sk-8router_'), 'rotate returns new raw key');
  assert(rotated!.rawKey !== oldRaw, 'rotate produces different raw key');

  // Old key should fail
  const oldResult = validateAccessKey(oldRaw);
  assert(oldResult.valid === false, 'old key fails after rotation');

  // New key should pass
  const newResult = validateAccessKey(rotated!.rawKey);
  assert(newResult.valid === true, 'new key validates after rotation');

  // ─── Delete ───────────────────────────────────────────────────────
  console.log('\n Delete:');
  const delKey = createAccessKey({ name: 'Delete Test' });
  const deleted = deleteAccessKey(delKey.accessKey.id);
  assert(deleted === true, 'delete returns true');
  const afterDelete = getAccessKeyById(delKey.accessKey.id);
  assert(afterDelete === null, 'deleted key not found');

  // ─── Expired Key ──────────────────────────────────────────────────
  console.log('\n Expiration:');
  const pastDate = '2020-01-01T00:00:00.000Z';
  const expiredKey = createAccessKey({ name: 'Expired Key', expiresAt: pastDate });
  const expiredResult = validateAccessKey(expiredKey.rawKey);
  assert(expiredResult.valid === false, 'expired key fails validation');
  assert(!expiredResult.valid && expiredResult.reason === 'expired', 'reason is expired');

  // ─── Cleanup ──────────────────────────────────────────────────────
  console.log('\n Cleanup:');
  // Clean up all test keys
  const allKeys = listAccessKeys();
  let cleanupCount = 0;
  for (const k of allKeys) {
    deleteAccessKey(k.id);
    cleanupCount++;
  }
  assert(cleanupCount >= 0, `cleaned up ${cleanupCount} test keys`);

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Run directly
runAccessKeyTests();
