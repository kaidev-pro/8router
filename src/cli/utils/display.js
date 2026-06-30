/**
 * display.js — Box drawing, tables, status messages for 8Router TUI
 * Matches the visual style used by 9Router.
 */

import { formatNumber } from "./format.js";

// ─── ANSI color codes ────────────────────────────────────────────────────────
export const COLORS = {
  reset: "\x1b[0m",
  success: "\x1b[32m",
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
};

// ─── Box drawing characters ──────────────────────────────────────────────────
const BOX = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
};

/**
 * Draw a box with border around content.
 * @param {string} title   – Box title
 * @param {string} content – Content to display inside box
 * @param {number} [width=60] – Total box width
 */
export function showBox(title, content, width = 60) {
  const innerWidth = width - 4;
  const lines = content.split("\n");

  // Top border with title
  const topBorder =
    BOX.topLeft +
    BOX.horizontal.repeat(2) +
    ` ${title} ` +
    BOX.horizontal.repeat(Math.max(0, innerWidth - title.length - 3)) +
    BOX.topRight;

  console.log(topBorder);

  // Content lines
  lines.forEach((line) => {
    const paddedLine = line.padEnd(innerWidth);
    console.log(`${BOX.vertical} ${paddedLine} ${BOX.vertical}`);
  });

  // Bottom border
  const bottomBorder =
    BOX.bottomLeft + BOX.horizontal.repeat(innerWidth + 2) + BOX.bottomRight;
  console.log(bottomBorder);
}

/**
 * Display a menu with numbered items.
 * @param {string}   title  – Menu title
 * @param {string[]} items  – Array of menu item labels
 * @param {string}   [footer] – Optional footer text
 */
export function showMenu(title, items, footer) {
  console.log(`\n${COLORS.bold}${title}${COLORS.reset}`);
  console.log(COLORS.dim + "─".repeat(title.length) + COLORS.reset);

  items.forEach((item, index) => {
    console.log(`  ${COLORS.info}${index + 1}.${COLORS.reset} ${item}`);
  });

  if (footer) {
    console.log(`\n${COLORS.dim}${footer}${COLORS.reset}`);
  }
  console.log();
}

/**
 * Display data in table format.
 * @param {string[]}                   headers – Column headers
 * @param {Array<Array<string|number>>} rows   – Row data
 */
export function showTable(headers, rows) {
  if (!headers.length || !rows.length) return;

  // Calculate column widths
  const colWidths = headers.map((header, i) => {
    const maxDataWidth = Math.max(
      ...rows.map((row) => String(row[i] ?? "").length)
    );
    return Math.max(header.length, maxDataWidth);
  });

  // Header row
  const headerRow = headers
    .map((h, i) => h.padEnd(colWidths[i]))
    .join(" │ ");
  console.log(COLORS.bold + headerRow + COLORS.reset);

  // Separator
  const separator = colWidths.map((w) => "─".repeat(w)).join("─┼─");
  console.log(COLORS.dim + separator + COLORS.reset);

  // Data rows
  rows.forEach((row) => {
    const rowStr = row
      .map((cell, i) => String(cell ?? "").padEnd(colWidths[i]))
      .join(" │ ");
    console.log(rowStr);
  });
}

/**
 * Show coloured status message.
 * @param {string} message – Message text
 * @param {string} [type="info"] – success | error | warning | info
 */
export function showStatus(message, type = "info") {
  const symbols = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  };

  const color = COLORS[type] || COLORS.info;
  const symbol = symbols[type] || symbols.info;
  console.log(`${color}${symbol} ${message}${COLORS.reset}`);
}

/** Clear the terminal screen. */
export function clearScreen() {
  console.clear();
}

/**
 * Show a prominent header.
 * @param {string} title    – Main title
 * @param {string} subtitle – Optional subtitle
 */
export function showHeader(title, subtitle) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${COLORS.bright}${COLORS.cyan}${title}${COLORS.reset}`);
  if (subtitle) {
    console.log(`  ${COLORS.dim}${subtitle}${COLORS.reset}`);
  }
  console.log(`${"=".repeat(60)}\n`);
}
