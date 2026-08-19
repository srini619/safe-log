import { describe, it, expect } from "vitest";
import { applyStrategy } from "../../src/core/strategies.js";

describe("strategies", () => {
  it("redact returns the replacement text", () => {
    expect(applyStrategy("secret", "redact", "[REDACTED]")).toBe("[REDACTED]");
  });

  it("mask returns a fixed-length mask for strings", () => {
    expect(applyStrategy("john@example.com", "mask", "[REDACTED]")).toBe("********");
  });

  it("mask falls back to replacement for non-strings", () => {
    expect(applyStrategy(12345, "mask", "[REDACTED]")).toBe("[REDACTED]");
  });

  it("hash produces a deterministic sha256-prefixed digest", () => {
    const a = applyStrategy("user-123", "hash", "[REDACTED]");
    const b = applyStrategy("user-123", "hash", "[REDACTED]");
    expect(a).toBe(b);
    expect(a).toMatch(/^sha256:[a-f0-9]{16}$/);
  });

  it("last4 keeps only the last four characters", () => {
    expect(applyStrategy("4111111111111111", "last4", "[REDACTED]")).toBe("****1111");
  });

  it("last4 fully redacts values too short to reveal safely", () => {
    expect(applyStrategy("12", "last4", "[REDACTED]")).toBe("[REDACTED]");
  });
});
