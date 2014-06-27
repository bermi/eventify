(function (root) {

  var expect = root.expect || require('expect.js'),
    Eventify,
    is_commons = typeof require !== 'undefined';

  if (is_commons) {
    Eventify = require('../');
  } else {
    Eventify = root.Eventify;
  }

  describe('Eventify', function () {

    if (!is_commons) {
      describe('No conflict', function () {
        it('should restore original Eventify', function () {
          var b = Eventify,
            currentVersion = b.noConflict();
          expect(currentVersion).to.be(b);
          expect(root.Eventify).to.be("original");
        });
      });
    }

    describe("when enabling events using Eventify.enable, it:", function () {
      it("should add the Events mixin to passed prototype", function () {
        var target = {};
        Eventify.enable(target);
        expect(target).to.include.keys("on,once,off,trigger,stopListening".split(","));
      });

      it("should return augmented object", function (done) {
        Eventify.enable({}).on("foo", function (message) {
          expect(message).eql("hello emitter");
          done();
        }).trigger("foo", "hello emitter");
      });

      it("should augment an existing prototype", function (done) {
        function Plop() {}
        Eventify.enable(Plop.prototype);
        (new Plop()).on("foo", function (message) {
          expect(message).eql("hello emitter");
          done();
        }).trigger("foo", "hello emitter");
      });

      it("should only augment prototype with expected methods", function () {
        function Plop() {}
        Plop.prototype.foo = function () {};
        Eventify.enable(Plop.prototype);
        expect(Plop.prototype).to.have.keys(['foo', 'on', 'once', 'off', 'trigger',
          'stopListening', 'listenTo', 'listenToOnce', 'bind', 'unbind']);
      });
    });



    describe("On and trigger", function () {
      var obj = {
        counter: 0
      };
      Eventify.enable(obj);
      it('should increment counter', function () {
        obj.on('event', function () {
          obj.counter += 1;
        });
        obj.trigger('event');
        expect(obj.counter).to.be(1);
      });
      it('should increment counter five times', function () {
        obj.trigger('event');
        obj.trigger('event');
        obj.trigger('event');
        obj.trigger('event');
        expect(obj.counter).to.be(5);
      });
    });

    describe("Binding and triggering multiple events", function () {
      var obj = {
        counter: 0
      };
      Eventify.enable(obj);

      obj.on('a b c', function () {
        obj.counter += 1;
      });

      it('should only affect active counters', function () {
        obj.trigger('a');
        expect(obj.counter).to.be(1);

        obj.trigger('a b');
        expect(obj.counter).to.be(3);

        obj.trigger('c');
        expect(obj.counter).to.be(4);

        obj.off('a c');
        obj.trigger('a b c');
        expect(obj.counter).to.be(5);
      });

      it('should trigger all for each event', function () {
        var a, b, obj = {
            counter: 0
          };
        Eventify.enable(obj);
        obj.on('all', function (event) {
          obj.counter = obj.counter + 1;
          if (event === 'a') {
            a = true;
          }
          if (event === 'b') {
            b = true;
          }
        })
          .trigger('a b');
        expect(a).to.be(true);
        expect(b).to.be(true);
        expect(obj.counter).to.be(2);
      });



      it("binding and triggering with event maps", function () {
        var increment,
          obj = {
            counter: 0
          };
        Eventify.enable(obj);

        increment = function () {
          this.counter += 1;
        };

        obj.on({
          a: increment,
          b: increment,
          c: increment
        }, obj);

        obj.trigger('a');
        expect(obj.counter).eql(1);

        obj.trigger('a b');
        expect(obj.counter).eql(3);

        obj.trigger('c');
        expect(obj.counter).eql(4);

        obj.off({
          a: increment,
          c: increment
        }, obj);
        obj.trigger('a b c');
        expect(obj.counter).eql(5);
      });


      it("listenTo and stopListening", function () {
        var a = Eventify.enable({}),
          b = Eventify.enable({});
        a.listenTo(b, 'all', function () {
          expect(true).to.be.ok();
        });
        b.trigger('anything');
        a.listenTo(b, 'all', function () {
          expect(false).not.to.be.ok();
        });
        a.stopListening();
        b.trigger('anything');
      });

      it("listenTo and stopListening with event maps", function () {
        var a = Eventify.enable({}),
        b = Eventify.enable({}),
        cb = function () {
          expect(true).to.be.ok();
        };
        a.listenTo(b, {
          event: cb
        });
        b.trigger('event');
        a.listenTo(b, {
          event2: cb
        });
        b.on('event2', cb);
        a.stopListening(b, {
          event2: cb
        });
        b.trigger('event event2');
        a.stopListening();
        b.trigger('event event2');
      });

      it("stopListening with omitted args", function () {
        var a = Eventify.enable({}),
          b = Eventify.enable({}),
          cb = function () {
            expect(true).to.be.ok();
          };
        a.listenTo(b, 'event', cb);
        b.on('event', cb);
        a.listenTo(b, 'event2', cb);
        a.stopListening(null, {
          event: cb
        });
        b.trigger('event event2');
        b.off();
        a.listenTo(b, 'event event2', cb);
        a.stopListening(null, 'event');
        a.stopListening();
        b.trigger('event2');
      });

      it("listenToOnce and stopListening", function () {
        var a = Eventify.enable({}),
          b = Eventify.enable({});
        a.listenToOnce(b, 'all', function () {
          expect(true).to.be.ok();
        });
        b.trigger('anything');
        b.trigger('anything');
        a.listenToOnce(b, 'all', function () {
          expect(false).not.to.be.ok();
        });
        a.stopListening();
        b.trigger('anything');
      });

      it("listenTo, listenToOnce and stopListening", function () {
        var a = Eventify.enable({}),
          b = Eventify.enable({});
        a.listenToOnce(b, 'all', function () {
          expect(true).to.be.ok();
        });
        b.trigger('anything');
        b.trigger('anything');
        a.listenTo(b, 'all', function () {
          expect(false).not.to.be.ok();
        });
        a.stopListening();
        b.trigger('anything');
      });

      it("listenTo and stopListening with event maps", function () {
        var a = Eventify.enable({}),
          b = Eventify.enable({});
        a.listenTo(b, {
          change: function () {
            expect(true).to.be.ok();
          }
        });
        b.trigger('change');
        a.listenTo(b, {
          change: function () {
            expect(false).not.to.be.ok();
          }
        });
        a.stopListening();
        b.trigger('change');
      });


      it("listenTo yourself", function () {
        var e = Eventify.enable({});
        e.listenTo(e, "foo", function () {
          expect(true).to.be.ok();
        });
        e.trigger("foo");
      });

      it("listenTo yourself cleans yourself up with stopListening", function () {
        var e = Eventify.enable({});
        e.listenTo(e, "foo", function () {
          expect(true).to.be.ok();
        });
        e.trigger("foo");
        e.stopListening();
        e.trigger("foo");
      });

      it("listenTo with empty callback doesn't throw an error", function () {
        var e = Eventify.enable({});
        e.listenTo(e, "foo", null);
        e.trigger("foo");
        expect(true).to.be.ok();
      });

    });

    describe("On, then unbind all functions", function () {
      var callback,
        obj = {
          counter: 0
        };
      Eventify.enable(obj);
      callback = function () {
        obj.counter = obj.counter + 1;
      };
      obj.on('event', callback);
      obj.trigger('event');
      obj.off('event');
      obj.trigger('event');
      it("should have only been incremented once", function () {
        expect(obj.counter).to.be(1);
      });
    });

    describe("Bind two callbacks, unbind only one", function () {
      var callback,
        obj = {
          counterA: 0,
          counterB: 0
        };
      Eventify.enable(obj);
      callback = function () {
        obj.counterA = obj.counterA + 1;
      };
      obj.on('event', callback);
      obj.on('event', function () {
        obj.counterB = obj.counterB + 1;
      });
      obj.trigger('event');
      obj.off('event', callback);
      obj.trigger('event');
      it("should only increment counterA once", function () {
        expect(obj.counterA).to.be(1);
      });
      it("should increment counterB twice", function () {
        expect(obj.counterB).to.be(2);
      });
    });

    describe("Unbind a callback in the midst of it firing", function () {
      var callback,
        obj = {
          counter: 0
        };
      Eventify.enable(obj);
      callback = function () {
        obj.counter = obj.counter + 1;
        obj.off('event', callback);
      };
      obj.on('event', callback);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      it('should unbound the callback', function () {
        expect(obj.counter).to.be(1);
      });
    });

    describe("Two binds that unbind themselves", function () {
      var obj = {
        counterA: 0,
        counterB: 0
      };
      Eventify.enable(obj);

      function incrA() {
        obj.counterA = obj.counterA + 1;
        obj.off('event', incrA);
      }

      function incrB() {
        obj.counterB = obj.counterB + 1;
        obj.off('event', incrB);
      }
      obj.on('event', incrA);
      obj.on('event', incrB);
      obj.trigger('event');
      obj.trigger('event');
      obj.trigger('event');
      it('should have incremented counterA only once', function () {
        expect(obj.counterA).to.be(1);
      });
      it('should have incremented counterB only once', function () {
        expect(obj.counterB).to.be(1);
      });
    });

    describe("bind a callback with a supplied context", function () {
      it('should bound `this` to the callback', function (done) {
        var obj,
          TestClass = function () {
            return this;
          };
        TestClass.prototype.assertTrue = function () {
          expect(true).to.be(true);
          done();
        };
        obj = Eventify.enable();
        obj.on('event', function () {
          this.assertTrue();
        }, (new TestClass()));
        obj.trigger('event');
      });
    });

    describe("nested trigger with unbind", function () {
      var obj = {
        counter: 0
      };
      Eventify.enable(obj);

      function incr1() {
        obj.counter = obj.counter + 1;
        obj.off('event', incr1);
        obj.trigger('event');
      }

      function incr2() {
        obj.counter = obj.counter + 1;
      }
      obj.on('event', incr1);
      obj.on('event', incr2);
      obj.trigger('event');
      it('should have been incremented the counter three times', function (done) {
        expect(obj.counter).to.be(3);
        done();
      });
    });


    describe("callback list is not altered during trigger", function () {
      var counter = 0,
        obj = Eventify.enable();

      function incr() {
        counter = counter + 1;
      }
      it('prevents bind from altering the callback list', function () {
        obj.on('event', function () {
          obj.on('event', incr).on('all', incr);
        })
          .trigger('event');
        expect(counter).to.be(0);
      });
      it('prevents unbind from altering the callback list', function () {
        obj.off()
          .on('event', function () {
            obj.off('event', incr).off('all', incr);
          })
          .on('event', incr)
          .on('all', incr)
          .trigger('event');
        expect(counter).to.be(2);
      });
    });

    describe("#1282 - 'all' callback list is retrieved after each event.", function () {
      var counter = 0,
        obj = Eventify.enable();

      function incr() {
        counter = counter + 1;
      }
      it('should retrieve all the callbacks', function () {
        obj.on('x', function () {
          obj.on('y', incr).on('all', incr);
        })
          .trigger('x y');
        expect(counter).to.be(2);
      });
    });

    describe("if no callback is provided, `on` is a noop", function () {
      Eventify.enable().on('test').trigger('test');
    });

    it("if callback is truthy but not a function, `on` should throw an error" +
      " just like jQuery", function () {
      var view = Eventify.enable({}).on('test', 'noop');
      expect(function () {
        view.trigger('test');
      }).to.throwException(Error);
    });

    describe("remove all events for a specific context", function () {
      it("should remove context", function (done) {
        var obj = Eventify.enable();
        obj.on('x y all', function () {
          expect(true).to.be(true);
        });
        obj.on('x y all', function () {
          expect(true).to.be(false);
        }, obj);
        obj.off(null, null, obj);
        obj.trigger('x y');
        done();
      });
    });

    describe("remove all events for a specific callback", function () {
      it("should remove callback", function (done) {
        var obj = Eventify.enable();

        function success() {
          expect(true).to.be(true);
        }

        function fail() {
          expect(true).to.be(false);
        }
        obj.on('x y all', success);
        obj.on('x y all', fail);
        obj.off(null, fail);
        obj.trigger('x y');
        done();
      });
    });

    describe("off is chainable", function () {
      it("should be chainable", function () {
        var obj = Eventify.enable();
        // With no events
        expect(obj.off() === obj).to.be(true);
        // When removing all events
        obj.on('event', function () {}, obj);
        expect(obj.off() === obj).to.be(true);
        // When removing some events
        obj.on('event', function () {}, obj);
        expect(obj.off('event') === obj).to.be(true);
      });
    });

    describe("#1310 - off does not skip consecutive events", function () {
      it("should not skip", function (done) {
        var obj = Eventify.enable();
        obj.on('event', function () {
          expect(true).to.be(false);
        }, obj);
        obj.on('event', function () {
          expect(true).to.be(false);
        }, obj);
        obj.off(null, null, obj);
        obj.trigger('event');
        done();
      });
    });


    describe("When attaching an event listener only once, it:", function () {
      it("once", function () {
        // Same as the previous test, but we use once rather than having to explicitly unbind
        var incrA, incrB,
          obj = {
            counterA: 0,
            counterB: 0
          };
        Eventify.enable(obj);
        incrA = function () {
          obj.counterA += 1;
          obj.trigger('event');
        };
        incrB = function () {
          obj.counterB += 1;
        };
        obj.once('event', incrA);
        obj.once('event', incrB);
        obj.trigger('event');
        expect(obj.counterA, 1, 'counterA should have only been incremented once.');
        expect(obj.counterB, 1, 'counterB should have only been incremented once.');
      });

      it("once variant one", function () {
        var f = function () {
            expect(true).to.be.ok();
          },
          a = Eventify.enable({}).once('event', f),
          b = Eventify.enable({}).on('event', f);

        a.trigger('event');

        b.trigger('event');
        b.trigger('event');
      });

      it("once variant two", function () {
        var f = function () {
          expect(true).to.be.ok();
        },
        obj = Eventify.enable({});

        obj
          .once('event', f)
          .on('event', f)
          .trigger('event')
          .trigger('event');
      });

      it("once with off", function () {
        var f = function () {
          expect(true).to.be.ok();
        },
        obj = Eventify.enable({});

        obj.once('event', f);
        obj.off('event', f);
        obj.trigger('event');
      });

      it("once with event maps", function () {
        var increment,
          obj = {
            counter: 0
          };

        Eventify.enable(obj);

        increment = function () {
          this.counter += 1;
        };

        obj.once({
          a: increment,
          b: increment,
          c: increment
        }, obj);

        obj.trigger('a');
        expect(obj.counter).eql(1);

        obj.trigger('a b');
        expect(obj.counter).eql(2);

        obj.trigger('c');
        expect(obj.counter).eql(3);

        obj.trigger('a b c');
        expect(obj.counter).eql(3);
      });

      it("once with off only by context", function () {
        var context = {},
        obj = Eventify.enable({});
        obj.once('event', function () {
          expect(false).not.to.be.ok();
        }, context);
        obj.off(null, null, context);
        obj.trigger('event');
      });

      it("once with asynchronous events", function (done) {
        var func = function () {
            setTimeout(done, 50);
          },
          obj = Eventify.enable({}).once('async', func);

        obj.trigger('async');
        obj.trigger('async');
      });

      it("once with multiple events.", function () {
        var obj = Eventify.enable({});
        obj.once('x y', function () {
          expect(true).to.be.ok();
        });
        obj.trigger('x y');
      });

      it("Off during iteration with once.", function () {
        var obj = Eventify.enable({}),
        f = function () {
          this.off('event', f);
        };
        obj.on('event', f);
        obj.once('event', function () {});
        obj.on('event', function () {
          expect(true).to.be.ok();
        });

        obj.trigger('event');
        obj.trigger('event');
      });

      it("once without a callback is a noop", function () {
        Eventify.enable({}).once('event').trigger('event');
      });

    });


    describe("Additional parameters", function () {
      it("should include additional parameters", function (done) {
        var obj = Eventify.enable(),
          param1 = "one",
          param2 = ["two"];
        obj.on('event', function (one, two) {
          expect(one).to.be(param1);
          expect(two).to.be(param2);
          done();
        });
        obj.trigger('event', param1, param2);
      });
    });

  });

}(this));