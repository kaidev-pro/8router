/**
 * input.js — Interactive input utilities using readline + rawMode.
 * Provides prompt(), select(), confirm(), pause(), and selectMenu().
 */

import readline from "node:readline";

// ─── ANSI color codes ────────────────────────────────────────────────────────
export const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underline: "\x1b[4m",
  reverse: "\x1b[7m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgGreen: "\x1b[42m",
  bgBlue: "\x1b[44m",
  black: "\x1b[30m",
  // 8Router terracotta accent color
  terracotta: "\x1b[38;2;217;119;87m",
  bgTerracotta: "\x1b[48;2;217;119;87m",
};

// ─── Raw mode management ─────────────────────────────────────────────────────
// Prime stdin once globally. Toggling raw mode between menus adds latency on
// macOS, so we keep raw mode on for the whole TUI session.
let rawPrimed = false;

/**
 * Prime raw stdin mode once for the session.
 * Call this before any interactive menu.
 */
export function primeRawOnce() {
  if (rawPrimed || !process.stdin.isTTY) return;
  try {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding("utf8");
    process.stdin.resume();
    rawPrimed = true;
  } catch {
    // Ignore errors on non-TTY environments
  }
}

/**
 * Cleanup raw mode (if needed for shutdown).
 */
export function cleanupRaw() {
  if (rawPrimed && process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Ignore
    }
    rawPrimed = false;
  }
}

/**
 * Temporarily suspend raw mode for line-based input, then restore.
 * @param {() => Promise<any>} fn – Async function to run with raw mode off
 */
async function suspendRawFor(fn) {
  const wasPrimed = rawPrimed;
  if (wasPrimed && process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // Ignore
    }
  }
  try {
    return await fn();
  } finally {
    if (wasPrimed && process.stdin.isTTY) {
      try {
        process.stdin.setRawMode(true);
      } catch {
        // Ignore
      }
      process.stdin.resume();
    }
  }
}

/**
 * Prompt user for a single line of text.
 * @param {string} question – Question to display
 * @returns {Promise<string>} User input (trimmed)
 */
export async function prompt(question) {
  return suspendRawFor(
    () =>
      new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl.question(question, (answer) => {
          rl.close();
          resolve((answer ?? "").trim());
        });
      })
  );
}

/**
 * Display numbered options and prompt for selection.
 * @param {string}   question – Question to display
 * @param {string[]} options  – Array of option labels
 * @returns {Promise<number>} Selected index (0-based)
 */
export async function select(question, options) {
  console.log(question);
  options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));

  while (true) {
    const answer = await prompt("\nSelect option (number): ");
    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 1 && num <= options.length) return num - 1;
    console.log(
      `Invalid selection. Please enter a number between 1 and ${options.length}`
    );
  }
}

/**
 * Prompt for yes/no confirmation.
 * @param {string} question – Question to display
 * @returns {Promise<boolean>} true for yes, false for no
 */
export async function confirm(question) {
  while (true) {
    const answer = await prompt(`${question} (y/n): `);
    const lower = answer.toLowerCase();
    if (lower === "y" || lower === "yes") return true;
    if (lower === "n" || lower === "no") return false;
    console.log("Please answer 'y' or 'n'");
  }
}

/**
 * Pause execution until user presses Enter.
 * @param {string} [message="Press Enter to continue..."] – Message to display
 * @returns {Promise<void>}
 */
export async function pause(message = "Press Enter to continue...") {
  return suspendRawFor(
    () =>
      new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        rl.question(message, () => {
          rl.close();
          resolve();
        });
      })
  );
}

/**
 * Interactive arrow-key menu with ★/☆ icons.
 * @param {string}   title         – Menu title
 * @param {Array<{label:string}>} items – Menu items
 * @param {number}   [defaultIndex=0] – Default selected index
 * @param {string}   [subtitle=""]   – Optional subtitle
 * @param {string}   [headerContent=""] – Optional header content to display
 * @param {string[]} [breadcrumb=[]] – Optional breadcrumb path
 * @returns {Promise<number>} Selected index (-1 for escape/cancel)
 */
export async function selectMenu(
  title,
  items,
  defaultIndex = 0,
  subtitle = "",
  headerContent = "",
  breadcrumb = []
) {
  return new Promise((resolve) => {
    let selectedIndex = defaultIndex;
    let isActive = true;

    primeRawOnce();
    if (!process.stdin.isTTY) {
      resolve(-1);
      return;
    }

    const renderMenu = () => {
      if (!isActive) return;
      process.stdout.write("\x1b[2J\x1b[H"); // Clear screen + home

      const width = Math.min(process.stdout.columns || 40, 40);
      console.log(`\n${COLORS.terracotta}${"=".repeat(width)}${COLORS.reset}`);
      console.log(`  ${COLORS.bright}${COLORS.terracotta}${title}${COLORS.reset}`);
      if (subtitle) console.log(`  ${COLORS.dim}${subtitle}${COLORS.reset}`);
      console.log(`${COLORS.terracotta}${"=".repeat(width)}${COLORS.reset}`);

      if (breadcrumb.length > 0) {
        console.log(`  ${COLORS.dim}${breadcrumb.join(" > ")}${COLORS.reset}`);
      }
      console.log();

      if (headerContent) {
        console.log(headerContent);
        console.log();
      }

      const isWin = process.platform === "win32";
      items.forEach((item, index) => {
        const isSelected = index === selectedIndex;
        const icon = isSelected
          ? isWin
            ? ">"
            : "★"
          : isWin
            ? " "
            : "☆";

        if (isSelected) {
          console.log(
            ` ${COLORS.reverse}${COLORS.bright}${icon} ${item.label}${COLORS.reset}`
          );
        } else {
          console.log(`  ${icon} ${item.label}`);
        }
      });
    };

    const cleanup = () => {
      if (!isActive) return;
      isActive = false;
      process.stdin.removeListener("keypress", onKeypress);
    };

    const move = (delta) => {
      selectedIndex = (selectedIndex + delta + items.length) % items.length;
      renderMenu();
    };

    const onKeypress = (_str, key) => {
      if (!isActive || !key) return;

      if (key.name === "up") return move(-1);
      if (key.name === "down") return move(1);
      if (key.name === "return") {
        cleanup();
        resolve(selectedIndex);
        return;
      }
      if (key.name === "escape") {
        cleanup();
        resolve(-1);
        return;
      }
      if (key.ctrl && key.name === "c") {
        cleanup();
        process.exit(0);
      }
    };

    process.stdin.on("keypress", onKeypress);
    renderMenu();
  });
}
