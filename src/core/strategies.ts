import { createHash } from "node:crypto";
import type { RedactionStrategy } from "../types/index.js";

/**
 * Applies a redaction strategy to a sensitive value.
 * Non-string values fall back to simple/deterministic behavior per strategy.
 */
export function applyStrategy(
  value: unknown,
  strategy: RedactionStrategy,
  replacement: string,
): unknown {
  switch (strategy) {
    case "redact":
      return replacement;
    case "mask":
      return mask(value, replacement);
    case "hash":
      return hash(value);
    case "last4":
      return last4(value, replacement);
    default:
      return replacement;
  }
}

function mask(value: unknown, replacement: string): unknown {
  if (typeof value !== "string") return replacement;
  if (value.length === 0) return value;
  return "*".repeat(Math.min(value.length, 8));
}

/** SHA-256 obfuscation hash -- NOT a secure/salted hash; low-entropy inputs remain guessable. */
function hash(value: unknown): string {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  const digest = createHash("sha256").update(input).digest("hex");
  return `sha256:${digest.slice(0, 16)}`;
}

function last4(value: unknown, replacement: string): unknown {
  if (typeof value !== "string") return replacement;
  if (value.length <= 4) return replacement;
  return `****${value.slice(-4)}`;
}
