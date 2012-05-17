(function (root) {

  var expect = root.expect || require('expect.js'),
    Events;

  if (typeof window === 'undefined') {
    root.Events = "original";
    Events = require('../');
  } else {
    Events = root.Events;
  }

  describe('Events', function () {

    describe('No conflict', function () {
      it('should restore original Events', function () {
        var b = Events,
          currentVersion = b.noConflict();
        expect(currentVersion).to.be(b);
        expect(root.Events).to.be("original");
      });
    });

    describe("On and trigger", function () {
      var obj = { counter: 0 };
      Events.eventize(obj);
      it('should increment counter', function () {
        obj.on('event', function () { obj.counter += 1; });
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
      var obj = { counter: 0 };
      Events.eventize(obj);

      obj.on('a b c', function () { obj.counter += 1; });

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
        var a, b, obj = { counter: 0 };
        Events.eventize(obj);
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

    });

    describe("On, then unbind all functions", function () {
      var callback,
        obj = { counter: 0 };
      Events.eventize(obj);
      callback = function () { obj.counter = obj.counter + 1; };
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
        obj = { counterA: 0, counterB: 0 };
      Events.eventize(obj);
      callback = function () { obj.counterA = obj.counterA + 1; };
      obj.on('event', callback);
      obj.on('event', function () { obj.counterB = obj.counterB + 1; });
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
        obj = {counter: 0};
      Events.eventize(obj);
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

    describe("Two binds that unbind themeselves", function () {
      var obj = { counterA: 0, counterB: 0 };
      Events.eventize(obj);
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
        obj = Events.eventize();
        obj.on('event', function () {
            this.assertTrue();
          }, (new TestClass()));
        obj.trigger('event');
      });
    });

    describe("nested trigger with unbind", function () {
      var obj = { counter: 0 };
      Events.eventize(obj);
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
        obj = Events.eventize();
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
        obj = Events.eventize();
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
      Events.eventize().on('test').trigger('test');
    });

    describe("remove all events for a specific context", function () {
      it("should remove context", function (done) {
        var obj = Events.eventize();
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
        var obj = Events.eventize();
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
        var obj = Events.eventize();
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
        var obj = Events.eventize();
        obj.on('event', function () { expect(true).to.be(false); }, obj);
        obj.on('event', function () { expect(true).to.be(false); }, obj);
        obj.off(null, null, obj);
        obj.trigger('event');
        done();
      });
    });

    describe("Additional parameters", function () {
      it("should include aditional parameters", function (done) {
        var obj = Events.eventize(),
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