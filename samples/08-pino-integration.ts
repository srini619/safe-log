/** Pino integration via `hooks.logMethod` -- requires the optional `pino` peer dependency. */
import pino from "pino";
import { sanitizeHook } from "../src/index.js";

console.log("\n=== 08: Pino integration ===");
const logger = pino({ hooks: { logMethod: sanitizeHook() } });
logger.info({ userId: 123, password: "secret123", accessToken: "abc123" }, "User login");
