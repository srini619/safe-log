import { describe, it, expect } from "vitest";
import { sanitize } from "../../src/core/sanitize.js";

describe("sanitize - basic redaction", () => {
  it("redacts known sensitive top-level fields", () => {
    const result = sanitize({ password: "secret123", username: "john" });
    expect(result).toEqual({ password: "[REDACTED]", username: "john" });
  });

  it("redacts nested objects", () => {
    const input = {
      user: { id: 123, email: "john@example.com", password: "secret123" },
      authentication: { accessToken: "abc123", refreshToken: "xyz456" },
    };
    // "email" is intentionally not in the default sensitive field list (see core/defaults.ts).
    expect(sanitize(input)).toEqual({
      user: { id: 123, email: "john@example.com", password: "[REDACTED]" },
      authentication: { accessToken: "[REDACTED]", refreshToken: "[REDACTED]" },
    });
  });

  it("does not redact fields containing 'id' or 'key' as substrings", () => {
    const result = sanitize({ validId: 1, monkeyBusinessKeyboard: "x", userId: 2 });
    expect(result).toEqual({ validId: 1, monkeyBusinessKeyboard: "x", userId: 2 });
  });
});

describe("sanitize - arrays", () => {
  it("sanitizes objects inside arrays", () => {
    const result = sanitize([{ password: "a" }, { password: "b" }]);
    expect(result).toEqual([{ password: "[REDACTED]" }, { password: "[REDACTED]" }]);
  });

  it("redacts an entire array value when its key is sensitive", () => {
    const result = sanitize({ tokens: ["a", "b", "c"] });
    // "tokens" doesn't match "token" exactly (plural), so array contents pass through untouched
    expect(result).toEqual({ tokens: ["a", "b", "c"] });
  });
});

describe("sanitize - case-insensitive & naming variations", () => {
  it("matches regardless of case and separator style", () => {
    const result = sanitize({
      PASSWORD: "a",
      AccessToken: "b",
      access_token: "c",
      "Access-Token": "d",
    });
    expect(result).toEqual({
      PASSWORD: "[REDACTED]",
      AccessToken: "[REDACTED]",
      access_token: "[REDACTED]",
      "Access-Token": "[REDACTED]",
    });
  });
});

describe("sanitize - custom fields & replacement", () => {
  it("supports custom field list", () => {
    const result = sanitize({ customSecret: "a", normal: "b" }, { fields: ["customSecret"] });
    expect(result).toEqual({ customSecret: "[REDACTED]", normal: "b" });
  });

  it("supports custom replacement text", () => {
    const result = sanitize({ password: "a" }, { replacement: "***" });
    expect(result).toEqual({ password: "***" });
  });

  it("supports per-field strategy overrides", () => {
    const result = sanitize(
      { email: "john@example.com", cardNumber: "4111111111111111" },
      { fields: { email: "mask", cardNumber: "last4" } },
    );
    expect(result).toEqual({ email: "********", cardNumber: "****1111" });
  });
});

describe("sanitize - circular references", () => {
  it("replaces circular references with a marker", () => {
    const obj: Record<string, unknown> = { name: "a" };
    obj.self = obj;
    const result = sanitize(obj) as Record<string, unknown>;
    expect(result.name).toBe("a");
    expect(result.self).toBe("[Circular]");
  });

  it("does not falsely flag a shared (non-cyclic) reference as circular", () => {
    const shared = { value: 1 };
    const input = { a: shared, b: shared };
    const result = sanitize(input) as Record<string, unknown>;
    expect(result.a).toEqual({ value: 1 });
    expect(result.b).toEqual({ value: 1 });
  });
});

describe("sanitize - Error objects", () => {
  it("preserves name, message, stack and sanitizes extra props", () => {
    const err = new Error("boom") as Error & { password?: string };
    err.password = "secret";
    const result = sanitize(err) as unknown as Record<string, unknown>;
    expect(result.name).toBe("Error");
    expect(result.message).toBe("boom");
    expect(typeof result.stack).toBe("string");
    expect(result.password).toBe("[REDACTED]");
  });
});

describe("sanitize - Date preservation", () => {
  it("returns an equal but distinct Date instance", () => {
    const date = new Date("2024-01-01T00:00:00.000Z");
    const result = sanitize({ createdAt: date }) as { createdAt: Date };
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.getTime()).toBe(date.getTime());
    expect(result.createdAt).not.toBe(date);
  });
});

describe("sanitize - Buffer preservation", () => {
  it("preserves Buffer instances untouched", () => {
    const buf = Buffer.from("hello");
    const result = sanitize({ data: buf }) as { data: Buffer };
    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect(result.data.toString()).toBe("hello");
  });
});

