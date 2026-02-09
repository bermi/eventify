/* Eventify v3 - type-safe, schema-optional */

export type EventMap = Record<string, unknown>;

export type PayloadArgs<T> = [T] extends [void]
  ? []
  : [T] extends [undefined]
    ? []
    : T extends readonly unknown[]
      ? T
      : [T];

// #1: PayloadValue removed (was identity type: both branches returned T)

export type EventName<Events extends EventMap> = Extract<keyof Events, string>;

export type EventHandler<T> = (...args: PayloadArgs<T>) => unknown;

export type AllHandler<Events extends EventMap> = (
  event: EventName<Events>,
  ...args: unknown[]
) => unknown;

export type EventHandlerMap<Events extends EventMap> = {
  [K in keyof Events]?: EventHandler<Events[K]>;
};

export type SchemaLike<T = unknown> =
  | { parse: (input: unknown) => T }
  | {
      safeParse: (
        input: unknown,
      ) => { success: true; data: T } | { success: false; error: unknown };
    };

export type SchemaMap = Record<string, SchemaLike>;

export type InferSchema<S> = S extends { parse: (input: unknown) => infer T }
  ? T
  : S extends {
        safeParse: (input: unknown) => { success: true; data: infer T };
      }
    ? T
    : unknown;

export type EventsFromSchemas<TSchemas> = TSchemas extends SchemaMap
  ? { [K in keyof TSchemas]: InferSchema<TSchemas[K]> }
  : EventMap;

export type ValidationMeta = { event: string };

export type SchemaValidator<TSchema extends SchemaLike = SchemaLike> = (
  schema: TSchema,
  payload: unknown,
  meta: ValidationMeta,
) => unknown;

export type ErrorMeta<Events extends EventMap> = {
  event: EventName<Events> | string;
  args: unknown[];
  listener?: (...args: unknown[]) => unknown;
  emitter: object;
};

export type ErrorHandler<Events extends EventMap> = (
  error: unknown,
  meta: ErrorMeta<Events>,
) => void;

export type EventifyOptions<
  TSchemas extends SchemaMap | undefined = undefined,
  TEvents extends EventMap = EventMap,
> = {
  schemas?: TSchemas;
  validate?: SchemaValidator;
  onError?: ErrorHandler<TEvents>;
  namespaceDelimiter?: string;
  wildcard?: string;
};

export type IterateOptions = {
  signal?: AbortSignal;
};

export interface EventifyEmitter<Events extends EventMap = EventMap> {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
  dispatchEvent(event: Event): boolean;

  on<K extends EventName<Events>>(
    name: K,
    callback: EventHandler<Events[K]>,
    context?: unknown,
  ): this;
  on(name: "all", callback: AllHandler<Events>, context?: unknown): this;
  on(name: EventHandlerMap<Events>, context?: unknown): this;
  on(
    name: string,
    callback?: (...args: unknown[]) => unknown,
    context?: unknown,
  ): this;

  once<K extends EventName<Events>>(
    name: K,
    callback: EventHandler<Events[K]>,
    context?: unknown,
  ): this;
  once(name: "all", callback: AllHandler<Events>, context?: unknown): this;
  once(name: EventHandlerMap<Events>, context?: unknown): this;
  once(
    name: string,
    callback?: (...args: unknown[]) => unknown,
    context?: unknown,
  ): this;

  off(): this;
  off<K extends EventName<Events>>(
    name: K,
    callback?: EventHandler<Events[K]> | null,
    context?: unknown,
  ): this;
  off(name: EventHandlerMap<Events>, context?: unknown): this;
  off(
    name?: string | null,
    callback?: ((...args: unknown[]) => unknown) | null,
    context?: unknown,
  ): this;

  trigger<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  trigger(name: string, ...args: unknown[]): this;
  emit<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  emit(name: string, ...args: unknown[]): this;
  produce<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  produce(name: string, ...args: unknown[]): this;

  listenTo<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(
    other: EventifyEmitter<OtherEvents>,
    name: K,
    callback: EventHandler<OtherEvents[K]>,
  ): this;
  listenTo<OtherEvents extends EventMap>(
    other: EventifyEmitter<OtherEvents>,
    name: EventHandlerMap<OtherEvents>,
  ): this;
  listenTo(
    other: EventifyEmitter<EventMap>,
    name: string,
    callback?: (...args: unknown[]) => unknown,
  ): this;

