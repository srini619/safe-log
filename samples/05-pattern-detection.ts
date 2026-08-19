/** Opt-in detection of Bearer tokens and JWT-shaped strings inside string values. */
import { sanitize } from "../src/index.js";

const logLine =
  "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

console.log("\n=== 05a: Detection disabled (default) ===");
console.log(sanitize({ logLine }));

console.log("\n=== 05b: Detection enabled via `detect` options ===");
console.log(sanitize({ logLine }, { detect: { bearer: true, jwt: true } }));
