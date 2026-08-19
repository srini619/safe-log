import { sanitize } from "../core/sanitize.js";
import type { SanitizeOptions } from "../types/index.js";

/**
 * A logform-compatible format: `{ transform(info) }`.
 * Implemented without importing winston/logform at runtime, so core stays framework-agnostic.
 */
export interface LogformCompatibleFormat {
  transform(info: Record<string | symbol, unknown>): Record<string | symbol, unknown>;
}

/**
 * Winston integration. Use inside `winston.format.combine(sanitizeFormat(), ...)`.
 */
export function sanitizeFormat(options?: SanitizeOptions): LogformCompatibleFormat {
  return {
    transform(info: Record<string | symbol, unknown>) {
      const { level, message, ...meta } = info;

      const result: Record<string | symbol, unknown> = {
        ...(sanitize(meta, options) as Record<string, unknown>),
        level,
        message: typeof message === "string" ? message : sanitize(message, options),
      };

      // Symbols (e.g. Symbol.for('level')/Symbol.for('message')) must survive for
      // downstream formats/transports -- copy them generically without depending on triple-beam.
      for (const sym of Object.getOwnPropertySymbols(info)) {
        result[sym] = info[sym];
      }

      return result;
    },
  };
}
