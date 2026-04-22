/**
 * Version + plan-ID stamp.
 * - APP_VERSION is bumped by hand when rules change in a clinically meaningful way.
 * - RULESET_DATE is the last date any rule file was updated; shown in PDF footer.
 * - planId() returns a short, reproducible hash-ish string for audit trails.
 */
export const APP_VERSION = "1.0.0";
export const RULESET_DATE = "2026-04-22";

export function planId() {
  // Short base-36 ID. Not cryptographic — good enough to cite on printed PDFs.
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${t.slice(-6)}-${r}`;
}
