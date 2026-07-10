// 8Router — Security/Credentials Barrel Exports

export { encrypt, decrypt, isEncrypted, assertEncryptionReady } from './encrypt.js';
export { maskCredential, redactSecrets, sanitizeError } from './redact.js';
export {
  getAllCredentials,
  getCredentialsByProvider,
  getCredentialById,
  getDecryptedCredential,
  createCredential,
  updateCredential,
  deleteCredential,
  setCredentialStatus,
  type SafeCredential,
  type CreateCredentialInput,
  type UpdateCredentialInput,
} from './credential-manager.js';
export {
  PROVIDER_SECURITY_META,
  getProviderMeta,
  isProviderConfigurable,
  type ProviderSecurityMeta,
} from './provider-meta.js';
export {
  testProviderConnection,
  type TestResult,
} from './test-connection.js';