describe("sanitize - BigInt", () => {
  it("passes BigInt values through unchanged", () => {
    const result = sanitize({ big: 10n });
    expect(result).toEqual({ big: 10n });
  });
});

describe("sanitize - Map and Set", () => {
  it("sanitizes Map values and redacts sensitive Map keys", () => {
    const map = new Map<string, unknown>([
      ["password", "secret"],
      ["name", "john"],
    ]);
    const result = sanitize(map) as Map<string, unknown>;
    expect(result.get("password")).toBe("[REDACTED]");
    expect(result.get("name")).toBe("john");
  });

  it("sanitizes Set values", () => {
    const set = new Set([{ password: "a" }, { password: "b" }]);
    const result = sanitize(set) as Set<unknown>;
    expect([...result]).toEqual([{ password: "[REDACTED]" }, { password: "[REDACTED]" }]);
  });
});

describe("sanitize - getters that throw", () => {
  it("substitutes a marker instead of crashing", () => {
    const obj = {
      get boom(): string {
        throw new Error("nope");
      },
      safe: "value",
    };
    const result = sanitize(obj) as Record<string, unknown>;
    expect(result.boom).toBe("[Unreadable]");
    expect(result.safe).toBe("value");
  });
});

describe("sanitize - deep nesting", () => {
  it("truncates beyond maxDepth", () => {
    let deep: Record<string, unknown> = { value: "bottom" };
    for (let i = 0; i < 30; i++) {
      deep = { nested: deep };
    }
    const result = sanitize(deep, { maxDepth: 5 });
    let cursor = result as Record<string, unknown>;
    let depth = 0;
    while (cursor && typeof cursor === "object" && "nested" in cursor && depth < 6) {
      cursor = cursor.nested as Record<string, unknown>;
      depth++;
    }
    expect(cursor).toBe("[MaxDepthExceeded]");
  });
});

describe("sanitize - functions and symbols", () => {
  it("replaces function-valued properties with a marker", () => {
    const result = sanitize({ fn: () => "x", value: 1 }) as Record<string, unknown>;
    expect(result.fn).toBe("[Function]");
    expect(result.value).toBe(1);
  });

  it("ignores symbol-keyed properties (not enumerable via Object.keys)", () => {
    const sym = Symbol("meta");
    const obj: Record<string | symbol, unknown> = { value: 1, [sym]: "hidden" };
    const result = sanitize(obj) as Record<string, unknown>;
    expect(result.value).toBe(1);
    expect(Object.getOwnPropertySymbols(result)).toHaveLength(0);
  });
});

describe("sanitize - prototype pollution guard", () => {
  it("does not copy __proto__/constructor/prototype keys", () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "safe": 1}') as Record<
      string,
      unknown
    >;
    expect(Object.prototype.hasOwnProperty.call(malicious, "__proto__")).toBe(true);

    const result = sanitize(malicious) as Record<string, unknown>;
    expect(result.safe).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(false);
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("sanitize - immutability of input", () => {
  it("does not mutate the original object", () => {
    const input = { password: "secret", nested: { token: "abc" } };
    const snapshot = JSON.parse(JSON.stringify(input));
    sanitize(input);
    expect(input).toEqual(snapshot);
  });
});

describe("sanitize - malformed / unusual inputs", () => {
  it("handles null and undefined", () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });

  it("handles primitives", () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize("plain string")).toBe("plain string");
    expect(sanitize(true)).toBe(true);
  });

  it("handles empty objects and arrays", () => {
    expect(sanitize({})).toEqual({});
    expect(sanitize([])).toEqual([]);
  });

  it("handles RegExp values", () => {
    const re = /abc/gi;
    const result = sanitize({ pattern: re }) as { pattern: RegExp };
    expect(result.pattern).toBeInstanceOf(RegExp);
    expect(result.pattern.source).toBe("abc");
  });
});

describe("sanitize - opt-in string pattern detection", () => {
  it("redacts bearer tokens only when enabled", () => {
    const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature";
    expect(sanitize(input)).toBe(input);
    expect(sanitize(input, { detect: { bearer: true } })).toBe("Authorization: Bearer [REDACTED]");
  });

  it("redacts JWT-shaped strings only when enabled", () => {
    const input = "token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abc123DEF";
    const result = sanitize(input, { detect: { jwt: true } });
    expect(result).toContain("token=");
    expect(result).not.toContain("eyJhbGciOiJIUzI1NiJ9");
  });
});
