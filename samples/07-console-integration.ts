/** Console integration: drop-in wrapper that sanitizes object arguments before logging. */
import { createSafeConsole, safeConsole } from "../src/index.js";

console.log("\n=== 07a: Default safeConsole singleton ===");
safeConsole.log("User login", { userId: 1, password: "hunter2" });

console.log("\n=== 07b: createSafeConsole() with custom options ===");
const auditConsole = createSafeConsole({ strategy: "mask" });
auditConsole.warn("Suspicious login", { userId: 1, token: "abc123" });
