/**
 * clipboard.js — Cross-platform clipboard copy utility.
 */

import { execSync } from "node:child_process";

/**
 * Copy text to system clipboard.
 * @param {string} text – Text to copy
 * @returns {boolean} true on success, false on failure
 */
export function copyToClipboard(text) {
  try {
    const platform = process.platform;

    if (platform === "darwin") {
      // macOS
      execSync("pbcopy", { input: text });
    } else if (platform === "win32") {
      // Windows
      execSync("clip", { input: text });
    } else {
      // Linux — try xclip first, then xsel
      try {
        execSync("xclip -selection clipboard", { input: text });
      } catch {
        execSync("xsel --clipboard --input", { input: text });
      }
    }
    return true;
  } catch {
    return false;
  }
}
