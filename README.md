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
import Eventify from "eventify";

const emitter = Eventify.create();

emitter.on("alert", (message) => {
  console.log(message);
});

emitter.trigger("alert", "hello");
// aliases:
emitter.emit("alert", "hello");
emitter.produce("alert", "hello");
```

## Typed Events

```ts
type Events = {
  ready: void;
  "change:title": string;
  data: [string, number];
};

const emitter = Eventify.create<Events>();

emitter.on("data", (name, count) => {
  console.log(name, count);
});

emitter.trigger("data", "hello", 42);
```

## Event Maps + Space-Delimited Names

```ts
const emitter = Eventify.create();

emitter.on({
  "change:title": () => console.log("title"),
  "change:author": () => console.log("author"),
});

emitter.on("open close", () => console.log("toggled"));
```

## Namespaces + Wildcards

Event names are split by `namespaceDelimiter` (default `/`). The `wildcard` token (default `*`) matches segments.

- `*` in the middle matches exactly one segment.
- Trailing `*` matches any remaining suffix segments.
- `*` alone matches any event, but does not include the event name in args; use `"all"` if you need it.
- Leading/trailing delimiters create empty segments that must match exactly.

```ts
const emitter = Eventify.create({
  namespaceDelimiter: "/",
  wildcard: "*",
});

emitter.on("/product/foo/org/123/user/56/*", () => {
  console.log("any account for that user");
});

emitter.on("/product/foo/org/123/*", () => {
  console.log("any user in org 123");
});

emitter.on("/product/foo/*", () => {
  console.log("any org in product foo");
});

emitter.trigger("/product/foo/org/123/user/56/account/abcd");
```

Middle-segment wildcards:

```ts
emitter.on("/product/foo/org/*/tracked-object/*/assesment", () => {
  console.log("any tracked-object assesment within an org");
});
```

Colon namespaces are supported by changing the delimiter:

```ts
const emitter = Eventify.create({
  namespaceDelimiter: ":",
  wildcard: "*",
});

emitter.on("namespace:foo:*", () => {
  console.log("any sub-event in namespace:foo");
});
```

Wildcard patterns work anywhere an event name is accepted (`on`, `once`, `off`, `listenTo`, `listenToOnce`, `stopListening`, `iterate`).

## Schemas (Zod v4 Compatible)

Eventify accepts any schema with `parse` or `safeParse`. Zod works without a hard dependency.

```ts
import { z } from "zod";
import Eventify from "eventify";

const schemas = {
  data: z.tuple([z.string(), z.number()]),
  ready: z.undefined(),
};

const emitter = Eventify.create({
  schemas,
  validate: Eventify.defaultSchemaValidator,
});

emitter.on("data", (name, count) => {
  console.log(name, count);
});

emitter.trigger("data", "hello", 1);
```

Validation runs on `trigger`/`emit`/`produce`. If validation fails, the call throws and no listeners run.

## Error Handling

Listener failures never crash by default. Errors are routed to `onError`.

```ts
const emitter = Eventify.create({
  onError: (error, meta) => {
    console.error(meta.event, error);
  },
});

emitter.on("boom", () => {
  throw new Error("nope");
});

emitter.trigger("boom");
```

## Async Iteration

```ts
const emitter = Eventify.create();
const iterator = emitter.iterate("data");

emitter.trigger("data", "a", 1);

const { value } = await iterator.next();
// value -> ["a", 1]
```

To iterate all events:

```ts
const all = emitter.iterate("all");
emitter.trigger("ready");
const { value } = await all.next();
// value -> ["ready"]
```

Abort iteration with an `AbortSignal`:

```ts
const controller = new AbortController();
const iterator = emitter.iterate("data", { signal: controller.signal });
controller.abort();
```

## Failure Modes + Constraints

- Validation failure: `trigger`/`emit`/`produce` throws and no listeners run (including wildcard and `all`).
- Listener errors: thrown errors or rejected promises are routed to `onError` and do not stop other listeners.
- Invalid callbacks: invoking a non-function throws a `TypeError` that is routed to `onError`.
- `onError` failures: errors thrown by the handler are swallowed to avoid crashing producers.
- `iterate` backpressure: if producers emit faster than you consume, the iterator queue grows. Use `AbortSignal`, `return()`, or stop iteration to release listeners.
- `listenTo`/`listenToOnce`: the target must be an Eventify emitter (or another object with compatible `on`/`once`/`off`).

Constraint tools:

- Payload: `schemas` + `validate` enforce data shape at emit time.
- Cardinality: `once` / `listenToOnce`.
- Lifetime: `off` / `stopListening` / `iterate` + `AbortSignal`.
- Namespace scope: `namespaceDelimiter` + `wildcard`.
- Errors: `onError` centralizes listener failures.

## API Reference

```ts
Eventify.create([options])
Eventify.enable([target], [options])
Eventify.defaultSchemaValidator
```

```ts
on(event, callback, [context])
on({ event: callback, ... }, [context])
on("a b c", callback, [context])
```

```ts
once(event, callback, [context])
once({ event: callback, ... }, [context])
once("a b c", callback, [context])
```

```ts
off()
off(event, [callback], [context])
off({ event: callback, ... }, [context])
```

```ts
trigger(event, ...args)
emit(event, ...args)
produce(event, ...args)
```

```ts
listenTo(other, event, callback)
listenTo(other, { event: callback, ... })
listenToOnce(other, event, callback)
listenToOnce(other, { event: callback, ... })
```

```ts
stopListening([other], [event], [callback])
iterate(event, [options])
```

## Semantics

- Dispatch order: event listeners, then matching patterns, then `"all"`.
- Listener lists are snapshotted at emit time; mutations during dispatch do not affect the current cycle.
- The `context` defaults to the emitter.
- Duplicate registrations are allowed.
- `"all"` is a compatibility feature (Backbone/Eventify style); it is not a standard EventTarget concept.

## Benchmarks

Microbenchmarks live in `BENCHMARKS.md`.

```bash
bun run bench
bun run bench:structures
bun run bench:patterns
```

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

`ci:local` requires `act` installed locally.

```bash
bun run publish
```

## License

MIT