  listenToOnce<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(
    other: EventifyEmitter<OtherEvents>,
    name: K,
    callback: EventHandler<OtherEvents[K]>,
  ): this;
  listenToOnce<OtherEvents extends EventMap>(
    other: EventifyEmitter<OtherEvents>,
    name: EventHandlerMap<OtherEvents>,
  ): this;
  listenToOnce(
    other: EventifyEmitter<EventMap>,
    name: string,
    callback?: (...args: unknown[]) => unknown,
  ): this;

  stopListening<OtherEvents extends EventMap>(
    other?: EventifyEmitter<OtherEvents> | null,
    name?: EventName<OtherEvents> | EventHandlerMap<OtherEvents> | null,
    callback?: ((...args: unknown[]) => unknown) | null,
  ): this;

  iterate<K extends EventName<Events>>(
    name: K,
    options?: IterateOptions,
  ): AsyncIterableIterator<Events[K]>;
  iterate(
    name: "all",
    options?: IterateOptions,
  ): AsyncIterableIterator<[EventName<Events>, ...unknown[]]>;
  iterate(
    name: string,
    options?: IterateOptions,
  ): AsyncIterableIterator<unknown>;
}

export interface EventifyStatic<
  Events extends EventMap = EventMap,
> extends EventifyEmitter<Events> {
  version: string;
  enable<TTarget extends object, TSchemas extends SchemaMap>(
    target: TTarget | undefined,
    options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
      schemas: TSchemas;
    },
  ): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
  enable<
    TTarget extends object,
    TEvents extends EventMap = EventMap,
    TSchemas extends SchemaMap | undefined = undefined,
  >(
    target?: TTarget,
    options?: EventifyOptions<TSchemas, TEvents>,
  ): TTarget & EventifyEmitter<TEvents>;
  create<TSchemas extends SchemaMap>(
    options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
      schemas: TSchemas;
    },
  ): EventifyEmitter<EventsFromSchemas<TSchemas>>;
  create<
    TEvents extends EventMap = EventMap,
    TSchemas extends SchemaMap | undefined = undefined,
  >(
    options?: EventifyOptions<TSchemas, TEvents>,
  ): EventifyEmitter<TEvents>;
  mixin: EventifyStatic["enable"];
  proto: EventifyEmitter<EventMap>;
  defaultSchemaValidator: SchemaValidator;
}

type AnyCallback = (...args: unknown[]) => unknown;
type AnyEmitter = EventifyEmitter<EventMap>;

type CallbackWithOriginal = AnyCallback & {
  _callback?: AnyCallback;
};

// #12: context = user-provided value for identity matching in off()
//      bound   = resolved execution context (context ?? emitter) for .apply()
type ListenerEntry = {
  callback: CallbackWithOriginal;
  context?: unknown;
  bound: unknown;
};

// #4: Single pattern type (removed PrefixPatternEntry fast path)
type PatternEntry = ListenerEntry & {
  pattern: string;
  segments: string[];
  trailingWildcard: boolean;
};

type EmitterState = {
  events: Map<string, ListenerEntry[]>;
  patterns: PatternEntry[];
  all: ListenerEntry[];
  listeningTo: Set<AnyEmitter>;
  target: EventTarget;
  dispatchers: Map<string, EventListener>;
  // #5: Simplified from Map<string, Set<EventListenerOrEventListenerObject>>.
  // Conservative one-way set: names are added on addEventListener, never removed.
  nativeEvents: Set<string>;
  schemas: SchemaMap | undefined;
  validate: SchemaValidator | undefined;
  onError: ErrorHandler<EventMap>;
  namespaceDelimiter: string;
  wildcard: string;
};

const eventSplitter = /\s+/;
const eventifyArgsKey: unique symbol = Symbol("eventifyArgs");
const eventifyListenersKey: unique symbol = Symbol("eventifyListeners");

type EventifyCustomEvent = CustomEvent<unknown> & {
  [eventifyArgsKey]?: unknown[];
  [eventifyListenersKey]?: ListenerEntry[];
};

const stateByEmitter = new WeakMap<object, EmitterState>();

function noop(): void {}

