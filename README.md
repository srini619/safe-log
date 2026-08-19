# safe-log

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

A high-performance, TypeScript-first library that prevents sensitive information and sanitizes (passwords,
tokens, API keys, credentials, card numbers, etc.) from being accidentally exposed in
application logs.

## Table of contents

1. [Why this package exists](#why-this-package-exists)
2. [Installation](#installation)
3. [Basic usage](#basic-usage)
4. [Winston integration](#winston-integration)
5. [Pino integration](#pino-integration)
6. [Console integration](#console-integration)
7. [Configuration](#configuration)
8. [Default sensitive fields](#default-sensitive-fields)
9. [Custom redaction strategies](#custom-redaction-strategies)
10. [String pattern detection (opt-in)](#string-pattern-detection-opt-in)
11. [Security considerations](#security-considerations)
12. [Performance](#performance)
13. [API reference](#api-reference)
14. [Testing](#testing)
15. [Roadmap](#roadmap)
16. [Contributing](#contributing)
17. [License](#license)

## Why this package exists

It's extremely easy to accidentally log a password, bearer token, or credit card number:

```ts
logger.info("request", {
  password: "hunter2",
  authorization: "Bearer eyJhbGciOi...",
});
```

That line just wrote a plaintext credential into your log aggregator, where it may live for
months and be readable by anyone with log access. `safe-log` sits between your application
data and your log sink, recursively stripping known-sensitive fields (and, optionally,
secret-shaped strings) before they're ever written out — with zero runtime dependencies and
negligible per-call overhead.

## Installation

```bash
npm install @srinivas-dev/safe-log
```

Winston and Pino are optional peer dependencies — install whichever you use:

```bash
npm install winston   # if using sanitizeFormat()
npm install pino      # if using sanitizeHook()
```

## Basic usage

```ts
import { sanitize } from "@srinivas-dev/safe-log";

const safe = sanitize({
  user: {
    id: 123,
    email: "john@example.com",
    password: "secret123",
  },
  authentication: {
    accessToken: "abc123",
    refreshToken: "xyz456",
  },
});

// {
//   user: { id: 123, email: "john@example.com", password: "[REDACTED]" },
//   authentication: { accessToken: "[REDACTED]", refreshToken: "[REDACTED]" }
// }
```

`sanitize()` recursively handles plain objects, nested objects, arrays, strings, `Error`
objects, `Date`/`RegExp`/`Buffer`/`Map`/`Set`/`BigInt` values, and circular references — without
mutating the input.

## Winston integration

```ts
import winston from "winston";
import { sanitizeFormat } from "@srinivas-dev/safe-log";

const logger = winston.createLogger({
  format: winston.format.combine(
    sanitizeFormat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

logger.info("User login", {
  userId: 123,
  password: "secret123",
  accessToken: "abc123",
});
// emitted JSON has password/accessToken replaced with "[REDACTED]"
```

`sanitizeFormat()` is a logform-compatible format (`{ transform(info) }`). It preserves
`level`, `message`, and Winston's internal `Symbol.for('level')`/`Symbol.for('message')`
properties, works correctly inside `format.combine()`, and never mutates the original `info`
object.

## Pino integration

Pino has no format-pipeline like Winston; instead, `safe-log` hooks into Pino's
`hooks.logMethod`:

```ts
import pino from "pino";
import { sanitizeHook } from "@srinivas-dev/safe-log";

const logger = pino({ hooks: { logMethod: sanitizeHook() } });

logger.info({ userId: 123, password: "secret123" }, "User login");
```

## Console integration

For quick scripts or anywhere you'd otherwise call `console.log` directly:

```ts
import { safeConsole } from "@srinivas-dev/safe-log";

safeConsole.info("User login", { userId: 123, password: "secret123" });
```

Use `createSafeConsole(options)` to customize behavior, or `createSafeConsole(options, base)`
to wrap a different console-like object (useful in tests).

## Configuration

```ts
sanitize(data, {
  replacement: "[REDACTED]",
  fields: ["customSecret"],
  strategy: "redact",
});
```

| Option        | Type                                            | Default        | Description                                             |
| ------------- | ----------------------------------------------- | -------------- | ------------------------------------------------------- |
| `replacement` | `string`                                        | `"[REDACTED]"` | Value used by the `redact` strategy                     |
| `fields`      | `string[] \| Record<string, RedactionStrategy>` | `[]`           | Extra sensitive fields, or per-field strategy overrides |
| `strategy`    | `RedactionStrategy`                             | `"redact"`     | Default strategy for fields matched only by name        |
| `detect`      | `{ bearer?: boolean; jwt?: boolean }`           | all `false`    | Opt-in string pattern detection                         |
| `maxDepth`    | `number`                                        | `20`           | Recursion depth limit before truncating with a marker   |

Per-field strategy overrides:

```ts
sanitize(data, {
  fields: {
    email: "mask",
    userId: "hash",
    cardNumber: "last4",
  },
});
```

## Default sensitive fields

Matching is case-insensitive and separator-insensitive (`accessToken`, `access_token`, and
`Access-Token` are all treated the same), and always uses **exact** normalized-name matching —
never substring matching — so fields like `validId` or `monkeyKey` are never falsely flagged.

```
password, passwd, pwd, token, accessToken, access_token, refreshToken, refresh_token,
idToken, id_token, authorization, cookie, set-cookie, apiKey, api_key, secret,
clientSecret, client_secret, privateKey, private_key, passphrase, credential,
credentials, cvv, cvc, cardNumber, card_number, ssn
```

Note: generic fields like `email` are **not** in the default list, by design — see
[Security considerations](#security-considerations).

## Custom redaction strategies

| Strategy | Behavior                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| `redact` | Replaces the value with `replacement` (default `"[REDACTED]"`)               |
| `mask`   | Replaces strings with a fixed-length mask; non-strings fall back to `redact` |
| `hash`   | SHA-256 obfuscation hash, formatted as `sha256:<16-hex-chars>`               |
| `last4`  | Keeps only the last 4 characters of a string (fully redacts if shorter)      |

`hash` is an obfuscation aid, **not** a secure/salted hash — low-entropy values (e.g. a 4-digit
PIN) remain guessable via brute force. Don't rely on it for values that must be cryptographically
protected.

## String pattern detection (opt-in)

Field-name redaction is separate from pattern-based redaction. Pattern detection is **disabled
by default** to avoid false positives, and must be explicitly enabled:

```ts
sanitize(data, {
  detect: { jwt: true, bearer: true },
});
```

```
"Authorization: Bearer eyJhbGciOi..." -> "Authorization: Bearer [REDACTED]"
"token=abc.def.ghi"                   -> "token=[REDACTED]"
```

## Security considerations

- **Prototype pollution**: `__proto__`, `prototype`, and `constructor` keys are always skipped;
  output objects are built as plain literals, never via property assignment from untrusted keys.
- **Throwing getters**: every property read is wrapped in `try`/`catch`; a throwing getter
  produces `"[Unreadable]"` instead of crashing the whole call.
- **Circular references**: detected via an ancestor stack (not a "seen anywhere" set, which
  would falsely flag legitimately shared-but-non-cyclic references) and replaced with
  `"[Circular]"`.
- **Deeply nested / adversarial structures**: bounded by `maxDepth` (default 20); beyond that,
  nesting is replaced with `"[MaxDepthExceeded]"` instead of recursing further.
- **No arbitrary code execution**: function-valued properties become `"[Function]"`; `sanitize()`
  never calls `.toJSON()`, `.valueOf()`, or any other implicit conversion.
- **Non-enumerable / symbol-keyed properties**: not traversed by core `sanitize()` by design
  (only own enumerable string keys); the Winston integration explicitly preserves Winston's own
  symbols without inspecting them.
- **No default mutation**: the input is never mutated; a new structure is always returned.
- **Deliberately conservative default field list**: broad terms like `id` or `key` are not
  treated as sensitive on their own, to avoid excessive false positives (see
  [Default sensitive fields](#default-sensitive-fields)).

## Performance

`sanitize()` avoids `JSON.stringify`/`JSON.parse` cloning and expensive regex work unless
pattern detection is explicitly enabled. Benchmarks below were captured with
[tinybench](https://github.com/tinylibs/tinybench) (`npm run bench`) on the development machine
used to build this package — treat them as directional, not a guarantee, and re-run on your own
hardware for production capacity planning.

| Payload                         | Avg latency | Throughput     |
| ------------------------------- | ----------- | -------------- |
| Shallow object                  | ~1.9 µs     | ~538,000 ops/s |
| Deeply nested object (depth 15) | ~5.2 µs     | ~199,000 ops/s |
| Large array (10,000 items)      | ~2.28 ms    | ~443 ops/s     |
| 10 KB object                    | ~58.5 µs    | ~17,500 ops/s  |
| 100 KB object                   | ~600 µs     | ~1,700 ops/s   |
| Circular object                 | ~2.2 µs     | ~480,000 ops/s |

## API reference

### `sanitize<T>(input: T, options?: SanitizeOptions): T`

Recursively sanitizes `input` and returns a new value of the same shape.

### `SanitizeOptions`

```ts
type RedactionStrategy = "redact" | "mask" | "hash" | "last4";

interface SanitizeOptions {
  replacement?: string;
  fields?: string[] | Record<string, RedactionStrategy>;
  strategy?: RedactionStrategy;
  detect?: { bearer?: boolean; jwt?: boolean };
  maxDepth?: number;
}
```

### `sanitizeFormat(options?: SanitizeOptions)`

Returns a logform-compatible format for use in `winston.format.combine(...)`.

### `sanitizeHook(options?: SanitizeOptions)`

Returns a `hooks.logMethod` function for use in `pino({ hooks: { logMethod: sanitizeHook() } })`.

### `createSafeConsole(options?, base?): SafeConsole` / `safeConsole`

Wraps a console-like object (`log`/`info`/`warn`/`error`/`debug`) so object arguments are
sanitized before being logged.

### `defaultSensitiveFields: readonly string[]`

The built-in list of sensitive field names (before normalization).

## Examples

Turning an accidental credential leak into a safe log line:

```ts
logger.info("request", {
  password: "hunter2",
  authorization: "Bearer eyJhbGciOi...",
});
// -> { password: "[REDACTED]", authorization: "[REDACTED]" }
```

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage (target: ≥90%)
```

Tests use [Vitest](https://vitest.dev) and cover basic redaction, nested objects/arrays,
case-insensitive matching, custom fields/replacement/strategies, circular references, `Error`
objects, `Date`/`Buffer`/`BigInt` preservation, symbol properties, throwing getters, deep
nesting, all three framework integrations, input immutability, large payloads, and malformed
input.

## Roadmap

- Broader pattern-based detection (API key shapes, connection strings) behind `detect`
- Fastify and Express request/response log helpers
- Hapi integration
- Optional async/streaming sanitizer for very large payloads

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
