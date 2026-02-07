# Changelog

## [3.0.0] - 2026-02-06

### Breaking

- ESM-only distribution. CommonJS `require()` and global/UMD builds are no longer provided.
- Browser build output moved to `dist/index.js` (the legacy `dist/eventify.min.js` is no longer produced).
- Listener errors no longer crash by default; they are swallowed unless you provide `onError`.
- Node requirement is now >= 20.

### Added

- Strict TypeScript typings for all APIs.
- Optional schema validation via DI (`schemas` + `validate`) with `defaultSchemaValidator` / `setDefaultSchemaValidator` for Zod-compatible `parse`/`safeParse`.
- Namespaced event wildcards with configurable `namespaceDelimiter` and `wildcard`.
- `emit` and `produce` aliases for `trigger`.
- Async iterator API via `iterate()`.
- EventTarget interop (`addEventListener`, `removeEventListener`, `dispatchEvent`) with payloads in `CustomEvent.detail`.
- Named exports: `createEmitter`, `decorateWithEvents`, `setDefaultSchemaValidator`.

### Migration Notes (2.x -> 3.x)

- Replace script-tag usage with ESM imports, or bundle `dist/index.js` into your app.
- If you previously relied on thrown listener errors, provide `onError` and re-throw in your handler if desired.
- Update your tooling to Node 20+.
- If you want schema validation, pass `schemas` and either use `defaultSchemaValidator` or your own validator.
