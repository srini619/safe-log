# Contributing to safe-log

Thanks for your interest in contributing!

## Development setup

```bash
npm install
```

## Common scripts

| Script                  | Purpose                                |
| ----------------------- | -------------------------------------- |
| `npm test`              | Run the test suite once                |
| `npm run test:watch`    | Run tests in watch mode                |
| `npm run test:coverage` | Run tests with coverage (target: ≥90%) |
| `npm run typecheck`     | Type-check with `tsc --noEmit`         |
| `npm run lint`          | Lint with ESLint                       |
| `npm run lint:fix`      | Lint and auto-fix                      |
| `npm run format`        | Format with Prettier                   |
| `npm run build`         | Build ESM + CJS + `.d.ts` via tsup     |
| `npm run bench`         | Run the benchmark suite                |

## Before opening a pull request

1. Add or update tests for any behavior change (unit tests for `src/core`, integration
   tests for `src/integrations`).
2. Add a regression test for any bug you fix.
3. Run `npm run typecheck && npm run lint && npm test && npm run test:coverage`.
4. Update `CHANGELOG.md` under "Unreleased".
5. Keep the core sanitizer framework-agnostic — integrations (`src/integrations/*`) may
   depend on core, but core must never import or reference a specific logging framework.

## Reporting security issues

This package is security-sensitive. If you find a bypass, false negative, or prototype
pollution / ReDoS / crash vector, please open an issue describing the input and expected
vs. actual behavior rather than a public exploit write-up.

## Commit style

Use clear, imperative commit messages (e.g. `Add mask strategy for arrays`). Small, focused
commits are preferred over large mixed changes.
