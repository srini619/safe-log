export { sanitize } from "./core/sanitize.js";
export { defaultSensitiveFields } from "./core/defaults.js";
export type {
  RedactionStrategy,
  FieldsConfig,
  DetectOptions,
  SanitizeOptions,
} from "./types/index.js";

export { sanitizeFormat } from "./integrations/winston.js";
export { sanitizeHook } from "./integrations/pino.js";
export { createSafeConsole, safeConsole } from "./integrations/console.js";
export type { SafeConsole } from "./integrations/console.js";
