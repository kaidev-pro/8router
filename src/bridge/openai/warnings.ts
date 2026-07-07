// 8Router — OpenAI Bridge Warning Helpers
// Phase 1B: Warning accumulation for OpenAI conversion

import type { BridgeWarning } from '../canonical/index.js';

/**
 * Warning accumulator for OpenAI ↔ Canonical conversion.
 * Collects warnings during conversion; caller attaches them to bridgeMeta.warnings.
 */
export class WarningAccumulator {
  private warnings: BridgeWarning[] = [];

  fieldPreserved(fieldPath: string, message: string): void {
    this.warnings.push({ code: 'field_preserved', fieldPath, message });
  }

  fieldDropped(fieldPath: string, message: string): void {
    this.warnings.push({ code: 'field_dropped', fieldPath, message });
  }

  fieldTransformed(fieldPath: string, message: string): void {
    this.warnings.push({ code: 'field_transformed', fieldPath, message });
  }

  capabilityWarning(message: string): void {
    this.warnings.push({ code: 'capability_warning', message });
  }

  shadowMismatch(message: string): void {
    this.warnings.push({ code: 'shadow_mismatch', message });
  }

  shadowSkipped(message: string): void {
    this.warnings.push({ code: 'shadow_skipped', message });
  }

  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  getWarnings(): BridgeWarning[] {
    return [...this.warnings];
  }

  clear(): void {
    this.warnings = [];
  }
}
