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

## Guide

### Create an Emitter

```ts
import { createEmitter } from "eventify";

const emitter = createEmitter();
```

You can also mix Eventify into an existing object:

```ts
import { decorateWithEvents } from "eventify";

const target = decorateWithEvents({ name: "service" });
```

### Typed Events

```ts
type Events = {
  ready: void;
  "change:title": string;
  data: [string, number];
};

const emitter = createEmitter<Events>();

emitter.on("data", (name, count) => {
  console.log(name, count);
});

emitter.trigger("data", "hello", 42);
```

### Event Maps + Space-Delimited Names

Event maps and space-delimited names follow Backbone-style conventions.

```ts
emitter.on({
  "change:title": () => console.log("title"),
  "change:author": () => console.log("author"),
});

emitter.on("open close", () => console.log("toggled"));
```

### Namespaces + Wildcards

Event names are split by `namespaceDelimiter` (default `/`). The `wildcard` token (default `*`) matches segments.

- `*` in the middle matches exactly one segment.
- Trailing `*` matches any remaining suffix segments.
- `*` alone matches any event, but does not include the event name in args; use `"all"` if you need it.
- Leading/trailing delimiters create empty segments that must match exactly.

```ts
const emitter = createEmitter({
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
const emitter = createEmitter({
  namespaceDelimiter: ":",
  wildcard: "*",
});

emitter.on("namespace:foo:*", () => {
  console.log("any sub-event in namespace:foo");
});
```

Wildcard patterns work anywhere an event name is accepted.

### Schemas (Zod v4 Compatible)

Eventify accepts any schema with `parse` or `safeParse`. Zod works without a hard dependency.

```ts
import { z } from "zod";
import { createEmitter, setDefaultSchemaValidator } from "eventify";

const schemas = {
  data: z.tuple([z.string(), z.number()]),
  ready: z.undefined(),
};

const emitter = createEmitter({
  schemas,
  validate: setDefaultSchemaValidator,
});

emitter.on("data", (name, count) => {
  console.log(name, count);
});

emitter.trigger("data", "hello", 1);
```

Validation runs on `trigger`/`emit`/`produce`. If validation fails, the call throws and no listeners run.

### Error Handling

Listener failures never crash by default. Errors are routed to `onError`.

```ts
const emitter = createEmitter({
  onError: (error, meta) => {
    console.error(meta.event, error);
  },
});

emitter.on("boom", () => {
  throw new Error("nope");
});

emitter.trigger("boom");
```

### EventTarget Interop

`createEmitter` and `decorateWithEvents` expose `addEventListener`, `removeEventListener`, and `dispatchEvent`.

`trigger`/`emit`/`produce` dispatch a `CustomEvent` with the payload stored in `event.detail`.
If you call `dispatchEvent` yourself, only EventTarget listeners (and matching `on` listeners) run — schemas, patterns, and `"all"` do not.
`detail` is the single payload value for 1-arg events, an array for multi-arg events, and `undefined` for no-arg events.

### Async Iteration

```ts
const emitter = createEmitter();
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

`for await` with abort:

```ts
const controller = new AbortController();

(async () => {
  for await (const value of emitter.iterate("data", { signal: controller.signal })) {
    console.log(value);
    controller.abort();
  }
})();
```

### Failure Modes + Constraints

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

### Semantics

- Dispatch order: event listeners, then matching patterns, then `"all"`.
- Listener lists are snapshotted at emit time; mutations during dispatch do not affect the current cycle.
- The `context` defaults to the emitter.
- Duplicate registrations are allowed.
- `"all"` is a compatibility feature (Backbone/Eventify style); it is not a standard `EventTarget` concept.

## API

### Preferred Named Exports

```ts
createEmitter([options])
decorateWithEvents([target], [options])
setDefaultSchemaValidator(schema, payload, meta)
```

`createEmitter` returns a standalone emitter. `decorateWithEvents` mixes Eventify methods into an existing object.
`setDefaultSchemaValidator` is the default validator function (no global mutation).

### Default Export (Compat)

```ts
Eventify.create([options])
Eventify.enable([target], [options])
Eventify.defaultSchemaValidator
Eventify.version
Eventify.proto
```

The `Eventify` default export remains for compatibility.

### Options

```ts
type EventifyOptions = {
  schemas?: Record<string, SchemaLike>;
  validate?: SchemaValidator;
  onError?: (error: unknown, meta: { event: string; args: unknown[]; listener?: (...args: unknown[]) => unknown; emitter: object }) => void;
  namespaceDelimiter?: string; // default "/"
  wildcard?: string; // default "*"
};
```

### Events

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

`emit` and `produce` are aliases of `trigger`.

### EventTarget Interop

```ts
addEventListener(type, listener, [options])
removeEventListener(type, listener, [options])
dispatchEvent(event)
```

`trigger`/`emit`/`produce` dispatch a `CustomEvent` with the payload stored in `event.detail`.
`dispatchEvent` only uses the EventTarget path (and any `on` listeners for that event type); it does not run schema validation, wildcard patterns, or `"all"` listeners.

### Cross-Emitter Listening

```ts
listenTo(other, event, callback)
listenTo(other, { event: callback, ... })
```

```ts
listenToOnce(other, event, callback)
listenToOnce(other, { event: callback, ... })
```

```ts
stopListening([other], [event], [callback])
```

### Async Iteration

```ts
iterate(event, [options])
```

For `"all"`, each value is `[eventName, ...args]`. For other events, a single argument is yielded as a value; multiple arguments are yielded as an array.

### Type Exports

```ts
EventMap
EventName
EventHandler
EventHandlerMap
SchemaLike
SchemaMap
SchemaValidator
EventsFromSchemas
```

These types are designed for strict inference and optional schema validation.

## Benchmarks + Changelog

- Benchmarks: `BENCHMARKS.md`
- Changelog: `CHANGELOG.md`

## Development + Release

```bash
bun install
bun run format
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
