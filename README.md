# Eventify

Eventify is a tiny, zero-dependency event emitter with strict TypeScript types, wildcard namespaces, and optional runtime validation.

The goal is a modern, minimal DX that keeps the original Eventify ergonomics while preserving Backbone-style semantics (`all`, listener snapshots, predictable ordering).

## Design Goals

- Keep the original Eventify surface (`on`, `once`, `off`, `trigger`, `listenTo`, `listenToOnce`, `stopListening`).
- Ship zero runtime dependencies and optional schema validation via DI.
- Stay small and tree-shakeable (ESM only).
- Support namespaced events with wildcards (e.g. `namespace:foo:*` or `/product/foo/*`).
- Allow configurable namespace delimiter (default `/`).
- Preserve original semantics: snapshot listeners at emit time and support `"all"`.

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

## Namespaced Events + Wildcards

Event names can be hierarchical. Listeners may subscribe to exact names or wildcard patterns.

By default the namespace delimiter is `/` and the wildcard is `*`.

- A trailing `*` matches any remaining suffix segments.
- A `*` in the middle matches exactly one segment.

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

Wildcard patterns are accepted anywhere an event name is accepted (`on`, `once`, `off`, `listenTo`, `listenToOnce`, `stopListening`, `iterate`).

## Options

```ts
type EventifyOptions = {
  schemas?: Record<string, { parse?: Function; safeParse?: Function }>;
  validate?: (schema: unknown, payload: unknown, meta: { event: string }) => unknown;
  onError?: (error: unknown, meta: { event: string; args: unknown[]; listener?: Function; emitter: object }) => void;
  namespaceDelimiter?: string; // default "/"
  wildcard?: string; // default "*"
};

const emitter = Eventify.create(options);
```

If `schemas` are provided and `validate` is omitted, `defaultSchemaValidator` is used automatically.

## "all" Event

Listeners bound to `"all"` are called for every event and receive the event name as the first argument.

```ts
emitter.on("all", (eventName, ...args) => {
  console.log(eventName, args);
});
```

## listenTo / stopListening

```ts
const a = Eventify.create();
const b = Eventify.create();

a.listenTo(b, "ready", () => console.log("ready"));

b.trigger("ready");

a.stopListening();
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

## Schema Validation (Zod v4 Compatible)

Eventify accepts any schema object with `parse` or `safeParse`. This works with Zod without a hard dependency.

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

Validation runs on `trigger`. If validation fails, `trigger` throws and listeners are not called.

## Failure Modes and Behavior

- Validation failure: `trigger`/`emit`/`produce` throws and no listeners run (including wildcard and `all`).
- Listener errors: thrown errors or rejected promises are routed to `onError` and do not stop other listeners.
- Invalid callbacks: if a non-function is registered, invoking it triggers a runtime `TypeError` which is routed to `onError`.
- `iterate` backpressure: if producers emit faster than you consume, the iterator queue grows. Use `AbortSignal`, `return()`, or stop iteration to release listeners.
- `listenTo`/`listenToOnce`: the target must be an Eventify emitter (or another object with compatible `on`/`once`/`off`). Otherwise behavior is undefined.

## Defining Constraints

Use these methods/options to enforce constraints:

- Payload constraints: `schemas` + `validate` run on `trigger`/`emit`/`produce`. Throwing blocks delivery.
- Cardinality constraints: `once` / `listenToOnce` enforce single-fire listeners.
- Lifetime constraints: `off` / `stopListening` remove listeners; `iterate` supports `AbortSignal`.
- Namespace constraints: `namespaceDelimiter` and `wildcard` define matching rules for hierarchical event names.
- Error constraints: `onError` centralizes listener errors without crashing.

## Constraints and Guarantees

- Event names are split by `namespaceDelimiter`. Leading or trailing delimiters create empty segments that must match exactly.
- `wildcard` should be a non-empty token that does not equal the delimiter.
- A `*` in the middle matches exactly one segment; a trailing `*` matches any remaining suffix segments.
- `*` alone matches any event but does not include the event name in callback args; use `"all"` if you need it.
- Schema validation runs on emit. For multi-arg events, schemas must return an array/tuple or `trigger` throws.
- `onError` is best-effort; if it throws, the error is swallowed to avoid crashing.

## Wildcard Rules

Event names are split by the configured `namespaceDelimiter`. The wildcard token matches segments.

- A `*` in the middle matches exactly one segment.
- A trailing `*` matches any remaining suffix segments.
- `*` alone matches any event (but does not include the event name in the callback).

If you need the event name, use `"all"` instead of `*`.

## API Reference

```ts
on(event, callback, [context])
on({ event: callback, ... }, [context])
on("a b c", callback, [context])
```
`on` binds a listener. The optional `context` becomes `this` inside the callback. The default context is the emitter.

```ts
once(event, callback, [context])
once({ event: callback, ... }, [context])
once("a b c", callback, [context])
```
`once` is like `on` but auto-removes the listener after it fires the first time.

```ts
off()
off(event, [callback], [context])
off({ event: callback, ... }, [context])
```
`off` removes listeners. Omitting all args removes everything.

```ts
trigger(event, ...args)
emit(event, ...args)
produce(event, ...args)
```
`emit` and `produce` are aliases of `trigger`.

```ts
listenTo(other, event, callback)
listenTo(other, { event: callback, ... })
```
`listenTo` registers listeners on another emitter and tracks them for bulk removal. The listener `context` is always the calling object.

```ts
listenToOnce(other, event, callback)
listenToOnce(other, { event: callback, ... })
```
`listenToOnce` is the `once` variant of `listenTo`.

```ts
stopListening([other], [event], [callback])
```
`stopListening` removes tracked listeners. Omitting all args removes everything.

```ts
iterate(event, [options])
```
`iterate` returns an `AsyncIterableIterator`. For `"all"`, each value is `[eventName, ...args]`. For other events, a single argument is yielded as a value; multiple arguments are yielded as an array.

## Notes

- Dispatch order is event listeners, then matching patterns, then `"all"`.
- Listener lists are snapshotted at trigger time; changes during a dispatch do not affect the current cycle.
- Implementation uses a lightweight internal dispatcher (not native `EventTarget`) to preserve Eventify/Backbone semantics.
- `"all"` is a compatibility feature (Backbone/Eventify style); it is not a standard EventTarget concept.
- Duplicate registrations are allowed; the same callback can be invoked multiple times if registered multiple times.
- This is ESM-only. Builds are tree-shakeable.

## Benchmarks

Microbenchmarks live in `BENCHMARKS.md`.

```bash
bun run bench
bun run bench:structures
```

## Development

```bash
bun install
bun test --coverage
bun run build:all
bunx playwright install --with-deps chromium
bun run test:browser
bun run test:all
```

## License

MIT
