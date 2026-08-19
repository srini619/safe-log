import type { DetectOptions } from "../types/index.js";

// Bounded, non-backtracking-prone patterns only -- avoid ReDoS on adversarial strings.
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/g;
const JWT_PATTERN = /\b[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\b/g;

/**
 * Applies opt-in pattern-based redaction to a string leaf value.
 * Disabled unless explicitly enabled via `detect` options.
 */
export function detectAndRedactString(
  value: string,
  detect: Required<DetectOptions>,
  replacement: string,
): string {
  let result = value;

  if (detect.bearer) {
    result = result.replace(BEARER_PATTERN, `Bearer ${replacement}`);
  }

  if (detect.jwt) {
    result = result.replace(JWT_PATTERN, replacement);
  }

  return result;
}
