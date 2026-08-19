import { describe, it, expect } from "vitest";
import { buildStrategyMap, matchField } from "../../src/core/matcher.js";

describe("matcher", () => {
  it("matches default sensitive fields regardless of case/separators", () => {
    const map = buildStrategyMap(undefined, "redact");
    expect(matchField("password", map)).toBe("redact");
    expect(matchField("PASSWORD", map)).toBe("redact");
    expect(matchField("access_token", map)).toBe("redact");
    expect(matchField("AccessToken", map)).toBe("redact");
    expect(matchField("Access-Token", map)).toBe("redact");
  });

  it("does not match unrelated fields containing 'id' or 'key' as substrings", () => {
    const map = buildStrategyMap(undefined, "redact");
    expect(matchField("validId", map)).toBeUndefined();
    expect(matchField("monkeyKey", map)).toBeUndefined();
    expect(matchField("userId", map)).toBeUndefined();
  });

  it("merges custom string[] fields using the default strategy", () => {
    const map = buildStrategyMap(["customSecret"], "redact");
    expect(matchField("customSecret", map)).toBe("redact");
  });

  it("supports per-field strategy overrides via record config", () => {
    const map = buildStrategyMap({ email: "mask", cardNumber: "last4" }, "redact");
    expect(matchField("email", map)).toBe("mask");
    expect(matchField("cardNumber", map)).toBe("last4");
    expect(matchField("password", map)).toBe("redact");
  });
});
