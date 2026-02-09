// src/index.ts
var eventSplitter = /\s+/;
var eventifyArgsKey = Symbol("eventifyArgs");
var eventifyListenersKey = Symbol("eventifyListeners");
var stateByEmitter = new WeakMap;
function noop() {}
function reportError(state, error, meta) {
  try {
    state.onError?.(error, meta);
  } catch {}
}
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && typeof value.then === "function";
}
function safeCall(state, callback, bound, args, meta) {
  try {
    const result = callback.apply(bound, args);
    if (isPromiseLike(result)) {
      result.then(undefined, (error) => reportError(state, error, meta));
    }
  } catch (error) {
    reportError(state, error, meta);
  }
}
function getEventArgs(event) {
  const customEvent = event;
  const stored = customEvent[eventifyArgsKey];
  if (stored) {
    return stored;
  }
  if ("detail" in customEvent) {
    const detail = customEvent.detail;
    if (detail === undefined) {
      return [];
    }
    return Array.isArray(detail) ? detail : [detail];
  }
  return [];
}
function createEvent(name, args) {
  const detail = args.length <= 1 ? args[0] : args;
  const event = new CustomEvent(name, { detail });
  Object.defineProperty(event, eventifyArgsKey, {
    value: args,
    enumerable: false
  });
  return event;
}
function eventsApi(obj, action, name, rest) {
  if (!name) {
    return true;
  }
  const target = obj;
  const method = target[action];
  if (typeof name === "object") {
    for (const key in name) {
      if (Object.prototype.hasOwnProperty.call(name, key)) {
        method.call(target, key, name[key], ...rest);
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
function defaultSchemaValidator(schema, payload, _meta) {
  if (schema && typeof schema.parse === "function") {
    return schema.parse(payload);
  }
  if (schema && typeof schema.safeParse === "function") {
    const result = schema.safeParse(payload);
    if (result && result.success) {
      return result.data;
    }
    throw result?.error ?? new Error("Schema validation failed");
  }
  throw new TypeError("Schema validator missing parse/safeParse");
}
function getState(target, options) {
  let state = stateByEmitter.get(target);
  if (!state) {
    const created = {
      events: new Map,
      patterns: [],
      all: [],
      listeningTo: new Set,
      target: new EventTarget,
      dispatchers: new Map,
      nativeEvents: new Set,
      schemas: options?.schemas,
      validate: options?.validate,
      onError: options?.onError ?? noop,
      namespaceDelimiter: options?.namespaceDelimiter ?? "/",
      wildcard: options?.wildcard ?? "*"
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
function getExistingState(target) {
  return stateByEmitter.get(target);
}
function normalizeValidatedArgs(state, event, args) {
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
function splitName(name, delimiter) {
  return delimiter ? name.split(delimiter) : [name];
}
function isPatternName(state, name) {
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
function matchesPatternSegments(state, entry, eventSegments) {
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
  for (let i = 0;i < lastIndex; i += 1) {
    if (patternSegments[i] !== wildcard && patternSegments[i] !== eventSegments[i]) {
      return false;
    }
  }
  return true;
}
function addListener(emitter, name, callback, context) {
  const state = getState(emitter);
  const bound = context ?? emitter;
  const entry = { callback, context, bound };
  if (name === "all") {
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
      trailingWildcard
    });
    return;
  }
  let list = state.events.get(name);
  if (!list) {
    list = [];
    state.events.set(name, list);
  }
  if (!state.dispatchers.has(name)) {
    const dispatcher = (event) => {
      const args = getEventArgs(event);
      const snapshot = event[eventifyListenersKey] ?? state.events.get(name) ?? [];
      for (const listenerEntry of snapshot) {
        safeCall(state, listenerEntry.callback, listenerEntry.bound, args, {
          event: name,
          args,
          listener: listenerEntry.callback,
          emitter
        });
      }
    };
    state.dispatchers.set(name, dispatcher);
    state.target.addEventListener(name, dispatcher);
  }
  list.push(entry);
}
function removeListener(state, name, callback, context) {
  const matches = (entry) => {
    const cb = callback;
    const cbMatches = !cb || cb === entry.callback || cb === entry.callback._callback;
    const ctxMatches = !context || context === entry.context;
    return cbMatches && ctxMatches;
  };
  if (name === "all") {
    state.all = state.all.filter((e) => !matches(e));
    return;
  }
  if (isPatternName(state, name)) {
    state.patterns = state.patterns.filter((e) => e.pattern !== name || !matches(e));
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
function hasListenersWithContext(targetState, context) {
  for (const [, list] of targetState.events) {
    for (const entry of list) {
      if (entry.context === context)
        return true;
    }
  }
  for (const entry of targetState.patterns) {
    if (entry.context === context)
      return true;
  }
  for (const entry of targetState.all) {
    if (entry.context === context)
      return true;
  }
  return false;
}
function listenToHelper(self, obj, name, callback, method) {
  if (!obj)
    return self;
  const state = getState(self);
  state.listeningTo.add(obj);
  const target = obj;
  if (name && typeof name === "object") {
    target[method](name, self);
  } else {
    target[method](name, callback, self);
  }
  return self;
}
function iterate(name, options) {
  const emitter = this;
  const queue = [];
  let pending = null;
  let done = false;
  const isAll = name === "all";
  const handler = (...args) => {
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
  const iterator = {
    [Symbol.asyncIterator]() {
      return iterator;
    },
    next() {
      if (queue.length) {
        const value = queue.shift();
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
    }
  };
  return iterator;
}
var proto = {
  addEventListener(type, listener, options) {
    const state = getState(this);
    state.target.addEventListener(type, listener, options);
    if (listener) {
      state.nativeEvents.add(type);
    }
  },
  removeEventListener(type, listener, options) {
    const state = getExistingState(this);
    if (!state) {
      return;
    }
    state.target.removeEventListener(type, listener, options);
  },
  dispatchEvent(event) {
    const state = getState(this);
    return state.target.dispatchEvent(event);
  },
  on(name, callback, context) {
    if (!eventsApi(this, "on", name, [callback, context]) || !callback) {
      return this;
    }
    addListener(this, name, callback, context);
    return this;
  },
  once(name, callback, context) {
    if (!eventsApi(this, "once", name, [callback, context]) || !callback) {
      return this;
    }
    const self = this;
    let ran = false;
    const onceListener = function(...args) {
      if (ran) {
        return;
      }
      ran = true;
      self.off(name, onceListener, context);
      return callback.apply(this, args);
    };
    onceListener._callback = callback;
    return this.on(name, onceListener, context);
  },
  off(name, callback, context) {
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
    if (name) {
      removeListener(state, name, callback, context);
    } else {
      for (const eventName of [...state.events.keys()]) {
        removeListener(state, eventName, callback, context);
      }
      const seenPatterns = new Set;
      for (const entry of state.patterns) {
        if (!seenPatterns.has(entry.pattern)) {
          seenPatterns.add(entry.pattern);
          removeListener(state, entry.pattern, callback, context);
        }
      }
      if (state.all.length) {
        removeListener(state, "all", callback, context);
      }
    }
    return this;
  },
  trigger(name, ...args) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    if (!eventsApi(this, "trigger", name, args)) {
      return this;
    }
    const eventName = name;
    const validatedArgs = normalizeValidatedArgs(state, eventName, args);
    const eventSnapshot = state.events.get(eventName)?.slice() ?? null;
    const patternSnapshot = state.patterns.length ? state.patterns.slice() : null;
    const allSnapshot = state.all.length ? state.all.slice() : null;
    if (state.nativeEvents.has(eventName)) {
      const event = createEvent(eventName, validatedArgs);
      if (eventSnapshot?.length) {
        Object.defineProperty(event, eventifyListenersKey, {
          value: eventSnapshot,
          enumerable: false
        });
      }
      state.target.dispatchEvent(event);
    } else if (eventSnapshot?.length) {
      for (const entry of eventSnapshot) {
        safeCall(state, entry.callback, entry.bound, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this
        });
      }
    }
    if (patternSnapshot) {
      let eventSegments = null;
      for (const entry of patternSnapshot) {
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
          emitter: this
        });
      }
    }
    if (allSnapshot) {
      for (const entry of allSnapshot) {
        safeCall(state, entry.callback, entry.bound, [eventName, ...validatedArgs], {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this
        });
      }
    }
    return this;
  },
  emit(name, ...args) {
    return this.trigger(name, ...args);
  },
  produce(name, ...args) {
    return this.trigger(name, ...args);
  },
  listenTo(obj, name, callback) {
    return listenToHelper(this, obj, name, callback, "on");
  },
  listenToOnce(obj, name, callback) {
    return listenToHelper(this, obj, name, callback, "once");
  },
  stopListening(obj, name, callback) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    const removeAll = !name && !callback;
    const targets = obj ? [obj] : [...state.listeningTo.values()];
    for (const target of targets) {
      if (name && typeof name === "object") {
        target.off(name, this);
      } else {
        target.off(name, callback, this);
      }
      if (!removeAll) {
        const targetState = getExistingState(target);
        if (!targetState || !hasListenersWithContext(targetState, this)) {
          state.listeningTo.delete(target);
        }
      }
    }
    if (removeAll) {
      if (obj) {
        state.listeningTo.delete(obj);
      } else {
        state.listeningTo.clear();
      }
    }
    return this;
  },
  iterate
};
function createEventify(options) {
  const emitter = Object.create(proto);
  getState(emitter, options);
  return emitter;
}
function enable(target, options) {
  const destination = target ?? {};
  const protoMethods = proto;
  for (const method of Object.keys(proto)) {
    destination[method] = protoMethods[method];
  }
  getState(destination, options);
  return destination;
}
var EventifyInstance = createEventify();
var Eventify = Object.assign(EventifyInstance, {
  version: "3.0.0",
  enable,
  create: createEventify,
  mixin: enable,
  proto,
  defaultSchemaValidator
});
var createEmitter = createEventify;
var decorateWithEvents = enable;
var setDefaultSchemaValidator = defaultSchemaValidator;
var src_default = Eventify;
export {
  setDefaultSchemaValidator,
  enable,
  defaultSchemaValidator,
  src_default as default,
  decorateWithEvents,
  createEventify,
  createEmitter,
  Eventify
};

//# debugId=977FBEE62A7F036064756E2164756E21
//# sourceMappingURL=index.js.map
