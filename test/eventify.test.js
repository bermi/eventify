import { describe, it, expect } from "bun:test";
import Eventify, { createEmitter, decorateWithEvents, setDefaultSchemaValidator } from "../src/index.ts";

describe("Eventify", () => {
  const protoMethods = [
    "on",
    "once",
    "off",
    "trigger",
    "emit",
    "produce",
    "stopListening",
    "listenTo",
    "listenToOnce",
    "iterate",
  ];

  describe("noConflict", () => {
    it("returns the current instance (no-op in ESM)", () => {
      const current = Eventify.noConflict();
      expect(current).toBe(Eventify);
    });
  });

  describe("proto noops", () => {
    it("trigger is a noop on plain objects", () => {
      const target = {};
      const result = Eventify.proto.trigger.call(target, "event");
      expect(result).toBe(target);
    });

    it("stopListening is a noop on plain objects", () => {
      const target = {};
      const result = Eventify.proto.stopListening.call(target);
      expect(result).toBe(target);
    });
  });

  describe("when enabling events using decorateWithEvents, it:", () => {
    it("should add the Events mixin to passed prototype", () => {
      const target = {};
      decorateWithEvents(target);
      for (const method of protoMethods) {
        expect(typeof target[method]).toBe("function");
      }
    });

    it("should return augmented object", () => {
      decorateWithEvents({})
        .on("foo", (message) => {
          expect(message).toBe("hello emitter");
        })
        .trigger("foo", "hello emitter");
    });

    it("should augment an existing prototype", () => {
      function Plop() {}
      decorateWithEvents(Plop.prototype);
      new Plop()
        .on("foo", (message) => {
          expect(message).toBe("hello emitter");
        })
        .trigger("foo", "hello emitter");
    });

    it("should only augment prototype with expected methods", () => {
      function Plop() {}
      Plop.prototype.foo = function () {};
      decorateWithEvents(Plop.prototype);
      const keys = Object.keys(Plop.prototype).sort();
      const expected = ["foo"].concat(protoMethods).sort();
      expect(keys).toEqual(expected);
    });
  });

  describe("createEmitter", () => {
    it("should return an empty event emitter", () => {
      const emitter = createEmitter();
      for (const method of protoMethods) {
        expect(typeof emitter[method]).toBe("function");
      }
      emitter
        .on("foo", (foo) => {
          expect(foo).toBe("create");
        })
        .trigger("foo", "create");
    });
  });

  describe("emit / produce aliases", () => {
    it("emit is an alias of trigger", () => {
      const emitter = createEmitter();
      let called = false;
      emitter.on("ping", () => {
        called = true;
      });
      emitter.emit("ping");
      expect(called).toBe(true);
    });

    it("produce is an alias of trigger", () => {
      const emitter = createEmitter();
      let called = false;
      emitter.on("ping", () => {
        called = true;
      });
      emitter.produce("ping");
      expect(called).toBe(true);
    });
  });

  describe("On and trigger", () => {
    const obj = { counter: 0 };
    decorateWithEvents(obj);
    it("should increment counter", () => {
      obj.on("event", () => {
        obj.counter += 1;
      });
      obj.trigger("event");
      expect(obj.counter).toBe(1);
    });
    it("should increment counter five times", () => {
      obj.trigger("event");
      obj.trigger("event");
      obj.trigger("event");
      obj.trigger("event");
      expect(obj.counter).toBe(5);
    });
  });

  describe("Binding and triggering multiple events", () => {
    const obj = { counter: 0 };
    decorateWithEvents(obj);

    obj.on("a b c", () => {
      obj.counter += 1;
    });

    it("should only affect active counters", () => {
      obj.trigger("a");
      expect(obj.counter).toBe(1);

      obj.trigger("a b");
      expect(obj.counter).toBe(3);

      obj.trigger("c");
      expect(obj.counter).toBe(4);

      obj.off("a c");
      obj.trigger("a b c");
      expect(obj.counter).toBe(5);
    });

    it("should trigger all for each event", () => {
      let a;
      let b;
      const local = { counter: 0 };
      decorateWithEvents(local);
      local
        .on("all", (event) => {
          local.counter += 1;
          if (event === "a") a = true;
          if (event === "b") b = true;
        })
        .trigger("a b");
      expect(a).toBe(true);
      expect(b).toBe(true);
      expect(local.counter).toBe(2);
    });

    it("binding and triggering with event maps", () => {
      const local = { counter: 0 };
      decorateWithEvents(local);

      const increment = function () {
        this.counter += 1;
      };

      local.on(
        {
          a: increment,
          b: increment,
          c: increment,
        },
        local
      );

      local.trigger("a");
      expect(local.counter).toBe(1);

      local.trigger("a b");
      expect(local.counter).toBe(3);

      local.trigger("c");
      expect(local.counter).toBe(4);

      local.off(
        {
          a: increment,
          c: increment,
        },
        local
      );
      local.trigger("a b c");
      expect(local.counter).toBe(5);
    });

    it("listenTo and stopListening", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      a.listenTo(b, "all", () => {
        calls += 1;
      });
      b.trigger("anything");
      a.listenTo(b, "all", () => {
        calls += 10;
      });
      a.stopListening();
      b.trigger("anything");
      expect(calls).toBe(1);
    });

    it("listenTo and stopListening with event maps", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let listenCalls = 0;
      let directCalls = 0;
      const listenCb = () => {
        listenCalls += 1;
      };
      const directCb = () => {
        directCalls += 1;
      };
      a.listenTo(b, { event: listenCb });
      b.trigger("event");
      expect(listenCalls).toBe(1);
      a.listenTo(b, { event2: listenCb });
      b.on("event2", directCb);
      a.stopListening(b, { event2: listenCb });
      b.trigger("event event2");
      expect(listenCalls).toBe(2);
      expect(directCalls).toBe(1);
      a.stopListening();
      b.trigger("event event2");
      expect(listenCalls).toBe(2);
      expect(directCalls).toBe(2);
    });

    it("stopListening with omitted args", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      const cb = () => {
        calls += 1;
      };
      a.listenTo(b, "event", cb);
      a.listenTo(b, "event2", cb);
      a.stopListening(null, { event: cb });
      b.trigger("event event2");
      expect(calls).toBe(1);
      a.stopListening(null, "event2");
      b.trigger("event event2");
      expect(calls).toBe(1);
      a.listenTo(b, "event event2", cb);
      a.stopListening();
      b.trigger("event2");
      expect(calls).toBe(1);
    });

    it("listenToOnce and stopListening", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      a.listenToOnce(b, "all", () => {
        calls += 1;
      });
      b.trigger("anything");
      b.trigger("anything");
      a.listenToOnce(b, "all", () => {
        calls += 10;
      });
      a.stopListening();
      b.trigger("anything");
      expect(calls).toBe(1);
    });

    it("listenTo, listenToOnce and stopListening", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      a.listenToOnce(b, "all", () => {
        calls += 1;
      });
      b.trigger("anything");
      b.trigger("anything");
      a.listenTo(b, "all", () => {
        calls += 10;
      });
      a.stopListening();
      b.trigger("anything");
      expect(calls).toBe(1);
    });

    it("listenTo and stopListening with event maps", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      a.listenTo(b, {
        change: () => {
          calls += 1;
        },
      });
      b.trigger("change");
      a.listenTo(b, {
        change: () => {
          calls += 10;
        },
      });
      a.stopListening();
      b.trigger("change");
      expect(calls).toBe(1);
    });

    it("listenTo yourself", () => {
      const e = decorateWithEvents({});
      let calls = 0;
      e.listenTo(e, "foo", () => {
        calls += 1;
      });
      e.trigger("foo");
      expect(calls).toBe(1);
    });

    it("listenTo yourself cleans yourself up with stopListening", () => {
      const e = decorateWithEvents({});
      let calls = 0;
      e.listenTo(e, "foo", () => {
        calls += 1;
      });
      e.trigger("foo");
      e.stopListening();
      e.trigger("foo");
      expect(calls).toBe(1);
    });

    it("listenTo with empty callback doesn't throw an error", () => {
      const e = decorateWithEvents({});
      const result = e.listenTo(e, "foo", null);
      e.trigger("foo");
      expect(result).toBe(e);
    });

    it("listenTo with missing target is a noop", () => {
      const e = decorateWithEvents({});
      const result = e.listenTo(null, "foo", () => {});
      expect(result).toBe(e);
    });

    it("listenToOnce with missing target is a noop", () => {
      const e = decorateWithEvents({});
      const result = e.listenToOnce(null, "foo", () => {});
      expect(result).toBe(e);
    });

    it("listenToOnce supports event maps and binds context", () => {
      const a = decorateWithEvents({});
      const b = decorateWithEvents({});
      let calls = 0;
      let bound;
      a.listenToOnce(b, {
        ping: function () {
          calls += 1;
          bound = this;
        },
      });
      b.trigger("ping");
      b.trigger("ping");
      expect(calls).toBe(1);
      expect(bound).toBe(a);
    });
  });

  describe("Namespaced events + wildcards", () => {
    it("matches hierarchical wildcard listeners", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/product/foo/org/123/user/56/*", () => {
        calls += 1;
      });
      emitter.on("/product/foo/org/123/*", () => {
        calls += 10;
      });
      emitter.on("/product/foo/*", () => {
        calls += 100;
      });

      emitter.trigger("/product/foo/org/123/user/56/account/abcd");

      expect(calls).toBe(111);
    });

    it("supports middle-segment wildcards", () => {
      const emitter = createEmitter();
      let called = false;
      emitter.on("/product/foo/org/*/tracked-object/*/assesment", () => {
        called = true;
      });

      emitter.trigger("/product/foo/org/123/tracked-object/456/assesment");

      expect(called).toBe(true);
    });

    it("supports custom namespace delimiters", () => {
      const emitter = createEmitter({
        namespaceDelimiter: ":",
        wildcard: "*",
      });
      let called = false;
      emitter.on("namespace:foo:*", () => {
        called = true;
      });
      emitter.trigger("namespace:foo:bar");
      expect(called).toBe(true);
    });

    it("does not match shorter events for trailing wildcard patterns", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/b/*", () => {
        calls += 1;
      });
      emitter.trigger("/a/b");
      expect(calls).toBe(0);
    });

    it("does not match shorter events for trailing wildcard with internal wildcard", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/*/c/*", () => {
        calls += 1;
      });
      emitter.trigger("/a/b");
      expect(calls).toBe(0);
    });

    it("matches trailing wildcard patterns with internal wildcards", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/*/c/*", () => {
        calls += 1;
      });
      emitter.trigger("/a/b/c/d");
      expect(calls).toBe(1);
    });

    it("does not match when segment counts differ without trailing wildcard", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/*/c", () => {
        calls += 1;
      });
      emitter.trigger("/a/b/c/d");
      expect(calls).toBe(0);
    });

    it("does not match when static segments differ", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/b/*", () => {
        calls += 1;
      });
      emitter.trigger("/a/x/c");
      expect(calls).toBe(0);
    });

    it("does not match when internal wildcard pattern has static mismatch", () => {
      const emitter = createEmitter();
      let calls = 0;
      emitter.on("/a/*/c", () => {
        calls += 1;
      });
      emitter.trigger("/a/b/d");
      expect(calls).toBe(0);
    });

    it("treats wildcard as a literal when disabled", () => {
      const emitter = createEmitter({ wildcard: "" });
      let calls = 0;
      emitter.on("a*b", () => {
        calls += 1;
      });
      emitter.trigger("a*b");
      emitter.trigger("axb");
      expect(calls).toBe(1);
    });

    it("off removes pattern listeners", () => {
      const emitter = createEmitter();
      let calls = 0;
      const cb = () => {
        calls += 1;
      };
      const other = () => {
        calls += 10;
      };
      emitter.on("/a/b/*", cb);
      emitter.on("/a/c/*", other);
      emitter.off("/a/b/*", cb);
      emitter.trigger("/a/b/c");
      emitter.trigger("/a/c/d");
      expect(calls).toBe(10);
    });
  });

  describe("On, then unbind all functions", () => {
    const obj = { counter: 0 };
    decorateWithEvents(obj);
    const callback = () => {
      obj.counter += 1;
    };
    obj.on("event", callback);
    obj.trigger("event");
    obj.off("event");
    obj.trigger("event");
    it("should have only been incremented once", () => {
      expect(obj.counter).toBe(1);
    });
  });

  describe("Bind two callbacks, unbind only one", () => {
    const obj = { counterA: 0, counterB: 0 };
    decorateWithEvents(obj);
    const callback = () => {
      obj.counterA += 1;
    };
    obj.on("event", callback);
    obj.on("event", () => {
      obj.counterB += 1;
    });
    obj.trigger("event");
    obj.off("event", callback);
    obj.trigger("event");
    it("should only increment counterA once", () => {
      expect(obj.counterA).toBe(1);
    });
    it("should increment counterB twice", () => {
      expect(obj.counterB).toBe(2);
    });
  });

  describe("Unbind a callback in the midst of it firing", () => {
    const obj = { counter: 0 };
    decorateWithEvents(obj);
    const callback = () => {
      obj.counter += 1;
      obj.off("event", callback);
    };
    obj.on("event", callback);
    obj.trigger("event");
    obj.trigger("event");
    obj.trigger("event");
    it("should unbind the callback", () => {
      expect(obj.counter).toBe(1);
    });
  });

  describe("Two binds that unbind themselves", () => {
    const obj = { counterA: 0, counterB: 0 };
    decorateWithEvents(obj);

    function incrA() {
      obj.counterA += 1;
      obj.off("event", incrA);
    }

    function incrB() {
      obj.counterB += 1;
      obj.off("event", incrB);
    }
    obj.on("event", incrA);
    obj.on("event", incrB);
    obj.trigger("event");
    obj.trigger("event");
    obj.trigger("event");
    it("should have incremented counterA only once", () => {
      expect(obj.counterA).toBe(1);
    });
    it("should have incremented counterB only once", () => {
      expect(obj.counterB).toBe(1);
    });
  });

  describe("bind a callback with a supplied context", () => {
    it("should bind `this` to the callback", () => {
      function TestClass() {}
      const obj = decorateWithEvents();
      const context = new TestClass();
      let bound;
      obj.on("event", function () {
        bound = this;
      }, context);
      obj.trigger("event");
      expect(bound).toBe(context);
    });
  });

  describe("nested trigger with unbind", () => {
    const obj = { counter: 0 };
    decorateWithEvents(obj);

    function incr1() {
      obj.counter += 1;
      obj.off("event", incr1);
      obj.trigger("event");
    }

    function incr2() {
      obj.counter += 1;
    }
    obj.on("event", incr1);
    obj.on("event", incr2);
    obj.trigger("event");
    it("should have incremented the counter three times", () => {
      expect(obj.counter).toBe(3);
    });
  });

  describe("callback list is not altered during trigger", () => {
    let counter = 0;
    const obj = decorateWithEvents();

    function incr() {
      counter += 1;
    }
    it("prevents bind from altering the callback list", () => {
      obj
        .on("event", () => {
          obj.on("event", incr).on("all", incr);
        })
        .trigger("event");
      expect(counter).toBe(0);
    });
    it("prevents unbind from altering the callback list", () => {
      obj
        .off()
        .on("event", () => {
          obj.off("event", incr).off("all", incr);
        })
        .on("event", incr)
        .on("all", incr)
        .trigger("event");
      expect(counter).toBe(2);
    });
  });

  describe("#1282 - 'all' callback list is retrieved after each event.", () => {
    let counter = 0;
    const obj = decorateWithEvents();

    function incr() {
      counter += 1;
    }
    it("should retrieve all the callbacks", () => {
      obj
        .on("x", () => {
          obj.on("y", incr).on("all", incr);
        })
        .trigger("x y");
      expect(counter).toBe(2);
    });
  });

  it("if no callback is provided, `on` is a noop", () => {
    const emitter = decorateWithEvents();
    let calls = 0;
    const result = emitter.on("test");
    emitter.on("test", () => {
      calls += 1;
    });
    emitter.trigger("test");
    expect(result).toBe(emitter);
    expect(calls).toBe(1);
  });

  it("routes listener errors to onError instead of throwing", () => {
    const errors = [];
    const view = createEmitter({
      onError: (error) => {
        errors.push(error);
      },
    });
    view.on("test", () => {
      throw new Error("boom");
    });

    view.trigger("test");
    expect(errors.length).toBe(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it("swallows listener errors when no onError is provided", () => {
    const emitter = createEmitter();
    emitter.on("boom", () => {
      throw new Error("boom");
    });
    expect(() => emitter.trigger("boom")).not.toThrow();
  });

  it("routes rejected listener promises to onError", async () => {
    const errors = [];
    const view = createEmitter({
      onError: (error) => {
        errors.push(error);
      },
    });
    view.on("async", () => Promise.reject(new Error("async boom")));

    view.trigger("async");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errors.length).toBe(1);
    expect(errors[0]).toBeInstanceOf(Error);
  });

  it("routes invalid callbacks to onError and keeps other listeners running", () => {
    const errors = [];
    const emitter = createEmitter({
      onError: (error) => {
        errors.push(error);
      },
    });
    let calls = 0;
    emitter.on("test", () => {
      calls += 1;
    });
    emitter.on("test", "not-a-function");

    expect(() => emitter.trigger("test")).not.toThrow();
    expect(calls).toBe(1);
    expect(errors.length).toBe(1);
    expect(errors[0]).toBeInstanceOf(TypeError);
  });

  it("swallows errors thrown by onError handlers", () => {
    const emitter = createEmitter({
      onError: () => {
        throw new Error("onError failed");
      },
    });
    emitter.on("boom", () => {
      throw new Error("boom");
    });
    expect(() => emitter.trigger("boom")).not.toThrow();
  });

  describe("remove all events for a specific context", () => {
    it("should remove context", () => {
      const obj = decorateWithEvents();
      const context = {};
      let keptCalls = 0;
      let removedCalls = 0;
      obj.on("x all", () => {
        keptCalls += 1;
      });
      obj.on(
        "x all",
        () => {
          removedCalls += 1;
        },
        context
      );
      obj.off(null, null, context);
      obj.trigger("x");
      expect(removedCalls).toBe(0);
      expect(keptCalls).toBe(2);
    });
  });

  describe("remove all events for a specific callback", () => {
    it("should remove callback", () => {
      const obj = decorateWithEvents();
      let successCalls = 0;
      let failCalls = 0;
      function success() {
        successCalls += 1;
      }
      function fail() {
        failCalls += 1;
      }
      obj.on("x all", success);
      obj.on("x all", fail);
      obj.off(null, fail);
      obj.trigger("x");
      expect(failCalls).toBe(0);
      expect(successCalls).toBe(2);
    });
  });

  describe("off is chainable", () => {
    it("should be chainable", () => {
      const obj = decorateWithEvents();
      expect(obj.off() === obj).toBe(true);
      obj.on("event", () => {}, obj);
      expect(obj.off() === obj).toBe(true);
      obj.on("event", () => {}, obj);
      expect(obj.off("event") === obj).toBe(true);
    });
  });

  it("off is a noop for unknown events", () => {
    const obj = decorateWithEvents();
    const result = obj.off("missing");
    expect(result).toBe(obj);
  });

  describe("#1310 - off does not skip consecutive events", () => {
    it("should not skip", () => {
      const obj = decorateWithEvents();
      let calls = 0;
      obj.on(
        "event",
        () => {
          calls += 1;
        },
        obj
      );
      obj.on(
        "event",
        () => {
          calls += 1;
        },
        obj
      );
      obj.off(null, null, obj);
      obj.trigger("event");
      expect(calls).toBe(0);
    });
  });

  describe("When attaching an event listener only once, it:", () => {
    it("once", () => {
      const obj = { counterA: 0, counterB: 0 };
      decorateWithEvents(obj);
      const incrA = () => {
        obj.counterA += 1;
        obj.trigger("event");
      };
      const incrB = () => {
        obj.counterB += 1;
      };
      obj.once("event", incrA);
      obj.once("event", incrB);
      obj.trigger("event");
      expect(obj.counterA).toBe(1);
      expect(obj.counterB).toBe(1);
    });

    it("once variant one", () => {
      let onceCalls = 0;
      let onCalls = 0;
      const a = decorateWithEvents({}).once("event", () => {
        onceCalls += 1;
      });
      const b = decorateWithEvents({}).on("event", () => {
        onCalls += 1;
      });

      a.trigger("event");
      a.trigger("event");

      b.trigger("event");
      b.trigger("event");
      expect(onceCalls).toBe(1);
      expect(onCalls).toBe(2);
    });

    it("once variant two", () => {
      let onceCalls = 0;
      let onCalls = 0;
      const obj = decorateWithEvents({});
      obj
        .once("event", () => {
          onceCalls += 1;
        })
        .on("event", () => {
          onCalls += 1;
        })
        .trigger("event")
        .trigger("event");
      expect(onceCalls).toBe(1);
      expect(onCalls).toBe(2);
    });

    it("once with off", () => {
      let calls = 0;
      const f = () => {
        calls += 1;
      };
      const obj = decorateWithEvents({});

      obj.once("event", f);
      obj.off("event", f);
      obj.trigger("event");
      expect(calls).toBe(0);
    });

    it("once with event maps", () => {
      const obj = { counter: 0 };
      decorateWithEvents(obj);

      const increment = function () {
        this.counter += 1;
      };

      obj.once(
        {
          a: increment,
          b: increment,
          c: increment,
        },
        obj
      );

      obj.trigger("a");
      expect(obj.counter).toBe(1);

      obj.trigger("a b");
      expect(obj.counter).toBe(2);

      obj.trigger("c");
      expect(obj.counter).toBe(3);

      obj.trigger("a b c");
      expect(obj.counter).toBe(3);
    });

    it("once with off only by context", () => {
      const context = {};
      const obj = decorateWithEvents({});
      let called = false;
      obj.once("event", () => {
        called = true;
      }, context);
      obj.off(null, null, context);
      obj.trigger("event");
      expect(called).toBe(false);
    });

    it("once with asynchronous events", async () => {
      let calls = 0;
      const obj = decorateWithEvents({}).once("async", () => {
        calls += 1;
      });
      obj.trigger("async");
      obj.trigger("async");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(calls).toBe(1);
    });

    it("once with multiple events.", () => {
      const obj = decorateWithEvents({});
      let calls = 0;
      obj.once("x y", () => {
        calls += 1;
      });
      obj.trigger("x y");
      expect(calls).toBe(2);
    });

    it("Off during iteration with once.", () => {
      const obj = decorateWithEvents({});
      const f = function () {
        this.off("event", f);
      };
      obj.on("event", f);
      let calls = 0;
      obj.once("event", () => {
        calls += 1;
      });
      obj.on("event", () => {
        calls += 10;
      });

      obj.trigger("event");
      obj.trigger("event");
      expect(calls).toBe(21);
    });

    it("once without a callback is a noop", () => {
      const obj = decorateWithEvents({});
      let calls = 0;
      obj.once("event");
      obj.on("event", () => {
        calls += 1;
      });
      obj.trigger("event");
      expect(calls).toBe(1);
    });
  });

  describe("Additional parameters", () => {
    it("should include additional parameters", () => {
      const obj = decorateWithEvents();
      const param1 = "one";
      const param2 = ["two"];
      obj.on("event", (one, two) => {
        expect(one).toBe(param1);
        expect(two).toBe(param2);
      });
      obj.trigger("event", param1, param2);
    });
  });

  describe("setDefaultSchemaValidator", () => {
    it("supports safeParse success", () => {
      const schema = {
        safeParse: (value) => ({ success: true, data: String(value).toUpperCase() }),
      };
      const result = setDefaultSchemaValidator(schema, "ok", { event: "test" });
      expect(result).toBe("OK");
    });

    it("throws when safeParse fails", () => {
      const error = new Error("bad");
      const schema = {
        safeParse: () => ({ success: false, error }),
      };
      expect(() => setDefaultSchemaValidator(schema, "ok", { event: "test" })).toThrow(error);
    });

    it("throws when schema has no parser", () => {
      expect(() => setDefaultSchemaValidator({}, "ok", { event: "test" })).toThrow(TypeError);
    });
  });

  describe("Schema validation", () => {
    it("uses default validator when validate is omitted", () => {
      const schema = {
        parse: (value) => String(value).toUpperCase(),
      };
      const emitter = createEmitter({
        schemas: { shout: schema },
      });
      let seen;
      emitter.on("shout", (value) => {
        seen = value;
      });
      emitter.trigger("shout", "hello");
      expect(seen).toBe("HELLO");
    });

    it("skips validation for events without a schema", () => {
      let validateCalls = 0;
      const schema = {
        parse: () => {
          throw new Error("should not validate");
        },
      };
      const validate = () => {
        validateCalls += 1;
        return "ok";
      };
      const emitter = createEmitter({
        schemas: { known: schema },
        validate,
      });
      let seen;
      emitter.on("unknown", (value) => {
        seen = value;
      });
      emitter.trigger("unknown", 123);
      expect(validateCalls).toBe(0);
      expect(seen).toBe(123);
    });

    it("validates and transforms payloads on emit", () => {
      const schema = {
        parse: (value) => {
          if (typeof value !== "string") {
            throw new Error("invalid");
          }
          return value.toUpperCase();
        },
      };

      const emitter = createEmitter({
        schemas: { shout: schema },
        validate: setDefaultSchemaValidator,
      });

      emitter.on("shout", (value) => {
        expect(value).toBe("HELLO");
      });

      emitter.trigger("shout", "hello");
    });

    it("validates empty payloads", () => {
      let received;
      const schema = {
        parse: (value) => {
          received = value;
          return "ok";
        },
      };
      const emitter = createEmitter({
        schemas: { empty: schema },
      });
      let args = null;
      emitter.on("empty", (...eventArgs) => {
        args = eventArgs;
      });
      emitter.trigger("empty");
      expect(received).toBeUndefined();
      expect(args).toEqual([]);
    });

    it("accepts tuple schemas for multi-arg events", () => {
      const schema = {
        parse: (value) => [value[0] * 2, value[1] * 3],
      };
      const emitter = createEmitter({
        schemas: { coords: schema },
      });
      let result = null;
      emitter.on("coords", (x, y) => {
        result = [x, y];
      });
      emitter.trigger("coords", 2, 3);
      expect(result).toEqual([4, 9]);
    });

    it("throws when schema validation fails", () => {
      const schema = {
        parse: (value) => {
          if (typeof value !== "number") {
            throw new Error("invalid");
          }
          return value;
        },
      };

      const emitter = createEmitter({
        schemas: { count: schema },
        validate: setDefaultSchemaValidator,
      });

      expect(() => emitter.trigger("count", "nope")).toThrow();
    });

    it("does not invoke listeners when schema validation fails", () => {
      const schema = {
        parse: () => {
          throw new Error("invalid");
        },
      };
      const emitter = createEmitter({
        schemas: { "/fail/count": schema },
        validate: setDefaultSchemaValidator,
      });
      let calls = 0;
      emitter.on("/fail/count", () => {
        calls += 1;
      });
      emitter.on("/fail/*", () => {
        calls += 1;
      });
      emitter.on("all", () => {
        calls += 1;
      });

      expect(() => emitter.trigger("/fail/count", 1)).toThrow();
      expect(calls).toBe(0);
    });

    it("throws when multi-arg schema returns non-array", () => {
      const schema = {
        parse: () => "nope",
      };
      const emitter = createEmitter({
        schemas: { multi: schema },
      });
      expect(() => emitter.trigger("multi", 1, 2)).toThrow(TypeError);
    });

    it("applies default validator when schemas are added later", () => {
      const emitter = createEmitter();
      const schema = {
        parse: (value) => String(value).toUpperCase(),
      };
      decorateWithEvents(emitter, { schemas: { shout: schema } });
      let seen;
      emitter.on("shout", (value) => {
        seen = value;
      });
      emitter.trigger("shout", "later");
      expect(seen).toBe("LATER");
    });

    it("updates schema and options on existing emitters", () => {
      const emitter = createEmitter();
      const schema = {
        parse: (value) => value,
      };
      let validateCalls = 0;
      const validate = (currentSchema, payload) => {
        validateCalls += 1;
        return currentSchema.parse(payload);
      };
      const errors = [];
      decorateWithEvents(emitter, {
        validate,
        onError: (error) => {
          errors.push(error);
        },
        namespaceDelimiter: ":",
        wildcard: "~",
      });
      decorateWithEvents(emitter, { schemas: { ping: schema } });

      let patternCalls = 0;
      emitter.on("ns:foo:~", () => {
        patternCalls += 1;
      });
      emitter.trigger("ns:foo:bar");
      expect(patternCalls).toBe(1);

      emitter.on("ping", () => {});
      emitter.trigger("ping", "ok");
      expect(validateCalls).toBe(1);

      emitter.on("boom", () => {
        throw new Error("boom");
      });
      emitter.trigger("boom");
      expect(errors.length).toBe(1);
    });

    it("validates with zod-style parse", () => {
      const schemas = {
        user: {
          parse: (value) => {
            if (!value || typeof value.id !== "string") {
              throw new Error("ZodError");
            }
            return { id: value.id };
          },
          safeParse: () => ({ success: false, error: new Error("safeParse should not run") }),
        },
        coords: {
          parse: (value) => {
            if (!Array.isArray(value) || value.length !== 2) {
              throw new Error("ZodError");
            }
            const [x, y] = value;
            if (typeof x !== "number" || typeof y !== "number") {
              throw new Error("ZodError");
            }
            return [x, y];
          },
          safeParse: () => ({ success: false, error: new Error("safeParse should not run") }),
        },
      };
      const emitter = createEmitter({
        schemas,
        validate: setDefaultSchemaValidator,
      });
      let seen;
      let coords;
      emitter.on("user", (value) => {
        seen = value;
      });
      emitter.on("coords", (x, y) => {
        coords = [x, y];
      });

      emitter.trigger("user", { id: "ok" });
      emitter.trigger("coords", 2, 3);

      expect(seen).toEqual({ id: "ok" });
      expect(coords).toEqual([2, 3]);
    });

    it("throws for invalid zod-style payloads", () => {
      const schemas = {
        user: {
          parse: (value) => {
            if (!value || typeof value.id !== "string") {
              throw new Error("ZodError");
            }
            return { id: value.id };
          },
          safeParse: () => ({ success: false, error: new Error("safeParse should not run") }),
        },
      };
      const emitter = createEmitter({
        schemas,
        validate: setDefaultSchemaValidator,
      });

      expect(() => emitter.trigger("user", { id: 123 })).toThrow();
    });

    it("prefers parse over safeParse when both are present", () => {
      const schema = {
        parse: (value) => String(value).toUpperCase(),
        safeParse: () => ({ success: false, error: new Error("safeParse should not run") }),
      };
      const emitter = createEmitter({
        schemas: { shout: schema },
        validate: setDefaultSchemaValidator,
      });
      let seen;
      emitter.on("shout", (value) => {
        seen = value;
      });
      emitter.trigger("shout", "hello");
      expect(seen).toBe("HELLO");
    });
  });

  describe("Async iterator", () => {
    it("yields events in order", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("tick");

      emitter.trigger("tick", 1);
      emitter.trigger("tick", 2, 3);

      const first = await iterator.next();
      const second = await iterator.next();

      expect(first.value).toBe(1);
      expect(second.value).toEqual([2, 3]);

      await iterator.return();
    });

    it("supports abort signals", async () => {
      const emitter = createEmitter();
      const controller = new AbortController();
      const iterator = emitter.iterate("tick", { signal: controller.signal });

      controller.abort();

      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it("supports iterating all events", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("all");

      emitter.trigger("ping");

      const result = await iterator.next();
      expect(result.value).toEqual(["ping"]);

      await iterator.return();
    });

    it("resolves pending next when an event arrives", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("tick");
      const pending = iterator.next();
      emitter.trigger("tick", "now");
      const result = await pending;
      expect(result.value).toBe("now");
      await iterator.return();
    });

    it("resolves pending next when iterator closes", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("tick");
      const pending = iterator.next();
      await iterator.return();
      const result = await pending;
      expect(result.done).toBe(true);
      const after = await iterator.next();
      expect(after.done).toBe(true);
    });

    it("returns itself as an async iterator", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("tick");
      expect(iterator[Symbol.asyncIterator]()).toBe(iterator);
      await iterator.return();
      await iterator.return();
    });

    it("stops immediately if the signal is already aborted", async () => {
      const emitter = createEmitter();
      const controller = new AbortController();
      controller.abort();
      const iterator = emitter.iterate("tick", { signal: controller.signal });
      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it("throws and closes the iterator", async () => {
      const emitter = createEmitter();
      const iterator = emitter.iterate("tick");
      await expect(iterator.throw(new Error("stop"))).rejects.toThrow("stop");
      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it("ignores events after return", async () => {
      const emitter = createEmitter();
      const originalOn = emitter.on;
      let internalHandler;
      emitter.on = function (name, callback, context) {
        if (name === "tick") {
          internalHandler = callback;
        }
        return originalOn.call(this, name, callback, context);
      };
      try {
        const iterator = emitter.iterate("tick");
        expect(typeof internalHandler).toBe("function");
        await iterator.return();
        internalHandler("late");
        const result = await iterator.next();
        expect(result.done).toBe(true);
      } finally {
        emitter.on = originalOn;
      }
    });

    it("supports for-await loops with abort", async () => {
      const emitter = createEmitter();
      const controller = new AbortController();
      const seen = [];

      const loop = (async () => {
        for await (const value of emitter.iterate("tick", { signal: controller.signal })) {
          seen.push(value);
          controller.abort();
        }
      })();

      emitter.trigger("tick", "first");
      await loop;

      expect(seen).toEqual(["first"]);
    });
  });
});
