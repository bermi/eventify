# Eventify Guide

This guide focuses on how to use Eventify effectively and safely.

## Create an Emitter

```ts
import { createEmitter } from "eventify";

const emitter = createEmitter();
```

Examples below assume `createEmitter` is in scope.

You can also mix Eventify into an existing object:

```ts
import { decorateWithEvents } from "eventify";

const target = decorateWithEvents({ name: "service" });
```

## Typed Events

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

## Event Maps + Space-Delimited Names

Event maps and space-delimited names follow Backbone-style conventions.

```ts
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

## Schemas (Zod v4 Compatible)

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

## Error Handling

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

## EventTarget Interop

`createEmitter` and `decorateWithEvents` expose `addEventListener`, `removeEventListener`, and `dispatchEvent`.

`trigger`/`emit`/`produce` dispatch a `CustomEvent` with the payload stored in `event.detail`.
If you call `dispatchEvent` yourself, only EventTarget listeners (and matching `on` listeners) run — schemas, patterns, and `"all"` do not.
`detail` is the single payload value for 1-arg events, an array for multi-arg events, and `undefined` for no-arg events.

## Async Iteration

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
const emitter = createEmitter();
const controller = new AbortController();

(async () => {
  for await (const value of emitter.iterate("data", { signal: controller.signal })) {
    console.log(value);
    controller.abort();
  }
})();
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

## Semantics

- Dispatch order: event listeners, then matching patterns, then `"all"`.
- Listener lists are snapshotted at emit time; mutations during dispatch do not affect the current cycle.
- The `context` defaults to the emitter.
- Duplicate registrations are allowed.
- `"all"` is a compatibility feature (Backbone/Eventify style); it is not a standard `EventTarget` concept.
