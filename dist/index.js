// src/index.ts
var eventSplitter = /\s+/;
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
function safeCall(state, callback, ctx, args, meta) {
  try {
    const result = callback.apply(ctx, args);
    if (isPromiseLike(result)) {
      result.then(undefined, (error) => reportError(state, error, meta));
    }
  } catch (error) {
    reportError(state, error, meta);
  }
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
    const names = name.split(eventSplitter);
    for (const eventName of names) {
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
function addListener(emitter, name, callback, context) {
  const state = getState(emitter);
  const ctx = context ?? emitter;
  const entry = {
    callback,
    context,
    ctx
  };
  if (name === "all") {
    state.all.push(entry);
    return;
  }
  if (isPatternName(state, name)) {
    const segments = splitName(name, state.namespaceDelimiter);
    const trailingWildcard = segments[segments.length - 1] === state.wildcard;
    const hasInternalWildcard = segments.slice(0, -1).includes(state.wildcard);
    if (trailingWildcard && !hasInternalWildcard) {
      state.patterns.push({
        ...entry,
        pattern: name,
        match: "prefix",
        prefix: name.slice(0, Math.max(0, name.length - state.wildcard.length))
      });
    } else {
      state.patterns.push({
        ...entry,
        pattern: name,
        match: "segments",
        segments,
        trailingWildcard
      });
    }
    return;
  }
  const list = state.events.get(name);
  if (list) {
    list.push(entry);
  } else {
    state.events.set(name, [entry]);
  }
}
function removeListener(state, name, callback, context) {
  const matches = (entry) => {
    const cb = callback;
    const cbMatches = !cb || cb === entry.callback || cb === entry.callback._callback;
    const ctxMatches = !context || context === entry.context;
    return cbMatches && ctxMatches;
  };
  const removeFromList = (list2) => {
    const retained2 = [];
    for (const entry of list2) {
      if (matches(entry)) {} else {
        retained2.push(entry);
      }
    }
    return retained2;
  };
  if (name === "all") {
    state.all = removeFromList(state.all);
    return;
  }
  if (isPatternName(state, name)) {
    const retained2 = [];
    for (const entry of state.patterns) {
      if (entry.pattern !== name || !matches(entry)) {
        retained2.push(entry);
      }
    }
    state.patterns = retained2;
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
      state.events.clear();
      state.patterns = [];
      state.all = [];
      return this;
    }
    const patternNames = new Set(state.patterns.map((entry) => entry.pattern));
    const names = name ? [name] : [
      ...state.events.keys(),
      ...patternNames,
      ...state.all.length ? ["all"] : []
    ];
    for (const eventName of names) {
      removeListener(state, eventName, callback, context);
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
    let eventSegments = null;
    if (eventSnapshot) {
      for (const entry of eventSnapshot) {
        safeCall(state, entry.callback, entry.ctx, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this
        });
      }
    }
    if (patternSnapshot) {
      for (const entry of patternSnapshot) {
        if (entry.match === "prefix") {
          if (!eventName.startsWith(entry.prefix)) {
            continue;
          }
        } else {
          if (!eventSegments) {
            eventSegments = splitName(eventName, state.namespaceDelimiter);
          }
          if (!matchesPatternSegments(state, entry, eventSegments)) {
            continue;
          }
        }
        safeCall(state, entry.callback, entry.ctx, validatedArgs, {
          event: eventName,
          args: validatedArgs,
          listener: entry.callback,
          emitter: this
        });
      }
    }
    if (allSnapshot) {
      for (const entry of allSnapshot) {
        safeCall(state, entry.callback, entry.ctx, [eventName, ...validatedArgs], {
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
    if (!obj) {
      return this;
    }
    const state = getState(this);
    state.listeningTo.add(obj);
    if (name && typeof name === "object") {
      callback = this;
    }
    const target = obj;
    if (name && typeof name === "object") {
      target.on(name, this);
    } else {
      target.on(name, callback, this);
    }
    return this;
  },
  listenToOnce(obj, name, callback) {
    if (!obj) {
      return this;
    }
    const state = getState(this);
    state.listeningTo.add(obj);
    if (name && typeof name === "object") {
      callback = this;
    }
    const target = obj;
    if (name && typeof name === "object") {
      target.once(name, this);
    } else {
      target.once(name, callback, this);
    }
    return this;
  },
  stopListening(obj, name, callback) {
    const state = getExistingState(this);
    if (!state) {
      return this;
    }
    const deleteListener = !name && !callback;
    if (name && typeof name === "object") {
      callback = this;
    }
    const targets = [];
    if (obj) {
      targets.push(obj);
    } else {
      targets.push(...state.listeningTo.values());
    }
    for (const target of targets) {
      if (name && typeof name === "object") {
        target.off(name, this);
      } else {
        target.off(name, callback, this);
      }
      if (deleteListener) {
        state.listeningTo.delete(target);
      }
    }
    if (deleteListener && !obj) {
      state.listeningTo.clear();
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
  noConflict: () => Eventify,
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

//# debugId=FA096C47A6FA6CC764756E2164756E21
//# sourceMappingURL=index.js.map
