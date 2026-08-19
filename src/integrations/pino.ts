import { sanitize } from "../core/sanitize.js";
import type { SanitizeOptions } from "../types/index.js";

/** Minimal structural shape of Pino's `hooks.logMethod`, to avoid a runtime pino dependency. */
export type PinoLogMethod = (this: unknown, ...args: unknown[]) => unknown;
export type PinoLogMethodHook = (
  this: unknown,
  args: unknown[],
  method: PinoLogMethod,
  level: number,
) => void;

/**
 * Pino integration: returns a `hooks.logMethod` function.
 * Usage: `pino({ hooks: { logMethod: sanitizeHook() } })`.
 */
export function sanitizeHook(options?: SanitizeOptions): PinoLogMethodHook {
  return function logMethod(args, method) {
    const sanitizedArgs = args.map((arg) =>
      arg !== null && typeof arg === "object" ? sanitize(arg, options) : arg,
    );
    method.apply(this, sanitizedArgs);
  };
}
