/** Nested objects/arrays, Map/Set, Date/RegExp/Buffer passthrough, circular refs, maxDepth. */
import { sanitize } from "../src/index.js";

console.log("\n=== 03a: Nested objects and arrays ===");
console.log(
  sanitize({
    users: [
      { name: "Alice", password: "alice-secret" },
      { name: "Bob", password: "bob-secret" },
    ],
    meta: { auth: { token: "abc123" } },
  }),
);

console.log("\n=== 03b: Map and Set values ===");
console.log(
  sanitize({
    sessions: new Map<string, unknown>([
      ["token", "abc123"],
      ["userId", 42],
    ]),
    tags: new Set(["a", "b", { password: "nested-in-set" }]),
  }),
);

console.log("\n=== 03c: Date, RegExp, and Buffer pass through untouched ===");
console.log(
  sanitize({
    createdAt: new Date("2024-01-01T00:00:00Z"),
    pattern: /^secret$/i,
    payload: Buffer.from("binary-data"),
  }),
);

console.log("\n=== 03d: Circular references are detected and replaced with [Circular] ===");
const circular: Record<string, unknown> = { name: "root", password: "secret" };
circular.self = circular;
console.log(sanitize(circular));

console.log("\n=== 03e: maxDepth truncates deeply nested structures ===");
let deep: Record<string, unknown> = { value: "bottom", password: "secret" };
for (let i = 0; i < 5; i++) deep = { nested: deep };
console.log(sanitize(deep, { maxDepth: 3 }));
