/**
 * endpoint.js — Endpoint URL resolution based on tunnel status.
 */

import { getTunnelStatus } from "../api/client.js";

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
};

/**
 * Get endpoint URL based on tunnel status.
 * @param {number} port – Local server port (e.g., 8080)
 * @returns {Promise<{endpoint: string, tunnelEnabled: boolean}>}
 */
export async function getEndpoint(port) {
  const result = await getTunnelStatus();
  const tunnelEnabled = result.success && result.data?.enabled === true;
  const publicUrl = result.success ? result.data?.publicUrl : "";

  const endpoint =
    tunnelEnabled && publicUrl
      ? `${publicUrl}/v1`
      : `http://localhost:${port}/v1`;

  return { endpoint, tunnelEnabled };
}

/**
 * Get endpoint with color formatting (green if tunnel enabled).
 * @param {number} port – Local server port
 * @returns {Promise<string>} Colored endpoint string
 */
export async function getEndpointColored(port) {
  const { endpoint, tunnelEnabled } = await getEndpoint(port);
  return tunnelEnabled ? `${COLORS.green}${endpoint}${COLORS.reset}` : endpoint;
}
