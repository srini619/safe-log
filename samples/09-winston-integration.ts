/** Winston integration via a logform-compatible format -- requires the optional `winston` peer dependency. */
import winston from "winston";
import { sanitizeFormat } from "../src/index.js";

console.log("\n=== 09: Winston integration ===");
const logger = winston.createLogger({
  format: winston.format.combine(
    sanitizeFormat() as winston.Logform.Format,
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

logger.info("User login", { userId: 123, password: "secret123", accessToken: "abc123" });
