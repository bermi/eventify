# Eventify API

This is the full API surface for Eventify.

## Preferred Named Exports

```ts
createEmitter([options])
decorateWithEvents([target], [options])
setDefaultSchemaValidator(schema, payload, meta)
```

`createEmitter` returns a standalone emitter. `decorateWithEvents` mixes Eventify methods into an existing object.
`setDefaultSchemaValidator` is the default validator function (no global mutation).

## Default Export (Compat)

```ts
Eventify.create([options])
Eventify.enable([target], [options])
Eventify.defaultSchemaValidator
Eventify.version
Eventify.proto
```

The `Eventify` default export remains for compatibility.

## Options

```ts
type EventifyOptions = {
  schemas?: Record<string, SchemaLike>;
  validate?: SchemaValidator;
  onError?: (error: unknown, meta: { event: string; args: unknown[]; listener?: (...args: unknown[]) => unknown; emitter: object }) => void;
  namespaceDelimiter?: string; // default "/"
  wildcard?: string; // default "*"
};
```

## Events

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

## Cross-Emitter Listening

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

## Async Iteration

```ts
iterate(event, [options])
```

For `"all"`, each value is `[eventName, ...args]`. For other events, a single argument is yielded as a value; multiple arguments are yielded as an array.

## Type Exports

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
