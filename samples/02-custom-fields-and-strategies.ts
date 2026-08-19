/** Extra field names, per-field strategy overrides, and a global default strategy. */
import { sanitize } from "../src/index.js";

console.log("\n=== 02a: Extra sensitive fields (array form) ===");
console.log(
  sanitize({ username: "jdoe", nickname: "shadow", password: "hunter2" }, { fields: ["nickname"] }),
);

console.log("\n=== 02b: Per-field strategy overrides (object form) ===");
console.log(
  sanitize(
    {
      password: "hunter2",
      apiKey: "sk-live-1234567890",
      cardNumber: "4111111111111111",
      email: "jdoe@example.com",
    },
    {
      fields: {
        password: "redact",
        apiKey: "hash",
        cardNumber: "last4",
        email: "mask",
      },
    },
  ),
);

console.log("\n=== 02c: Global default strategy applied to all matched fields ===");
console.log(sanitize({ password: "hunter2", token: "abc123" }, { strategy: "mask" }));
