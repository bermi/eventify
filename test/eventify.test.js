import { describe, it, expect } from "bun:test";
import Eventify, { defaultSchemaValidator } from "../src/index.ts";

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

  describe("when enabling events using Eventify.enable, it:", () => {
    it("should add the Events mixin to passed prototype", () => {
      const target = {};
      Eventify.enable(target);
      for (const method of protoMethods) {
        expect(typeof target[method]).toBe("function");
      }
    });

    it("should return augmented object", () => {
      Eventify.enable({})
        .on("foo", (message) => {
          expect(message).toBe("hello emitter");
        })
        .trigger("foo", "hello emitter");
    });

    it("should augment an existing prototype", () => {
      function Plop() {}
      Eventify.enable(Plop.prototype);
      new Plop()
        .on("foo", (message) => {
          expect(message).toBe("hello emitter");
        })
        .trigger("foo", "hello emitter");
    });

    it("should only augment prototype with expected methods", () => {
      function Plop() {}
      Plop.prototype.foo = function () {};
      Eventify.enable(Plop.prototype);
      const keys = Object.keys(Plop.prototype).sort();
      const expected = ["foo"].concat(protoMethods).sort();
      expect(keys).toEqual(expected);
    });
  });

  describe("Eventify.create", () => {
    it("should return an empty event emitter", () => {
      const emitter = Eventify.create();
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
      const emitter = Eventify.create();
      let called = false;
      emitter.on("ping", () => {
        called = true;
      });
      emitter.emit("ping");
      expect(called).toBe(true);
    });

    it("produce is an alias of trigger", () => {
      const emitter = Eventify.create();
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
    Eventify.enable(obj);
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
    Eventify.enable(obj);

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
      Eventify.enable(local);
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
      Eventify.enable(local);

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
      const a = Eventify.enable({});
      const b = Eventify.enable({});
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
      const a = Eventify.enable({});
      const b = Eventify.enable({});
      const cb = () => {
        expect(true).toBe(true);
      };
      a.listenTo(b, { event: cb });
      b.trigger("event");
      a.listenTo(b, { event2: cb });
      b.on("event2", cb);
      a.stopListening(b, { event2: cb });
      b.trigger("event event2");
      a.stopListening();
      b.trigger("event event2");
    });

    it("stopListening with omitted args", () => {
      const a = Eventify.enable({});
      const b = Eventify.enable({});
      const cb = () => {
        expect(true).toBe(true);
      };
      a.listenTo(b, "event", cb);
      b.on("event", cb);
      a.listenTo(b, "event2", cb);
      a.stopListening(null, { event: cb });
      b.trigger("event event2");
      b.off();
      a.listenTo(b, "event event2", cb);
      a.stopListening(null, "event");
      a.stopListening();
      b.trigger("event2");
    });

    it("listenToOnce and stopListening", () => {
      const a = Eventify.enable({});
      const b = Eventify.enable({});
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
      const a = Eventify.enable({});
      const b = Eventify.enable({});
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
      const a = Eventify.enable({});
      const b = Eventify.enable({});
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
      const e = Eventify.enable({});
      e.listenTo(e, "foo", () => {
        expect(true).toBe(true);
      });
      e.trigger("foo");
    });

    it("listenTo yourself cleans yourself up with stopListening", () => {
      const e = Eventify.enable({});
      e.listenTo(e, "foo", () => {
        expect(true).toBe(true);
      });
      e.trigger("foo");
      e.stopListening();
      e.trigger("foo");
    });

    it("listenTo with empty callback doesn't throw an error", () => {
      const e = Eventify.enable({});
      e.listenTo(e, "foo", null);
      e.trigger("foo");
      expect(true).toBe(true);
    });
  });

  describe("Namespaced events + wildcards", () => {
    it("matches hierarchical wildcard listeners", () => {
      const emitter = Eventify.create();
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
      const emitter = Eventify.create();
      let called = false;
      emitter.on("/product/foo/org/*/tracked-object/*/assesment", () => {
        called = true;
      });

      emitter.trigger("/product/foo/org/123/tracked-object/456/assesment");

      expect(called).toBe(true);
    });

    it("supports custom namespace delimiters", () => {
      const emitter = Eventify.create({
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
  });

  describe("On, then unbind all functions", () => {
    const obj = { counter: 0 };
    Eventify.enable(obj);
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
    Eventify.enable(obj);
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
    Eventify.enable(obj);
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
    Eventify.enable(obj);

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
      TestClass.prototype.assertTrue = function () {
        expect(true).toBe(true);
      };
      const obj = Eventify.enable();
      obj.on("event", function () {
        this.assertTrue();
      }, new TestClass());
      obj.trigger("event");
    });
  });

  describe("nested trigger with unbind", () => {
    const obj = { counter: 0 };
    Eventify.enable(obj);

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
    const obj = Eventify.enable();

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
    const obj = Eventify.enable();

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

  describe("if no callback is provided, `on` is a noop", () => {
    Eventify.enable().on("test").trigger("test");
  });

  it("routes listener errors to onError instead of throwing", () => {
    const errors = [];
    const view = Eventify.create({
      onError: (error) => {
        errors.push(error);
      },
    }).on("test", "noop");

    view.trigger("test");
    expect(errors.length).toBe(1);
  });

  describe("remove all events for a specific context", () => {
    it("should remove context", () => {
      const obj = Eventify.enable();
      obj.on("x y all", () => {
        expect(true).toBe(true);
      });
      let removedCalls = 0;
      obj.on(
        "x y all",
        () => {
          removedCalls += 1;
        },
        obj
      );
      obj.off(null, null, obj);
      obj.trigger("x y");
      expect(removedCalls).toBe(0);
    });
  });

  describe("remove all events for a specific callback", () => {
    it("should remove callback", () => {
      const obj = Eventify.enable();

      function success() {
        expect(true).toBe(true);
      }

      let failCalls = 0;
      function fail() {
        failCalls += 1;
      }
      obj.on("x y all", success);
      obj.on("x y all", fail);
      obj.off(null, fail);
      obj.trigger("x y");
      expect(failCalls).toBe(0);
    });
  });

  describe("off is chainable", () => {
    it("should be chainable", () => {
      const obj = Eventify.enable();
      expect(obj.off() === obj).toBe(true);
      obj.on("event", () => {}, obj);
      expect(obj.off() === obj).toBe(true);
      obj.on("event", () => {}, obj);
      expect(obj.off("event") === obj).toBe(true);
    });
  });

  describe("#1310 - off does not skip consecutive events", () => {
    it("should not skip", () => {
      const obj = Eventify.enable();
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
      Eventify.enable(obj);
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
      const f = () => {
        expect(true).toBe(true);
      };
      const a = Eventify.enable({}).once("event", f);
      const b = Eventify.enable({}).on("event", f);

      a.trigger("event");

      b.trigger("event");
      b.trigger("event");
    });

    it("once variant two", () => {
      const f = () => {
        expect(true).toBe(true);
      };
      const obj = Eventify.enable({});

      obj.once("event", f).on("event", f).trigger("event").trigger("event");
    });

    it("once with off", () => {
      const f = () => {
        expect(true).toBe(true);
      };
      const obj = Eventify.enable({});

      obj.once("event", f);
      obj.off("event", f);
      obj.trigger("event");
    });

    it("once with event maps", () => {
      const obj = { counter: 0 };
      Eventify.enable(obj);

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
      const obj = Eventify.enable({});
      let called = false;
      obj.once("event", () => {
        called = true;
      }, context);
      obj.off(null, null, context);
      obj.trigger("event");
      expect(called).toBe(false);
    });

    it("once with asynchronous events", async () => {
      const obj = Eventify.enable({}).once("async", () => {
        // noop
      });
      obj.trigger("async");
      obj.trigger("async");
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(true).toBe(true);
    });

    it("once with multiple events.", () => {
      const obj = Eventify.enable({});
      obj.once("x y", () => {
        expect(true).toBe(true);
      });
      obj.trigger("x y");
    });

    it("Off during iteration with once.", () => {
      const obj = Eventify.enable({});
      const f = function () {
        this.off("event", f);
      };
      obj.on("event", f);
      obj.once("event", () => {});
      obj.on("event", () => {
        expect(true).toBe(true);
      });

      obj.trigger("event");
      obj.trigger("event");
    });

    it("once without a callback is a noop", () => {
      Eventify.enable({}).once("event").trigger("event");
    });
  });

  describe("Additional parameters", () => {
    it("should include additional parameters", () => {
      const obj = Eventify.enable();
      const param1 = "one";
      const param2 = ["two"];
      obj.on("event", (one, two) => {
        expect(one).toBe(param1);
        expect(two).toBe(param2);
      });
      obj.trigger("event", param1, param2);
    });
  });

  describe("Schema validation", () => {
    it("validates and transforms payloads on emit", () => {
      const schema = {
        parse: (value) => {
          if (typeof value !== "string") {
            throw new Error("invalid");
          }
          return value.toUpperCase();
        },
      };

      const emitter = Eventify.create({
        schemas: { shout: schema },
        validate: defaultSchemaValidator,
      });

      emitter.on("shout", (value) => {
        expect(value).toBe("HELLO");
      });

      emitter.trigger("shout", "hello");
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

      const emitter = Eventify.create({
        schemas: { count: schema },
        validate: defaultSchemaValidator,
      });

      expect(() => emitter.trigger("count", "nope")).toThrow();
    });
  });

  describe("Async iterator", () => {
    it("yields events in order", async () => {
      const emitter = Eventify.create();
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
      const emitter = Eventify.create();
      const controller = new AbortController();
      const iterator = emitter.iterate("tick", { signal: controller.signal });

      controller.abort();

      const result = await iterator.next();
      expect(result.done).toBe(true);
    });

    it("supports iterating all events", async () => {
      const emitter = Eventify.create();
      const iterator = emitter.iterate("all");

      emitter.trigger("ping");

      const result = await iterator.next();
      expect(result.value).toEqual(["ping"]);

      await iterator.return();
    });
  });
});
