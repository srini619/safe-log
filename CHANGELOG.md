# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- Core `sanitize()` function: recursive, cycle-safe, depth-bounded sanitization of
  plain objects, arrays, `Error`, `Date`, `RegExp`, `Buffer`, `Map`, `Set`, `BigInt`,
  and primitive values.
- Default sensitive field list (password, tokens, secrets, credentials, card/SSN data, etc.)
  with case-insensitive, separator-insensitive, exact-match field matching.
- Configurable `fields` (list or per-field strategy map), `replacement`, `strategy`, and
  `maxDepth` options.
- Redaction strategies: `redact`, `mask`, `hash`, `last4`.
- Opt-in string pattern detection (`detect.bearer`, `detect.jwt`), disabled by default.
- Winston integration: `sanitizeFormat()`.
- Pino integration: `sanitizeHook()`.
- Console integration: `safeConsole` / `createSafeConsole()`.
- Full test suite (Vitest, ≥90% coverage) and benchmark suite (tinybench).
