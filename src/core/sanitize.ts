import type { ResolvedSanitizeOptions, SanitizeOptions } from "../types/index.js";
import { buildStrategyMap, matchField } from "./matcher.js";
import { applyStrategy } from "./strategies.js";
import { detectAndRedactString } from "./patterns.js";

const DEFAULT_REPLACEMENT = "[REDACTED]";
const DEFAULT_MAX_DEPTH = 20;
const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function resolveOptions(options?: SanitizeOptions): ResolvedSanitizeOptions {
  const replacement = options?.replacement ?? DEFAULT_REPLACEMENT;
  const defaultStrategy = options?.strategy ?? "redact";
  return {
    replacement,
    strategyByField: buildStrategyMap(options?.fields, defaultStrategy),
    defaultStrategy,
    detect: {
      bearer: options?.detect?.bearer ?? false,
      jwt: options?.detect?.jwt ?? false,
    },
    maxDepth: options?.maxDepth ?? DEFAULT_MAX_DEPTH,
  };
}

/** Recursively sanitizes a value, redacting fields that match sensitive names. */
export function sanitize<T = unknown>(input: T, options?: SanitizeOptions): T {
  const resolved = resolveOptions(options);
  const ancestors = new Set<unknown>();
  return sanitizeValue(input, resolved, ancestors, 0) as T;
}

function sanitizeValue(
  value: unknown,
  options: ResolvedSanitizeOptions,
  ancestors: Set<unknown>,
  depth: number,
): unknown {
  if (value === null || typeof value !== "object") {
    return typeof value === "string" ? sanitizeString(value, options) : value;
  }

  if (depth >= options.maxDepth) {
    return "[MaxDepthExceeded]";
  }

  if (ancestors.has(value)) {
    return "[Circular]";
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof Error) {
    ancestors.add(value);
    try {
      return sanitizeError(value, options, ancestors, depth);
    } finally {
      ancestors.delete(value);
    }
  }

  if (Array.isArray(value)) {
    ancestors.add(value);
    try {
      return value.map((item) => sanitizeValue(item, options, ancestors, depth + 1));
    } finally {
      ancestors.delete(value);
    }
  }

  if (value instanceof Map) {
    ancestors.add(value);
    try {
      const result = new Map<unknown, unknown>();
      for (const [key, val] of value.entries()) {
        const strategy =
          typeof key === "string" ? matchField(key, options.strategyByField) : undefined;
        result.set(
          key,
          strategy
            ? applyStrategy(val, strategy, options.replacement)
            : sanitizeValue(val, options, ancestors, depth + 1),
        );
      }
      return result;
    } finally {
      ancestors.delete(value);
    }
  }

  if (value instanceof Set) {
    ancestors.add(value);
    try {
      const result = new Set<unknown>();
      for (const item of value.values()) {
        result.add(sanitizeValue(item, options, ancestors, depth + 1));
      }
      return result;
    } finally {
      ancestors.delete(value);
    }
  }

  // Plain object (or unknown object-like value): walk own enumerable string keys only.
  ancestors.add(value);
  try {
    return sanitizePlainObject(value as Record<string, unknown>, options, ancestors, depth);
  } finally {
    ancestors.delete(value);
  }
}

function sanitizePlainObject(
  obj: Record<string, unknown>,
  options: ResolvedSanitizeOptions,
  ancestors: Set<unknown>,
  depth: number,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;

    let raw: unknown;
    try {
      raw = obj[key];
    } catch {
      result[key] = "[Unreadable]";
      continue;
    }

    if (typeof raw === "function") {
      result[key] = "[Function]";
      continue;
    }

    const strategy = matchField(key, options.strategyByField);
    if (strategy) {
      result[key] = applyStrategy(raw, strategy, options.replacement);
    } else {
      result[key] = sanitizeValue(raw, options, ancestors, depth + 1);
    }
  }

  return result;
}

function sanitizeError(
  err: Error,
  options: ResolvedSanitizeOptions,
  ancestors: Set<unknown>,
  depth: number,
): Record<string, unknown> {
  const extraKeys = Object.keys(err).filter((k) => !DANGEROUS_KEYS.has(k));
  const extras: Record<string, unknown> = {};

  for (const key of extraKeys) {
    let raw: unknown;
    try {
      raw = (err as unknown as Record<string, unknown>)[key];
    } catch {
      extras[key] = "[Unreadable]";
      continue;
    }
    const strategy = matchField(key, options.strategyByField);
    extras[key] = strategy
      ? applyStrategy(raw, strategy, options.replacement)
      : sanitizeValue(raw, options, ancestors, depth + 1);
  }

  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    ...extras,
  };
}

function sanitizeString(value: string, options: ResolvedSanitizeOptions): string {
  if (!options.detect.bearer && !options.detect.jwt) return value;
  return detectAndRedactString(value, options.detect, options.replacement);
}
