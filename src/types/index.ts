/**
 * Public types for the safe-log package.
 */

/** Supported redaction strategies for sensitive field values. */
export type RedactionStrategy = "redact" | "mask" | "hash" | "last4";

/** Per-field strategy overrides, or a plain list of extra field names to redact. */
export type FieldsConfig = string[] | Record<string, RedactionStrategy>;

/** Opt-in string pattern detection flags (disabled by default). */
export interface DetectOptions {
  /** Detect and redact `Bearer <token>` occurrences inside strings. */
  bearer?: boolean;
  /** Detect and redact JWT-shaped strings (three base64url segments). */
  jwt?: boolean;
}

/** Options accepted by {@link sanitize}. */
export interface SanitizeOptions {
  /** Replacement value used by the "redact" strategy. Defaults to "[REDACTED]". */
  replacement?: string;
  /** Additional sensitive field names, or per-field strategy overrides. */
  fields?: FieldsConfig;
  /** Default strategy applied to fields matched only by name (no explicit override). */
  strategy?: RedactionStrategy;
  /** Opt-in string pattern detection (bearer tokens, JWTs). Disabled by default. */
  detect?: DetectOptions;
  /** Maximum recursion depth before further nesting is truncated. Defaults to 20. */
  maxDepth?: number;
}

/** Internal, fully-resolved options used during traversal. */
export interface ResolvedSanitizeOptions {
  replacement: string;
  strategyByField: Map<string, RedactionStrategy>;
  defaultStrategy: RedactionStrategy;
  detect: Required<DetectOptions>;
  maxDepth: number;
}
