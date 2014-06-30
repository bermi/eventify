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
    global[name] = definition(name, global);
  }
}(this.localEventifyLibraryName || "Eventify", this, function (localName, root) {
  'use strict';

  // Eventify, based on Backbone.Events
  // -----------------

  // Returns a partial implementation matching the minimal API subset required
  // by Backbone.Events
  function miniscore() {
    return {
      // Retrieve the names of an object's properties.
      // Delegates to **ECMAScript 5**'s native `Object.keys`
      keys: Object.keys || function (obj) {
        if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
          throw new TypeError("keys() called on a non-object");
        }
        var key, keys = [];
        for (key in obj) {
          if (obj.hasOwnProperty(key)) {
            keys[keys.length] = key;
          }
        }
        return keys;
      },

      uniqueId: function (prefix) {
        idCounter = idCounter + 1;
        var id = idCounter + '';
        return prefix ? prefix + id : id;
      },

      each: function (obj, iterator, context) {
        var key, i, l;
        if (obj == null) {
          return;
        }
        if (nativeForEach && obj.forEach === nativeForEach) {
          obj.forEach(iterator, context);
        } else if (obj.length === +obj.length) {
          for (i = 0, l = obj.length; i < l; i += 1) {
            if (iterator.call(context, obj[i], i, obj) === breaker) {
              return;
            }
          }
        } else {
          for (key in obj) {
            if (obj.hasOwnProperty(key)) {
              if (iterator.call(context, obj[key], key, obj) === breaker) {
                return;
              }
            }
          }
        }
      },

      once: function (func) {
        var ran = false,
          memo;
        return function () {
          if (ran) {
            return memo;
          }
          ran = true;
          memo = func.apply(this, arguments);
          func = null;
          return memo;
        };
      }
    };
  }

  var EventifyInstance,
    triggerEvents,
    listenMethods = {
      listenTo: 'on',
      listenToOnce: 'once'
    },
    breaker = {},
    nativeForEach = Array.prototype.forEach,
    slice = Array.prototype.slice,
    idCounter = 0,
    eventsApi,

    // Save the previous value of the `Eventify` variable.
    previousEventify = root.Eventify,
    _ = miniscore(),

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

    version: "1.0.0",

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
        once;

      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
        return this;
      }

      once = _.once(function () {
        self.off(name, once);
        callback.apply(this, arguments);
      });

      once._callback = callback;
      return this.on(name, once, context);
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

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i += 1) {
        name = names[i];
        events = this._events[name];
        if (events) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j += 1) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
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
    trigger: function (name) {
      if (!this._events) {
        return this;
      }
      var events, allEvents,
        args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) {
        return this;
      }
      events = this._events[name];
      allEvents = this._events.all;
      if (events) {
        triggerEvents(events, args);
      }
      if (allEvents) {
        triggerEvents(allEvents, arguments);
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



    // Utility Functions
    // -----------------

    // Run Eventify in *noConflict* mode, returning the `Eventify`
    // variable to its previous owner. Returns a reference to
    // the Eventify object.
    noConflict: function () {
      root.Eventify = previousEventify;
      return this;
    },

    // Adds the methods on, off and trigger to a target Object
    enable: function (target) {
      var i, len,
        methods = ['on', 'once', 'off', 'trigger', 'stopListening', 'listenTo',
                   'listenToOnce', 'bind', 'unbind'];
      target = target || {};
      for (i = 0, len = methods.length; i < len; i = i + 1) {
        target[methods[i]] = this[methods[i]];
      }
      return target;
    }

  };



  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  eventsApi = function (obj, action, name, rest) {
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
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).

  triggerEvents = function (events, args) {
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
  };


  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function (implementation, method) {
    Eventify.prototype[method] = function (obj, name, callback) {
      var id,
        listeners = this._listeners || (this._listeners = {});
      obj._listenerId = obj._listenerId || _.uniqueId('l');
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

  // Backbone.Events drop in replacement compatibility
  EventifyInstance.mixin = EventifyInstance.enable;

  // Sets Eventify on the browser window or on the process
  return EventifyInstance;

  // Establish the root object, `window` in the browser, or `global` on the server.
}));