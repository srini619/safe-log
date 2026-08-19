/** Basic usage: sanitize() redacts known sensitive field names using built-in defaults. */
import { sanitize } from "../src/index.js";

const user = {
  id: 1,
  username: "jdoe",
  password: "hunter2",
  accessToken: "abc.def.ghi",
  profile: { email: "jdoe@example.com", ssn: "123-45-6789" },
};

console.log("\n=== 01: Basic sanitize() with default sensitive fields ===");
console.log(sanitize(user));
