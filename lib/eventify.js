// Eventify
// -----------------
// Copyright(c) 2010-2012 Jeremy Ashkenas, DocumentCloud
// Copyright(c) 2014 Bermi Ferrer <bermi@bermilabs.com>
// Copyright(c) 2013 Nicolas Perriault

// MIT Licensed


// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback functions
// to an event; trigger`-ing an event fires all callbacks in succession.
//
//     var object = {};
//     Eventify.enable(object);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
(function (name, global, definition) {
  if (typeof module !== 'undefined') {
    module.exports = definition(name, global);
  } else if (typeof define === 'function' && typeof define.amd === 'object') {
    define(definition);
  } else {
   //  global[name] = definition(name, global);
    var self = definition(),

    // Save the previous value of the `Eventify` variable.
    prev = global[name];

    // Run Eventify in *noConflict* mode, returning the `Eventify`
    // variable to its previous owner. Returns a reference to
    // the Eventify object.
    self.noConflict = function () {
      global[name] = prev;
      return self;
    };

    global[name] = self;
  }

}(this.localEventifyLibraryName || "Eventify", this, function () {
  'use strict';

  // Eventify, based on Backbone.Events
  // -----------------


  function uniqueId(prefix) {
    idCounter = idCounter + 1;
    var id = idCounter + '';
    return prefix ? prefix + id : id;
  }

  function once(func) {
    var ran = false,
      memo;
    return function () {
      if (ran) {
        return memo;
      }
      var args = (arguments.length === 1 ?
              [arguments[0]] : Array.apply(null, arguments));
      ran = true;
      memo = func.apply(this, args);
      func = null;
      return memo;
    };
  }

  var EventifyInstance,
    listenMethods = {
      listenTo: 'on',
      listenToOnce: 'once'
    },
    slice = Array.prototype.slice,
    idCounter = 0,

    // Regular expression used to split event strings
    eventSplitter = /\s+/,

    // Defines the name of the local variable the Eventify library will use
    // this is specially useful if window.Eventify is already being used
    // by your application and you want a different name. For example:
    //    // Declare before including the Eventify library
    //    var localEventifyLibraryName = 'EventManager';

    // Create a safe reference to the Eventify object for use below.
    Eventify = function () {
      return this;
    };

  Eventify.prototype = {

    // Event Functions
    // -----------------

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function (name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
        return this;
      }
      this._events = this._events || {};
      var events = this._events[name] || (this._events[name] = []);
      events.push({
        callback: callback,
        context: context,
        ctx: context || this
      });
      return this;
    },


    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function (name, callback, context) {
      var self = this,
        onceListener;

      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
        return this;
      }

      onceListener = once(function () {
        self.off(name, onceListener);
        var args = (arguments.length === 1 ?
                [arguments[0]] : Array.apply(null, arguments));
        callback.apply(this, args);
      });

      onceListener._callback = callback;
      return this.on(name, onceListener, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function (name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) {
        return this;
      }
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : Object.keys(this._events);
      for (i = 0, l = names.length; i < l; i += 1) {
        name = names[i];
        events = this._events[name];
        if (events) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j += 1) {
              ev = events[j];
              if ((callback &&
                  callback !== ev.callback &&
                  callback !== ev.callback._callback) ||
                (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) {
            delete this._events[name];
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function () {
      if (!this._events) {
        return this;
      }
      // #6 arguments should not be leaked in order to allow V8 optimizations.
      // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
      var args = (arguments.length === 1 ?
              [arguments[0]] : Array.apply(null, arguments));

      var events, allEvents;
      var name = args[0];
      var extraArgs = args.slice(1);
      if (!eventsApi(this, 'trigger', name, extraArgs)) {
        return this;
      }
      events = this._events[name];
      allEvents = this._events.all;
      if (events) {
        triggerEvents(events, extraArgs);
      }
      if (allEvents) {
        triggerEvents(allEvents, args);
      }
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function (obj, name, callback) {
      var deleteListener, id,
        listeners = this._listeners;
      if (!listeners) {
        return this;
      }
      deleteListener = !name && !callback;
      if (typeof name === 'object') {
        callback = this;
      }
      listeners = {};
      if (obj) {
        listeners[obj._listenerId] = obj;
      }
      for (id in listeners) {
        if (listeners.hasOwnProperty(id)) {
          listeners[id].off(name, callback, this);
          if (deleteListener) {
            delete this._listeners[id];
          }
        }
      }
      return this;
    },

  };



  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  function eventsApi(obj, action, name, rest) {
    var key, i, l, names;

    if (!name) {
      return true;
    }

    // Handle event maps.
    if (typeof name === 'object') {
      for (key in name) {
        if (name.hasOwnProperty(key)) {
          obj[action].apply(obj, [key, name[key]].concat(rest));
        }
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      names = name.split(eventSplitter);
      for (i = 0, l = names.length; i < l; i += 1) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  }

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).

  function triggerEvents(events, args) {
    var ev,
      i = 0,
      l = events.length,
      a1 = args[0],
      a2 = args[1],
      a3 = args[2];
    switch (args.length) {
    case 0:
      while (i < l) {
        ev = events[i];
        ev.callback.call(ev.ctx);
        i += 1;
      }
      return;
    case 1:
      while (i < l) {
        ev = events[i];
        ev.callback.call(ev.ctx, a1);
        i += 1;
      }
      return;
    case 2:
      while (i < l) {
        ev = events[i];
        ev.callback.call(ev.ctx, a1, a2);
        i += 1;
      }
      return;
    case 3:
      while (i < l) {
        ev = events[i];
        ev.callback.call(ev.ctx, a1, a2, a3);
        i += 1;
      }
      return;
    default:
      while (i < l) {
        ev = events[i];
        ev.callback.apply(ev.ctx, args);
        i += 1;
      }
    }
  }


  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  Object.keys(listenMethods).forEach(function (method) {
    var implementation = listenMethods[method];
    Eventify.prototype[method] = function (obj, name, callback) {
      var id,
        listeners = this._listeners || (this._listeners = {});
      obj._listenerId = obj._listenerId || uniqueId('l');
      id = obj._listenerId;
      listeners[id] = obj;
      if (typeof name === 'object') {
        callback = this;
      }
      obj[implementation](name, callback, this);
      return this;
    };
  });


  // Export an Eventify instance for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `Eventify` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  EventifyInstance = new Eventify();

  EventifyInstance.version = "2.0.0";


  // Utility Functions
  // -----------------


  // Adds the methods on, off and trigger to a target Object
  EventifyInstance.enable = function enable(target) {
    var i, len,
      methods = Object.keys(Eventify.prototype);
    target = target || {};
    for (i = 0, len = methods.length; i < len; i = i + 1) {
      target[methods[i]] = this[methods[i]];
    }
    return target;
  };

  EventifyInstance.create = function () {
    return Object.create(Eventify.prototype);
  };

  // Backbone.Events drop in replacement compatibility
  EventifyInstance.mixin = EventifyInstance.enable;

  // Expose prototype so other objects can extend it
  EventifyInstance.proto = Eventify.prototype;

  // Sets Eventify on the browser window or on the process
  return EventifyInstance;

  // Establish the root object, `window` in the browser,
  // or `global` on the server.
}));
