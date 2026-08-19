import { sanitize } from "../core/sanitize.js";
import type { SanitizeOptions } from "../types/index.js";

export interface SafeConsole {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

/** Minimal shape of the console methods this wrapper depends on. */
type ConsoleLike = Pick<Console, "log" | "info" | "warn" | "error" | "debug">;

/**
 * Wraps a console-like object so every logged object argument is sanitized first.
 * Accepts a custom base (e.g. a mock) for testing without touching the global console.
 */
export function createSafeConsole(
  options?: SanitizeOptions,
  base: ConsoleLike = console,
): SafeConsole {
  const wrap =
    (fn: (...args: unknown[]) => void) =>
    (...args: unknown[]) => {
      fn.apply(
        base,
        args.map((arg) => (arg !== null && typeof arg === "object" ? sanitize(arg, options) : arg)),
      );
    };

  return {
    log: wrap(base.log.bind(base)),
    info: wrap(base.info.bind(base)),
    warn: wrap(base.warn.bind(base)),
    error: wrap(base.error.bind(base)),
    debug: wrap(base.debug.bind(base)),
  };
}

export const safeConsole: SafeConsole = createSafeConsole();
