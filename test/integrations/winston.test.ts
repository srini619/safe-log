import { describe, it, expect } from "vitest";
import winston from "winston";
import Transport from "winston-transport";
import { sanitizeFormat } from "../../src/integrations/winston.js";

/** In-memory transport used to capture emitted log lines for assertions. */
class MemoryTransport extends Transport {
  logs: Record<string, unknown>[] = [];
  override log(info: Record<string, unknown>, callback: () => void): void {
    this.logs.push(info);
    callback();
  }
}

describe("sanitizeFormat - transform() unit behavior", () => {
  it("preserves level and message, sanitizes metadata", () => {
    const format = sanitizeFormat();
    const info = { level: "info", message: "User login", userId: 123, password: "secret123" };
    const result = format.transform({ ...info });
    expect(result.level).toBe("info");
    expect(result.message).toBe("User login");
    expect(result.userId).toBe(123);
    expect(result.password).toBe("[REDACTED]");
  });

  it("preserves symbol properties (e.g. Symbol.for('level'))", () => {
    const format = sanitizeFormat();
    const levelSym = Symbol.for("level");
    const info: Record<string | symbol, unknown> = {
      level: "info",
      message: "hi",
      [levelSym]: "info",
    };
    const result = format.transform(info);
    expect(result[levelSym]).toBe("info");
  });

  it("sanitizes nested metadata and arrays", () => {
    const format = sanitizeFormat();
    const info = {
      level: "info",
      message: "req",
      users: [{ password: "a" }, { password: "b" }],
      auth: { accessToken: "abc" },
    };
    const result = format.transform({ ...info });
    expect(result.users).toEqual([{ password: "[REDACTED]" }, { password: "[REDACTED]" }]);
    expect(result.auth).toEqual({ accessToken: "[REDACTED]" });
  });

  it("handles Error objects in metadata", () => {
    const format = sanitizeFormat();
    const err = new Error("boom");
    const result = format.transform({ level: "error", message: "failed", err });
    expect((result.err as { message: string }).message).toBe("boom");
  });

  it("handles circular references in metadata without throwing", () => {
    const format = sanitizeFormat();
    const circular: Record<string, unknown> = { name: "x" };
    circular.self = circular;
    expect(() => format.transform({ level: "info", message: "m", circular })).not.toThrow();
  });

  it("does not mutate the original info object", () => {
    const format = sanitizeFormat();
    const info = { level: "info", message: "m", password: "secret" };
    const snapshot = { ...info };
    format.transform(info);
    expect(info).toEqual(snapshot);
  });
});

describe("sanitizeFormat - end-to-end with a real winston logger", () => {
  it("emits sanitized output through format.combine() + json() + a transport", () => {
    const transport = new MemoryTransport();
    const logger = winston.createLogger({
      format: winston.format.combine(
        sanitizeFormat() as winston.Logform.Format,
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports: [transport],
    });

    logger.info("User login", {
      userId: 123,
      password: "secret123",
      accessToken: "abc123",
    });

    expect(transport.logs).toHaveLength(1);
    const line = transport.logs[0] as Record<string, unknown>;
    expect(line.message).toBe("User login");
    expect(line.userId).toBe(123);
    expect(line.password).toBe("[REDACTED]");
    expect(line.accessToken).toBe("[REDACTED]");
    expect(typeof line.timestamp).toBe("string");
  });
});
