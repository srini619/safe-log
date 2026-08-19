/** Overriding the placeholder used by the "redact" strategy. */
import { sanitize } from "../src/index.js";

console.log("\n=== 06: Custom replacement value ===");
console.log(sanitize({ password: "hunter2", token: "abc123" }, { replacement: "***HIDDEN***" }));
