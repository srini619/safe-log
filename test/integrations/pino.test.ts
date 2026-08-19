import { describe, it, expect, vi } from "vitest";
import pino from "pino";
import { sanitizeHook } from "../../src/integrations/pino.js";

function createLoggerWithCapture() {
  const lines: string[] = [];
  const stream = {
    write(chunk: string) {
      lines.push(chunk);
      return true;
    },
  };
  const logger = pino({ hooks: { logMethod: sanitizeHook() } }, stream as never);
  return { logger, lines };
}

describe("sanitizeHook", () => {
  it("sanitizes object arguments passed to a pino log method", () => {
    const { logger, lines } = createLoggerWithCapture();
    logger.info({ userId: 123, password: "secret123", accessToken: "abc123" }, "User login");

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.msg).toBe("User login");
    expect(parsed.userId).toBe(123);
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.accessToken).toBe("[REDACTED]");
  });

  it("passes non-object arguments through untouched", () => {
    const { logger, lines } = createLoggerWithCapture();
    logger.info("plain message");
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed.msg).toBe("plain message");
  });

  it("does not mutate the original object argument", () => {
    const hook = sanitizeHook();
    const method = vi.fn();
    const original = { password: "secret" };
    hook.call(undefined, [original], method, 30);
    expect(original).toEqual({ password: "secret" });
    expect(method).toHaveBeenCalledWith({ password: "[REDACTED]" });
  });
});
