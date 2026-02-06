/* Eventify v3 - type-safe, schema-optional */

export type EventMap = Record<string, unknown>;

export type PayloadArgs<T> =
  [T] extends [void] ? [] :
  [T] extends [undefined] ? [] :
  T extends readonly unknown[] ? T :
  [T];

export type PayloadValue<T> = T extends readonly unknown[] ? T : T;

export type EventName<Events extends EventMap> = Extract<keyof Events, string>;

export type EventHandler<T> = (...args: PayloadArgs<T>) => unknown;

export type AllHandler<Events extends EventMap> =
  (event: EventName<Events>, ...args: unknown[]) => unknown;

export type EventHandlerMap<Events extends EventMap> = {
  [K in keyof Events]?: EventHandler<Events[K]>;
};

export type SchemaLike<T = unknown> =
  | { parse: (input: unknown) => T }
  | { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: unknown } };

export type SchemaMap = Record<string, SchemaLike>;

export type InferSchema<S> =
  S extends { parse: (input: unknown) => infer T } ? T :
  S extends { safeParse: (input: unknown) => { success: true; data: infer T } } ? T :
  unknown;

export type EventsFromSchemas<TSchemas> =
  TSchemas extends SchemaMap ? { [K in keyof TSchemas]: InferSchema<TSchemas[K]> } : EventMap;

export type ValidationMeta = { event: string };

export type SchemaValidator<TSchema extends SchemaLike = SchemaLike> =
  (schema: TSchema, payload: unknown, meta: ValidationMeta) => unknown;

export type ErrorMeta<Events extends EventMap> = {
  event: EventName<Events> | string;
  args: unknown[];
  listener?: (...args: unknown[]) => unknown;
  emitter: object;
};

export type ErrorHandler<Events extends EventMap> =
  (error: unknown, meta: ErrorMeta<Events>) => void;

export type EventifyOptions<
  TSchemas extends SchemaMap | undefined = undefined,
  TEvents extends EventMap = EventMap
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
  on<K extends EventName<Events>>(
    name: K,
    callback: EventHandler<Events[K]>,
    context?: unknown
  ): this;
  on(
    name: 'all',
    callback: AllHandler<Events>,
    context?: unknown
  ): this;
  on(
    name: EventHandlerMap<Events>,
    context?: unknown
  ): this;
  on(
    name: string,
    callback?: (...args: unknown[]) => unknown,
    context?: unknown
  ): this;

  once<K extends EventName<Events>>(
    name: K,
    callback: EventHandler<Events[K]>,
    context?: unknown
  ): this;
  once(
    name: 'all',
    callback: AllHandler<Events>,
    context?: unknown
  ): this;
  once(
    name: EventHandlerMap<Events>,
    context?: unknown
  ): this;
  once(
    name: string,
    callback?: (...args: unknown[]) => unknown,
    context?: unknown
  ): this;

  off(): this;
  off<K extends EventName<Events>>(
    name: K,
    callback?: EventHandler<Events[K]> | null,
    context?: unknown
  ): this;
  off(
    name: EventHandlerMap<Events>,
    context?: unknown
  ): this;
  off(
    name?: string | null,
    callback?: ((...args: unknown[]) => unknown) | null,
    context?: unknown
  ): this;

  trigger<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  trigger(
    name: string,
    ...args: unknown[]
  ): this;
  emit<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  emit(
    name: string,
    ...args: unknown[]
  ): this;
  produce<K extends EventName<Events>>(
    name: K,
    ...args: PayloadArgs<Events[K]>
  ): this;
  produce(
    name: string,
    ...args: unknown[]
  ): this;

  listenTo<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(
    other: EventifyEmitter<OtherEvents>,
    name: K,
    callback: EventHandler<OtherEvents[K]>
  ): this;
  listenTo<OtherEvents extends EventMap>(
    other: EventifyEmitter<OtherEvents>,
    name: EventHandlerMap<OtherEvents>
  ): this;
  listenTo(
    other: EventifyEmitter<EventMap>,
    name: string,
    callback?: (...args: unknown[]) => unknown
  ): this;

  listenToOnce<OtherEvents extends EventMap, K extends EventName<OtherEvents>>(
    other: EventifyEmitter<OtherEvents>,
    name: K,
    callback: EventHandler<OtherEvents[K]>
  ): this;
  listenToOnce<OtherEvents extends EventMap>(
    other: EventifyEmitter<OtherEvents>,
    name: EventHandlerMap<OtherEvents>
  ): this;
  listenToOnce(
    other: EventifyEmitter<EventMap>,
    name: string,
    callback?: (...args: unknown[]) => unknown
  ): this;

  stopListening<OtherEvents extends EventMap>(
    other?: EventifyEmitter<OtherEvents> | null,
    name?: EventName<OtherEvents> | EventHandlerMap<OtherEvents> | null,
    callback?: ((...args: unknown[]) => unknown) | null
  ): this;

  iterate<K extends EventName<Events>>(
    name: K,
    options?: IterateOptions
  ): AsyncIterableIterator<PayloadValue<Events[K]>>;
  iterate(
    name: 'all',
    options?: IterateOptions
  ): AsyncIterableIterator<[EventName<Events>, ...unknown[]]>;
  iterate(
    name: string,
    options?: IterateOptions
  ): AsyncIterableIterator<unknown>;
}