function reportError(
  state: EmitterState,
  error: unknown,
  meta: ErrorMeta<EventMap>,
): void {
  try {
    state.onError?.(error, meta);
  } catch {
    // Swallow error handler failures to avoid crashes.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

function safeCall(
  state: EmitterState,
  callback: CallbackWithOriginal,
  bound: unknown,
  args: unknown[],
  meta: ErrorMeta<EventMap>,
): void {
  try {
    const result = callback.apply(bound, args);
    if (isPromiseLike(result)) {
      result.then(undefined, (error: unknown) =>
        reportError(state, error, meta),
      );
    }
  } catch (error) {
    reportError(state, error, meta);
  }
}

function getEventArgs(event: Event): unknown[] {
  const customEvent = event as EventifyCustomEvent;
  const stored = customEvent[eventifyArgsKey];
  if (stored) {
    return stored;
  }
  if ("detail" in customEvent) {
    const detail = (customEvent as CustomEvent<unknown>).detail;
    if (detail === undefined) {
      return [];
    }
    return Array.isArray(detail) ? detail : [detail];
  }
  return [];
}

function createEvent(name: string, args: unknown[]): CustomEvent<unknown> {
  const detail = args.length <= 1 ? args[0] : args;
  const event = new CustomEvent(name, { detail }) as EventifyCustomEvent;
  Object.defineProperty(event, eventifyArgsKey, {
    value: args,
    enumerable: false,
  });
  return event;
}

// #6: Returns true when `name` is a single event string (caller should proceed).
// Returns false when object-map or space-delimited events were already dispatched.
type EventApiAction = "on" | "once" | "off" | "trigger";
function eventsApi(
  obj: AnyEmitter,
  action: EventApiAction,
  name: unknown,
  rest: unknown[],
): boolean {
  if (!name) {
    return true;
  }
  const target = obj as EventifyEmitter<EventMap>;
  const method = target[action] as (...args: unknown[]) => unknown;
  if (typeof name === "object") {
    for (const key in name as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(name, key)) {
        method.call(
          target,
          key,
          (name as Record<string, unknown>)[key],
          ...rest,
        );
      }
    }
    return false;
  }
  if (typeof name === "string" && eventSplitter.test(name)) {
    for (const eventName of name.split(eventSplitter)) {
      method.call(target, eventName, ...rest);
    }
    return false;
  }
  return true;
}

export function defaultSchemaValidator(
  schema: SchemaLike,
  payload: unknown,
  _meta: ValidationMeta,
): unknown {
  if (schema && typeof (schema as { parse?: unknown }).parse === "function") {
    return (schema as { parse: (input: unknown) => unknown }).parse(payload);
  }
  if (
    schema &&
    typeof (schema as { safeParse?: unknown }).safeParse === "function"
  ) {
    const result = (
      schema as {
        safeParse: (input: unknown) => {
          success: boolean;
          data?: unknown;
          error?: unknown;
        };
      }
    ).safeParse(payload);
    if (result && result.success) {
      return result.data;
    }
    throw result?.error ?? new Error("Schema validation failed");
  }
  throw new TypeError("Schema validator missing parse/safeParse");
}

function getState(target: object, options?: EventifyOptions): EmitterState {
  let state = stateByEmitter.get(target);
  if (!state) {
    const created: EmitterState = {
      events: new Map(),
      patterns: [],
      all: [],
      listeningTo: new Set(),
      target: new EventTarget(),
      dispatchers: new Map(),
      nativeEvents: new Set(),
      schemas: options?.schemas,
      validate: options?.validate,
      onError: options?.onError ?? noop,
      namespaceDelimiter: options?.namespaceDelimiter ?? "/",
      wildcard: options?.wildcard ?? "*",
    };
    if (options?.schemas && !created.validate) {
      created.validate = defaultSchemaValidator;
    }
    stateByEmitter.set(target, created);
    return created;
  }
  if (options) {
    if (options.schemas) {
      state.schemas = options.schemas;
      if (!state.validate) {
        state.validate = defaultSchemaValidator;
      }
    }
    if (options.validate) {
      state.validate = options.validate;
    }
    if (options.onError) {
      state.onError = options.onError;
    }
    if (options.namespaceDelimiter) {
      state.namespaceDelimiter = options.namespaceDelimiter;
    }
    if (options.wildcard) {
      state.wildcard = options.wildcard;
    }
  }
  return state;
}

function getExistingState(target: object): EmitterState | undefined {
  return stateByEmitter.get(target);
}

function normalizeValidatedArgs(
  state: EmitterState,
  event: string,
  args: unknown[],
): unknown[] {
  if (!state.schemas) {
    return args;
  }
  const schema = state.schemas[event];
  if (!schema) {
    return args;
  }
  const validator = state.validate ?? defaultSchemaValidator;
  if (args.length === 0) {
    validator(schema, undefined, { event });
    return [];
  }
  const payload = args.length === 1 ? args[0] : args;
  const parsed = validator(schema, payload, { event });
  if (args.length === 1) {
    return [parsed];
  }
  if (!Array.isArray(parsed)) {
    throw new TypeError(
      `Schema for event "${event}" must return an array/tuple for multi-arg events`,
    );
  }
  return parsed;
}

function splitName(name: string, delimiter: string): string[] {
  return delimiter ? name.split(delimiter) : [name];
}

function isPatternName(state: EmitterState, name: string): boolean {
  const wildcard = state.wildcard;
  if (!wildcard) {
    return false;
  }
  if (name.indexOf(wildcard) === -1) {
    return false;
  }
  const delimiter = state.namespaceDelimiter;
  const segments = splitName(name, delimiter);
  return segments.includes(wildcard);
}

// #4: Single match function for all pattern types (removed prefix fast path)
function matchesPatternSegments(
  state: EmitterState,
  entry: PatternEntry,
  eventSegments: string[],
): boolean {
  const wildcard = state.wildcard;
  const patternSegments = entry.segments;
  const patternLength = patternSegments.length;
  const eventLength = eventSegments.length;

  if (entry.trailingWildcard) {
    if (eventLength < patternLength) {
      return false;
    }
  } else if (eventLength !== patternLength) {
    return false;
  }

  const lastIndex = entry.trailingWildcard ? patternLength - 1 : patternLength;
  for (let i = 0; i < lastIndex; i += 1) {
    if (
      patternSegments[i] !== wildcard &&
      patternSegments[i] !== eventSegments[i]
    ) {
      return false;
    }
  }

  return true;
}

function addListener(
  emitter: object,
  name: string,
  callback: CallbackWithOriginal,
  context?: unknown,
): void {
  const state = getState(emitter);
  const bound = context ?? emitter;
  const entry: ListenerEntry = { callback, context, bound };

  if (name === "all") {
    state.all.push(entry);
    return;
  }
  // #4: All pattern listeners use the segments path
  if (isPatternName(state, name)) {
    const segments = splitName(name, state.namespaceDelimiter);
    const trailingWildcard = segments[segments.length - 1] === state.wildcard;
    state.patterns.push({
      ...entry,
      pattern: name,
      segments,
      trailingWildcard,
    });
    return;
  }

  let list = state.events.get(name);
  if (!list) {
    list = [];
    state.events.set(name, list);
  }
  if (!state.dispatchers.has(name)) {
    const dispatcher: EventListener = (event) => {
      const args = getEventArgs(event);
      const snapshot =
        (event as EventifyCustomEvent)[eventifyListenersKey] ??
        state.events.get(name) ??
        [];
      for (const listenerEntry of snapshot) {
        safeCall(state, listenerEntry.callback, listenerEntry.bound, args, {
          event: name,
          args,
          listener: listenerEntry.callback,
          emitter,
        });
      }
    };
    state.dispatchers.set(name, dispatcher);
    state.target.addEventListener(name, dispatcher);
  }
  list.push(entry);
}

function removeListener(
  state: EmitterState,
  name: string,
  callback?: CallbackWithOriginal | null,
  context?: unknown,
): void {
  const matches = (entry: ListenerEntry): boolean => {
    const cb = callback as CallbackWithOriginal | null | undefined;
    const cbMatches =
      !cb || cb === entry.callback || cb === entry.callback._callback;
    const ctxMatches = !context || context === entry.context;
    return cbMatches && ctxMatches;
  };

  // #8: Use filter instead of manual loop with empty if block
  if (name === "all") {
    state.all = state.all.filter((e) => !matches(e));
    return;
  }
  if (isPatternName(state, name)) {
    state.patterns = state.patterns.filter(
      (e) => e.pattern !== name || !matches(e),
    );
    return;
  }

  const list = state.events.get(name);
  if (!list) {
    return;
  }
  const retained = list.filter((e) => !matches(e));
  if (retained.length) {
    state.events.set(name, retained);
  } else {
    state.events.delete(name);
    const dispatcher = state.dispatchers.get(name);
    if (dispatcher) {
      state.target.removeEventListener(name, dispatcher);
      state.dispatchers.delete(name);
    }
  }
}

// #13: Check whether any listeners on targetState have the given context.
// Used by stopListening to clean up stale listeningTo references.
function hasListenersWithContext(
  targetState: EmitterState,
  context: unknown,
): boolean {
  for (const [, list] of targetState.events) {
    for (const entry of list) {
      if (entry.context === context) return true;
    }
  }
  for (const entry of targetState.patterns) {
    if (entry.context === context) return true;
  }
  for (const entry of targetState.all) {
    if (entry.context === context) return true;
  }
  return false;
}

// #7: Shared helper for listenTo and listenToOnce
function listenToHelper(
  self: AnyEmitter,
  obj: unknown,
  name: unknown,
  callback: unknown,
  method: "on" | "once",
): AnyEmitter {
  if (!obj) return self;
  const state = getState(self);
  state.listeningTo.add(obj as AnyEmitter);
  const target = obj as AnyEmitter;
  if (name && typeof name === "object") {
    target[method](name as EventHandlerMap<EventMap>, self);
  } else {
    target[method](
      name as string,
      callback as CallbackWithOriginal | undefined,
      self,
    );
  }
  return self;
}

function iterate(
  this: AnyEmitter,
  name: "all",
  options?: IterateOptions,
): AsyncIterableIterator<[EventName<EventMap>, ...unknown[]]>;
function iterate(
  this: AnyEmitter,
  name: string,
  options?: IterateOptions,
): AsyncIterableIterator<unknown>;
function iterate(
  this: AnyEmitter,
  name: string,
  options?: IterateOptions,
): AsyncIterableIterator<unknown> {
  const emitter = this as AnyEmitter;
  // #14: Queue is unbounded by design. Producers that emit faster than
  // consumers read will grow this array indefinitely. Use AbortSignal
  // or return() to bound lifetime.
  const queue: unknown[] = [];
  let pending: ((value: IteratorResult<unknown>) => void) | null = null;
  let done = false;
  const isAll = name === "all";

  const handler = (...args: unknown[]) => {
    if (done) {
      return;
    }
    const value = isAll ? args : args.length === 1 ? args[0] : args;
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve({ value, done: false });
      return;
    }
    queue.push(value);
  };

  emitter.on(name, handler);

  const stop = () => {
    if (done) {
      return;
    }
    done = true;
    emitter.off(name, handler);
    if (pending) {
      const resolve = pending;
      pending = null;
      resolve({ value: undefined, done: true });
    }
  };

  if (options?.signal) {
    if (options.signal.aborted) {
      stop();
    } else {
      options.signal.addEventListener("abort", stop, { once: true });
    }
  }

  const iterator: AsyncIterableIterator<unknown> = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    next() {
      if (queue.length) {
        const value = queue.shift() as unknown;
        return Promise.resolve({ value, done: false });
      }
      if (done) {
        return Promise.resolve({ value: undefined, done: true });
      }
      return new Promise((resolve) => {
        pending = resolve;
      });
    },
    return() {
      stop();
      return Promise.resolve({ value: undefined, done: true });
    },
    throw(error) {
      stop();
      return Promise.reject(error);
    },
  };

  return iterator;
}

