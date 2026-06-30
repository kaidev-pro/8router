/**
 * client.js — HTTP API client for 8Router using native `node:http`.
 *
 * Base URL: http://localhost:8080
 * All endpoints are documented in the 8Router API spec.
 */

import http from "node:http";

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  host: "localhost",
  port: 8080,
  protocol: "http:",
  timeout: 30000, // 30 s
};

let config = { ...DEFAULT_CONFIG };

/**
 * Override default configuration.
 * @param {Object} options – { host?, port?, protocol?, timeout? }
 */
export function configure(options = {}) {
  config = { ...config, ...options };
}

// ─── Core HTTP request ──────────────────────────────────────────────────────

/**
 * Make an HTTP request to the 8Router API.
 * @param {string} method  – HTTP method (GET, POST, DELETE, …)
 * @param {string} path    – API path (e.g. "/8router/providers")
 * @param {Object} [body]  – Request body (serialised to JSON)
 * @returns {Promise<{success: boolean, data?: any, error?: string, statusCode?: number}>}
 */
function makeRequest(method, path, body = null) {
  return new Promise((resolve) => {
    const reqOptions = {
      hostname: config.host,
      port: config.port,
      path,
      method,
      headers: { "Content-Type": "application/json" },
      timeout: config.timeout,
    };

    // Set Content-Length for POST / PUT / PATCH with body
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      const bodyString = JSON.stringify(body);
      reqOptions.headers["Content-Length"] = Buffer.byteLength(bodyString);
    }

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400 || parsed.error) {
            resolve({
              success: false,
              error: parsed.error ?? `HTTP ${res.statusCode}`,
              statusCode: res.statusCode,
            });
          } else {
            resolve({
              success: true,
              data: parsed,
              statusCode: res.statusCode,
            });
          }
        } catch (err) {
          resolve({
            success: false,
            error: `Failed to parse response: ${err.message}`,
          });
        }
      });
    });

    req.on("error", (err) => {
      resolve({
        success: false,
        error: `Network error: ${err.message}`,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ success: false, error: "Request timeout" });
    });

    // Write body if present
    if (body && ["POST", "PUT", "PATCH"].includes(method)) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

/**
 * @param {string} path – API path
 * @returns {Promise<{success, data?, error?}>}
 */
export async function get(path) {
  return makeRequest("GET", path);
}

/**
 * @param {string} path – API path
 * @param {Object} body – Request body
 * @returns {Promise<{success, data?, error?}>}
 */
export async function post(path, body) {
  return makeRequest("POST", path, body);
}

/**
 * @param {string} path – API path
 * @returns {Promise<{success, data?, error?}>}
 */
export async function del(path) {
  return makeRequest("DELETE", path);
}

// ─── Providers ───────────────────────────────────────────────────────────────

/** Get all providers. */
export async function getProviders() {
  return makeRequest("GET", "/8router/providers");
}

/** Get provider health status. */
export async function getProviderHealth() {
  return makeRequest("GET", "/8router/health");
}

/** Get API key pool info. */
export async function getApiKeyPool() {
  return makeRequest("GET", "/8router/key-pool");
}

// ─── API Keys ────────────────────────────────────────────────────────────────

/** Get all API keys. */
export async function getApiKeys() {
  return makeRequest("GET", "/8router/api-keys");
}

/**
 * Create a new API key.
 * @param {string} name – Key name / label
 */
export async function createApiKey(name) {
  return makeRequest("POST", "/8router/api-keys", { name });
}

/**
 * Delete an API key.
 * @param {string} id – Key ID
 */
export async function deleteApiKey(id) {
  return makeRequest("DELETE", `/8router/api-keys/${id}`);
}

// ─── Combos ──────────────────────────────────────────────────────────────────

/** Get all model combos. */
export async function getCombos() {
  return makeRequest("GET", "/8router/combos");
}

/**
 * Create a new combo.
 * @param {Object} data – { name: string, models: string[] }
 */
export async function createCombo(data) {
  return makeRequest("POST", "/8router/combos", data);
}

// ─── Settings ────────────────────────────────────────────────────────────────

/** Get all settings. */
export async function getSettings() {
  return makeRequest("GET", "/8router/settings");
}

/**
 * Update a single setting.
 * @param {Object} data – { key: string, value: any }
 */
export async function updateSettings(data) {
  return makeRequest("POST", "/8router/settings", data);
}

// ─── Stats & Info ────────────────────────────────────────────────────────────

/** Get usage statistics. */
export async function getStats() {
  return makeRequest("GET", "/8router/stats");
}

/** Get detailed usage data. */
export async function getUsage() {
  return makeRequest("GET", "/8router/usage");
}

/** Get log entries. */
export async function getLogs() {
  return makeRequest("GET", "/8router/logs");
}

/** Get server info (version, uptime, …). */
export async function getInfo() {
  return makeRequest("GET", "/8router/info");
}

/** Get available models (OpenAI-compatible endpoint). */
export async function getModels() {
  return makeRequest("GET", "/v1/models");
}

// ─── Caveman mode ────────────────────────────────────────────────────────────

/** Get caveman mode status. */
export async function getCaveman() {
  return makeRequest("GET", "/8router/caveman");
}

/** Toggle caveman mode. */
export async function toggleCaveman() {
  return makeRequest("POST", "/8router/caveman");
}

// ─── Guardrails ──────────────────────────────────────────────────────────────

/** Get guardrails status. */
export async function getGuardrails() {
  return makeRequest("GET", "/8router/guardrails");
}

/** Toggle guardrails. */
export async function toggleGuardrails() {
  return makeRequest("POST", "/8router/guardrails");
}

// ─── Privacy mode ────────────────────────────────────────────────────────────

/** Get privacy mode status. */
export async function getPrivacy() {
  return makeRequest("GET", "/8router/privacy");
}

/** Toggle privacy mode. */
export async function togglePrivacy() {
  return makeRequest("POST", "/8router/privacy");
}

// ─── Cost Optimizer ──────────────────────────────────────────────────────────

/** Get cost optimizer status. */
export async function getCostOptimizer() {
  return makeRequest("GET", "/8router/cost-optimizer");
}

/** Toggle cost optimizer. */
export async function toggleCostOptimizer() {
  return makeRequest("POST", "/8router/cost-optimizer");
}

// ─── Server ──────────────────────────────────────────────────────────────────

/** Shut down the 8Router server. */
export async function shutdown() {
  return makeRequest("POST", "/8router/shutdown");
}

// ─── Default export (convenience wrapper) ──────────────────────────

export default {
  configure,
  get,
  post,
  del,
  getProviders,
  getProviderHealth,
  getApiKeyPool,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getCombos,
  createCombo,
  getSettings,
  updateSettings,
  getStats,
  getUsage,
  getLogs,
  getInfo,
  getModels,
  getCaveman,
  toggleCaveman,
  getGuardrails,
  toggleGuardrails,
  getPrivacy,
  togglePrivacy,
  getCostOptimizer,
  toggleCostOptimizer,
  shutdown,
};