export interface EventifyStatic<Events extends EventMap = EventMap>
  extends EventifyEmitter<Events> {
  version: string;
  enable<TTarget extends object, TSchemas extends SchemaMap>(
    target: TTarget | undefined,
    options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & { schemas: TSchemas }
  ): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
  enable<TTarget extends object, TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(
    target?: TTarget,
    options?: EventifyOptions<TSchemas, TEvents>
  ): TTarget & EventifyEmitter<TEvents>;
  create<TSchemas extends SchemaMap>(
    options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & { schemas: TSchemas }
  ): EventifyEmitter<EventsFromSchemas<TSchemas>>;
  create<TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(
    options?: EventifyOptions<TSchemas, TEvents>
  ): EventifyEmitter<TEvents>;
  mixin: EventifyStatic['enable'];
  proto: EventifyEmitter<EventMap>;
  noConflict: () => EventifyStatic<Events>;
  defaultSchemaValidator: SchemaValidator;
}

type AnyCallback = (...args: any[]) => unknown;
type AnyEmitter = EventifyEmitter<any>;

type CallbackWithOriginal = AnyCallback & {
  _callback?: AnyCallback;
};

type ListenerEntry = {
  callback: CallbackWithOriginal;
  context?: unknown;
  ctx: unknown;
};

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
  schemas: SchemaMap | undefined;
  validate: SchemaValidator | undefined;
  onError: ErrorHandler<EventMap>;
  namespaceDelimiter: string;
  wildcard: string;
};

const eventSplitter = /\s+/;

const stateByEmitter = new WeakMap<object, EmitterState>();

function noop(): void {}

function reportError(state: EmitterState, error: unknown, meta: ErrorMeta<EventMap>): void {
  try {
    state.onError?.(error, meta);
  } catch {
    // Swallow error handler failures to avoid crashes.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && typeof (value as PromiseLike<unknown>).then === 'function';
}

function safeCall(
  state: EmitterState,
  callback: CallbackWithOriginal,
  ctx: unknown,
  args: unknown[],
  meta: ErrorMeta<EventMap>
): void {
  try {
    const result = callback.apply(ctx, args);
    if (isPromiseLike(result)) {
      result.then(undefined, (error: unknown) => reportError(state, error, meta));
    }
  } catch (error) {
    reportError(state, error, meta);
  }
}

type EventApiAction = 'on' | 'once' | 'off' | 'trigger';
type EventApiFn = (name: string, ...args: unknown[]) => unknown;

function eventsApi(obj: AnyEmitter, action: EventApiAction, name: unknown, rest: unknown[]): boolean {
  if (!name) {
    return true;
  }
  if (typeof name === 'object') {
    for (const key in name as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(name, key)) {
        (obj as any)[action](key, (name as Record<string, unknown>)[key], ...rest);
      }
    }
    return false;
  }
  if (typeof name === 'string' && eventSplitter.test(name)) {
    const names = name.split(eventSplitter);
    for (const eventName of names) {
      (obj as any)[action](eventName, ...rest);
    }
    return false;
  }
  return true;
}

export function defaultSchemaValidator(
  schema: SchemaLike,
  payload: unknown,
  _meta: ValidationMeta
): unknown {
  if (schema && typeof (schema as { parse?: unknown }).parse === 'function') {
    return (schema as { parse: (input: unknown) => unknown }).parse(payload);
  }
  if (schema && typeof (schema as { safeParse?: unknown }).safeParse === 'function') {
    const result = (schema as { safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: unknown } })
      .safeParse(payload);
    if (result && result.success) {
      return result.data;
    }
    throw result?.error ?? new Error('Schema validation failed');
  }
  throw new TypeError('Schema validator missing parse/safeParse');
}