const proto: EventifyEmitter<EventMap> = {
  // #5: Simplified — just forward to EventTarget and flag the event name.
  addEventListener(
    this: AnyEmitter,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    const state = getState(this);
    state.target.addEventListener(type, listener, options);
    if (listener) {
      state.nativeEvents.add(type);
    }
  },

  removeEventListener(
    this: AnyEmitter,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    const state = getExistingState(this);
    if (!state) {
      return;
    }
    state.target.removeEventListener(type, listener, options);
  },

  dispatchEvent(this: AnyEmitter, event: Event) {
    const state = getState(this);
    return state.target.dispatchEvent(event);
  },

  on(this: AnyEmitter, name: unknown, callback?: unknown, context?: unknown) {
    if (!eventsApi(this, "on", name, [callback, context]) || !callback) {
      return this;
    }
    addListener(
      this,
      name as string,
      callback as CallbackWithOriginal,
      context,
    );
    return this;
  },

  once(this: AnyEmitter, name: unknown, callback?: unknown, context?: unknown) {
    if (!eventsApi(this, "once", name, [callback, context]) || !callback) {
      return this;
    }
    const self = this as AnyEmitter;
    let ran = false;
    const onceListener: CallbackWithOriginal = function (
      this: unknown,
      ...args: unknown[]
    ) {
      if (ran) {
        return undefined;
      }
      ran = true;
      self.off(name as string, onceListener, context);
      return (callback as CallbackWithOriginal).apply(this, args);
    } as CallbackWithOriginal;
    onceListener._callback = callback as CallbackWithOriginal;
    return (this as AnyEmitter).on(name as string, onceListener, context);
  },

  off(this: AnyEmitter, name?: unknown, callback?: unknown, context?: unknown) {
    const state = getExistingState(this);
    if (!state || !eventsApi(this, "off", name, [callback, context])) {
      return this;
    }
    if (!name && !callback && !context) {
      for (const [eventName, dispatcher] of state.dispatchers) {
        state.target.removeEventListener(eventName, dispatcher);
      }
      state.events.clear();
      state.dispatchers.clear();
      state.patterns = [];
      state.all = [];
      return this;
    }

    // #9: When name is provided, remove directly. Otherwise iterate each
    // collection without materializing an intermediate Set from .map().
    if (name) {
      removeListener(
        state,
        name as string,
        callback as CallbackWithOriginal,
        context,
      );
    } else {
      for (const eventName of [...state.events.keys()]) {
        removeListener(
          state,
          eventName,
          callback as CallbackWithOriginal,
          context,
        );
      }
      const seenPatterns = new Set<string>();
      for (const entry of state.patterns) {
        if (!seenPatterns.has(entry.pattern)) {
          seenPatterns.add(entry.pattern);
          removeListener(
            state,
            entry.pattern,
            callback as CallbackWithOriginal,
            context,
          );
        }
      }
      if (state.all.length) {
        removeListener(state, "all", callback as CallbackWithOriginal, context);
      }
    }
    return this;
  },

  trigger(this: AnyEmitter, name: unknown, ...args: unknown[]) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    if (!eventsApi(this, "trigger", name, args)) {
      return this;
    }

    const eventName = name as string;
    const validatedArgs = normalizeValidatedArgs(state, eventName, args);

    const eventSnapshot = state.events.get(eventName)?.slice() ?? null;
    const patternSnapshot = state.patterns.length
      ? state.patterns.slice()
      : null;
    const allSnapshot = state.all.length ? state.all.slice() : null;

    // #5: When native addEventListener listeners exist for this event,
    // dispatch through EventTarget so both eventify and native listeners fire.
    // The eventifyListenersKey carries the snapshot for the dispatcher.
    // Otherwise call eventify listeners directly (avoids CustomEvent overhead).
    if (state.nativeEvents.has(eventName)) {
      const event = createEvent(eventName, validatedArgs);
      if (eventSnapshot?.length) {
        Object.defineProperty(event, eventifyListenersKey, {
          value: eventSnapshot,
          enumerable: false,
        });
      }
      state.target.dispatchEvent(event);
    } else if (eventSnapshot?.length) {
      for (const entry of eventSnapshot) {
        safeCall(state, entry.callback, entry.bound, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this,
        });
      }
    }

    if (patternSnapshot) {
      let eventSegments: string[] | null = null;
      for (const entry of patternSnapshot) {
        // #4: Single segments-based match for all patterns
        if (!eventSegments) {
          eventSegments = splitName(eventName, state.namespaceDelimiter);
        }
        if (!matchesPatternSegments(state, entry, eventSegments)) {
          continue;
        }
        safeCall(state, entry.callback, entry.bound, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this,
        });
      }
    }

    if (allSnapshot) {
      for (const entry of allSnapshot) {
        safeCall(
          state,
          entry.callback,
          entry.bound,
          [eventName, ...validatedArgs],
          {
            event: eventName,
            args: validatedArgs,
            listener: entry.callback,
            emitter: this,
          },
        );
      }
    }

    return this;
  },

  emit(this: AnyEmitter, name: unknown, ...args: unknown[]) {
    return (this as AnyEmitter).trigger(name as string, ...args);
  },

  produce(this: AnyEmitter, name: unknown, ...args: unknown[]) {
    return (this as AnyEmitter).trigger(name as string, ...args);
  },

  // #7: Deduplicated — both delegate to listenToHelper
  listenTo(this: AnyEmitter, obj: unknown, name: unknown, callback?: unknown) {
    return listenToHelper(this, obj, name, callback, "on");
  },

  listenToOnce(
    this: AnyEmitter,
    obj: unknown,
    name: unknown,
    callback?: unknown,
  ) {
    return listenToHelper(this, obj, name, callback, "once");
  },

  stopListening(
    this: AnyEmitter,
    obj?: unknown,
    name?: unknown,
    callback?: unknown,
  ) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    const removeAll = !name && !callback;

    const targets: AnyEmitter[] = obj
      ? [obj as AnyEmitter]
      : [...state.listeningTo.values()];

    for (const target of targets) {
      if (name && typeof name === "object") {
        target.off(name as EventHandlerMap<EventMap>, this);
      } else {
        target.off(
          name as string | null | undefined,
          callback as CallbackWithOriginal | null | undefined,
          this,
        );
      }
      // #13: Clean up stale listeningTo references to allow GC.
      // For targeted removal, check whether any listeners with our
      // context remain on the target before keeping the reference.
      if (!removeAll) {
        const targetState = getExistingState(target);
        if (!targetState || !hasListenersWithContext(targetState, this)) {
          state.listeningTo.delete(target);
        }
      }
    }
    if (removeAll) {
      if (obj) {
        state.listeningTo.delete(obj as AnyEmitter);
      } else {
        state.listeningTo.clear();
      }
    }
    return this;
  },

  iterate,
};

