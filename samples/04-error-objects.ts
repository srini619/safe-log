/** Error instances keep name/message/stack and have their own extra props sanitized. */
import { sanitize } from "../src/index.js";

class ApiError extends Error {
  token: string;
  constructor(message: string, token: string) {
    super(message);
    this.name = "ApiError";
    this.token = token;
  }
}

console.log("\n=== 04: Error objects ===");
const err = new ApiError("Request failed", "abc123");
console.log(sanitize({ error: err }));