function getState(target: object, options?: EventifyOptions): EmitterState {
  let state = stateByEmitter.get(target);
  if (!state) {
    const created: EmitterState = {
      events: new Map(),
      patterns: [],
      all: [],
      listeningTo: new Set(),
      schemas: options?.schemas,
      validate: options?.validate,
      onError: options?.onError ?? noop,
      namespaceDelimiter: options?.namespaceDelimiter ?? '/',
      wildcard: options?.wildcard ?? '*',
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
  args: unknown[]
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
    throw new TypeError(`Schema for event "${event}" must return an array/tuple for multi-arg events`);
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

function matchesPatternSegments(state: EmitterState, entry: PatternEntry, eventSegments: string[]): boolean {
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
    const segment = patternSegments[i];
    if (segment === wildcard) {
      continue;
    }
    if (segment !== eventSegments[i]) {
      return false;
    }
  }

  return true;
}

function addListener(
  emitter: object,
  name: string,
  callback: CallbackWithOriginal,
  context?: unknown
): void {
  const state = getState(emitter);
  const ctx = context ?? emitter;
  const entry: ListenerEntry = {
    callback,
    context,
    ctx,
  };

  if (name === 'all') {
    state.all.push(entry);
    return;
  }
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

  const list = state.events.get(name);
  if (list) {
    list.push(entry);
  } else {
    state.events.set(name, [entry]);
  }
}

function removeListener(
  state: EmitterState,
  name: string,
  callback?: CallbackWithOriginal | null,
  context?: unknown
): void {
  const matches = (entry: ListenerEntry): boolean => {
    const cb = callback as CallbackWithOriginal | null | undefined;
    const cbMatches = !cb || cb === entry.callback || cb === entry.callback._callback;
    const ctxMatches = !context || context === entry.context;
    return cbMatches && ctxMatches;
  };

  const removeFromList = (list: ListenerEntry[]): ListenerEntry[] => {
    const retained: ListenerEntry[] = [];
    for (const entry of list) {
      if (matches(entry)) {
      } else {
        retained.push(entry);
      }
    }
    return retained;
  };

  if (name === 'all') {
    state.all = removeFromList(state.all);
    return;
  }
  if (isPatternName(state, name)) {
    const retained: PatternEntry[] = [];
    for (const entry of state.patterns) {
      if (entry.pattern !== name || !matches(entry)) {
        retained.push(entry);
      }
    }
    state.patterns = retained;
    return;
  }

  const list = state.events.get(name);
  if (!list) {
    return;
  }
  const retained = removeFromList(list);
  if (retained.length) {
    state.events.set(name, retained);
  } else {
    state.events.delete(name);
  }
}

const proto: EventifyEmitter<any> = {
  on(this: AnyEmitter, name: any, callback?: any, context?: unknown) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
      return this;
    }
    addListener(this, name as string, callback as CallbackWithOriginal, context);
    return this;
  },

  once(this: AnyEmitter, name: any, callback?: any, context?: unknown) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
      return this;
    }
    const self = this as AnyEmitter;
    let ran = false;
    const onceListener: CallbackWithOriginal = function (this: unknown, ...args: unknown[]) {
      if (ran) {
        return undefined;
      }
      ran = true;
      self.off(name, onceListener, context);
      return (callback as CallbackWithOriginal).apply(this, args);
    } as CallbackWithOriginal;
    onceListener._callback = callback as CallbackWithOriginal;
    return (this as AnyEmitter).on(name, onceListener, context);
  },

  off(this: AnyEmitter, name?: any, callback?: any, context?: unknown) {
    const state = getExistingState(this);
    if (!state || !eventsApi(this, 'off', name, [callback, context])) {
      return this;
    }
    if (!name && !callback && !context) {
      state.events.clear();
      state.patterns = [];
      state.all = [];
      return this;
    }

    const patternNames = new Set(state.patterns.map((entry) => entry.pattern));
    const names = name ? [name as string] : [
      ...state.events.keys(),
      ...patternNames,
      ...(state.all.length ? ['all'] : []),
    ];

    for (const eventName of names) {
      removeListener(state, eventName, callback as CallbackWithOriginal, context);
    }
    return this;
  },

  trigger(this: AnyEmitter, name: any, ...args: unknown[]) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    if (!eventsApi(this, 'trigger', name, args)) {
      return this;
    }

    const eventName = name as string;
    const validatedArgs = normalizeValidatedArgs(state, eventName, args);

    const eventSnapshot = state.events.get(eventName)?.slice() ?? null;
    const patternSnapshot = state.patterns.length ? state.patterns.slice() : null;
    const allSnapshot = state.all.length ? state.all.slice() : null;
    const eventSegments = patternSnapshot ? splitName(eventName, state.namespaceDelimiter) : null;

    if (eventSnapshot) {
      for (const entry of eventSnapshot) {
        safeCall(state, entry.callback, entry.ctx, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this,
        });
      }
    }

    if (patternSnapshot && eventSegments) {
      for (const entry of patternSnapshot) {
        if (!matchesPatternSegments(state, entry, eventSegments)) {
          continue;
        }
        safeCall(state, entry.callback, entry.ctx, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this,
        });
      }
    }

    if (allSnapshot) {
      for (const entry of allSnapshot) {
        safeCall(state, entry.callback, entry.ctx, [eventName, ...validatedArgs], {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this,
        });
      }
    }

    return this;
  },

  emit(this: AnyEmitter, name: any, ...args: unknown[]) {
    return (this as AnyEmitter).trigger(name, ...args);
  },

  produce(this: AnyEmitter, name: any, ...args: unknown[]) {
    return (this as AnyEmitter).trigger(name, ...args);
  },

  listenTo(this: AnyEmitter, obj: any, name: any, callback?: any) {
    if (!obj) {
      return this;
    }
    const state = getState(this);
    state.listeningTo.add(obj as AnyEmitter);
    if (typeof name === 'object') {
      callback = this;
    }
    (obj as AnyEmitter).on(name, callback, this);
    return this;
  },

  listenToOnce(this: AnyEmitter, obj: any, name: any, callback?: any) {
    if (!obj) {
      return this;
    }
    const state = getState(this);
    state.listeningTo.add(obj as AnyEmitter);
    if (typeof name === 'object') {
      callback = this;
    }
    (obj as AnyEmitter).once(name, callback, this);
    return this;
  },

  stopListening(this: AnyEmitter, obj?: any, name?: any, callback?: any) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    const deleteListener = !name && !callback;
    if (typeof name === 'object') {
      callback = this;
    }

    const targets: AnyEmitter[] = [];
    if (obj) {
      targets.push(obj as AnyEmitter);
    } else {
      targets.push(...state.listeningTo.values());
    }

    for (const target of targets) {
      (target as AnyEmitter).off(name, callback, this);
      if (deleteListener) {
        state.listeningTo.delete(target);
      }
    }
    if (deleteListener && !obj) {
      state.listeningTo.clear();
    }
    return this;
  },

  iterate(this: AnyEmitter, name: any, options?: IterateOptions): AsyncIterableIterator<any> {
    const emitter = this as AnyEmitter;
    const queue: unknown[] = [];
    let pending: ((value: IteratorResult<unknown>) => void) | null = null;
    let done = false;
    const isAll = name === 'all';

    const handler = (...args: unknown[]) => {
      if (done) {
        return;
      }
      const value = isAll ? args : (args.length === 1 ? args[0] : args);
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
        options.signal.addEventListener('abort', stop, { once: true });
      }
    }

    const iterator: AsyncIterableIterator<any> = {
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
  },
};