export function createEventify<TSchemas extends SchemaMap>(
  options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
    schemas: TSchemas;
  },
): EventifyEmitter<EventsFromSchemas<TSchemas>>;
export function createEventify<
  TEvents extends EventMap = EventMap,
  TSchemas extends SchemaMap | undefined = undefined,
>(options?: EventifyOptions<TSchemas, TEvents>): EventifyEmitter<TEvents>;
export function createEventify(
  options?: EventifyOptions,
): EventifyEmitter<EventMap> {
  const emitter = Object.create(proto) as EventifyEmitter<EventMap>;
  getState(emitter, options as EventifyOptions);
  return emitter;
}

export function enable<TTarget extends object, TSchemas extends SchemaMap>(
  target: TTarget | undefined,
  options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & {
    schemas: TSchemas;
  },
): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
export function enable<
  TTarget extends object,
  TEvents extends EventMap = EventMap,
  TSchemas extends SchemaMap | undefined = undefined,
>(
  target?: TTarget,
  options?: EventifyOptions<TSchemas, TEvents>,
): TTarget & EventifyEmitter<TEvents>;
// #11: Copies methods as own enumerable properties for Backbone-style mixin compat.
// Use createEventify() for prototype-based construction instead.
export function enable(
  target?: object,
  options?: EventifyOptions,
): object & EventifyEmitter<EventMap> {
  const destination = (target ?? {}) as Record<string, unknown>;
  const protoMethods = proto as unknown as Record<string, unknown>;
  for (const method of Object.keys(proto)) {
    destination[method] = protoMethods[method];
  }
  getState(destination, options as EventifyOptions);
  return destination as unknown as object & EventifyEmitter<EventMap>;
}

const EventifyInstance = createEventify();

// #10: The default export is both a live emitter and a static namespace
// for backward compatibility with Eventify v2 / Backbone-style usage.
const Eventify = Object.assign(EventifyInstance, {
  version: "3.0.0",
  enable,
  create: createEventify,
  mixin: enable,
  proto,
  defaultSchemaValidator,
}) as EventifyStatic;

const createEmitter = createEventify;
const decorateWithEvents = enable;
// #2: Compat alias. Prefer importing `defaultSchemaValidator` directly.
const setDefaultSchemaValidator = defaultSchemaValidator;

export {
  Eventify,
  createEmitter,
  decorateWithEvents,
  setDefaultSchemaValidator,
};
export default Eventify;
