import { describe, it, expect, vi } from "vitest";
import { createSafeConsole } from "../../src/integrations/console.js";

function createFakeConsole() {
  return {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

describe("createSafeConsole", () => {
  it("sanitizes object arguments before delegating to the base console", () => {
    const fake = createFakeConsole();
    const safe = createSafeConsole(undefined, fake);

    safe.log("User login", { userId: 123, password: "secret123" });

    expect(fake.log).toHaveBeenCalledWith("User login", { userId: 123, password: "[REDACTED]" });
  });

  it("passes through primitive arguments untouched", () => {
    const fake = createFakeConsole();
    const safe = createSafeConsole(undefined, fake);

    safe.warn("plain text", 42, true);

    expect(fake.warn).toHaveBeenCalledWith("plain text", 42, true);
  });

  it("covers all wrapped methods", () => {
    const fake = createFakeConsole();
    const safe = createSafeConsole(undefined, fake);

    safe.info({ password: "a" });
    safe.error({ password: "b" });
    safe.debug({ password: "c" });

    expect(fake.info).toHaveBeenCalledWith({ password: "[REDACTED]" });
    expect(fake.error).toHaveBeenCalledWith({ password: "[REDACTED]" });
    expect(fake.debug).toHaveBeenCalledWith({ password: "[REDACTED]" });
  });

  it("does not mutate the original argument object", () => {
    const safe = createSafeConsole();
    const original = { password: "secret" };
    safe.log(original);
    expect(original).toEqual({ password: "secret" });
  });
});
