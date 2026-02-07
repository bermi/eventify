# Eventify

Tiny, zero-dependency event emitter with strict TypeScript types, wildcard namespaces, and optional schema validation.

- ESM only, tree-shakeable
- Node 20+, Bun, modern browsers
- Backbone-style semantics (`all`, listener snapshots, predictable order)

## Install

```bash
npm install eventify
```

## Quickstart

```ts
import { createEmitter } from "eventify";

const emitter = createEmitter();

emitter.on("alert", (message) => {
  console.log(message);
});

emitter.trigger("alert", "hello");
```

## Async Iteration (for-await)

```ts
const controller = new AbortController();

(async () => {
  for await (const value of emitter.iterate("data", { signal: controller.signal })) {
    console.log(value);
    controller.abort();
  }
})();
```

## Docs

- Guide: `docs/guide.md`
- API: `docs/api.md`
- Benchmarks: `BENCHMARKS.md`
- Changelog: `CHANGELOG.md`

## Development + Release

```bash
bun install
bun test --coverage
bun run build:all
bunx playwright install --with-deps chromium
bun run test:browser
bun run test:all
bun run ci:local
```

```bash
bun run publish
```

`ci:local` requires `act` installed locally.

## License

MIT
