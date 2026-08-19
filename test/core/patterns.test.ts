import { describe, it, expect } from "vitest";
import { detectAndRedactString } from "../../src/core/patterns.js";

describe("patterns", () => {
  it("redacts bearer tokens when enabled", () => {
    const result = detectAndRedactString(
      "Authorization: Bearer abc.def.ghi",
      { bearer: true, jwt: false },
      "[REDACTED]",
    );
    expect(result).toBe("Authorization: Bearer [REDACTED]");
  });

  it("leaves strings untouched when both flags are disabled", () => {
    const input = "Authorization: Bearer abc.def.ghi";
    expect(detectAndRedactString(input, { bearer: false, jwt: false }, "[REDACTED]")).toBe(input);
  });

  it("redacts JWT-shaped strings when enabled", () => {
    const result = detectAndRedactString(
      "token=eyJhbGciOi.eyJzdWIiOi.abc123",
      { bearer: false, jwt: true },
      "[REDACTED]",
    );
    expect(result).toBe("token=[REDACTED]");
  });
});