export function createEventify<TSchemas extends SchemaMap>(
  options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & { schemas: TSchemas }
): EventifyEmitter<EventsFromSchemas<TSchemas>>;
export function createEventify<TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(
  options?: EventifyOptions<TSchemas, TEvents>
): EventifyEmitter<TEvents>;
export function createEventify(
  options?: EventifyOptions
): EventifyEmitter<EventMap> {
  const emitter = Object.create(proto) as EventifyEmitter<EventMap>;
  getState(emitter, options as EventifyOptions);
  return emitter;
}

export function enable<TTarget extends object, TSchemas extends SchemaMap>(
  target: TTarget | undefined,
  options: EventifyOptions<TSchemas, EventsFromSchemas<TSchemas>> & { schemas: TSchemas }
): TTarget & EventifyEmitter<EventsFromSchemas<TSchemas>>;
export function enable<TTarget extends object, TEvents extends EventMap = EventMap, TSchemas extends SchemaMap | undefined = undefined>(
  target?: TTarget,
  options?: EventifyOptions<TSchemas, TEvents>
): TTarget & EventifyEmitter<TEvents>;
export function enable(
  target?: object,
  options?: EventifyOptions
): object & EventifyEmitter<EventMap> {
  const destination = (target ?? {}) as Record<string, unknown>;
  for (const method of Object.keys(proto)) {
    (destination as any)[method] = (proto as any)[method];
  }
  getState(destination, options as EventifyOptions);
  return destination as unknown as object & EventifyEmitter<EventMap>;
}

const EventifyInstance = createEventify();

const Eventify = Object.assign(EventifyInstance, {
  version: '3.0.0',
  enable,
  create: createEventify,
  mixin: enable,
  proto,
  noConflict: () => Eventify as EventifyStatic,
  defaultSchemaValidator,
}) as EventifyStatic;

const createEmitter = createEventify;
const decorateWithEvents = enable;
const setDefaultSchemaValidator = defaultSchemaValidator;

export { Eventify, createEmitter, decorateWithEvents, setDefaultSchemaValidator };
export default Eventify;
