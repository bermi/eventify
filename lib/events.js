// Events
// -----------------
// Copyright(c) 2010-2012 Jeremy Ashkenas, DocumentCloud
// Copyright(c) 2012 Bermi Ferrer <bermi@bermilabs.com>
// MIT Licensed


// A module that can be mixed in to *any object* in order to provide it with
// custom events. You may bind with `on` or remove with `off` callback functions
// to an event; trigger`-ing an event fires all callbacks in succession.
//
//     var object = {};
//     _.extend(object, Events);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
(function (root) {
  'use strict';

  // Events, based on Backbone.Events
  // -----------------

  var EventsInstance,
    // Save the previous value of the `Events` variable.
    previousEvents = root.Events,

    _ = (root._ || require('underscore')),

    // Regular expression used to split event strings
    eventSplitter = /\s+/,

    // Create a safe reference to the Events object for use below.
    Events = function (options) {
      return this;
    };

  Events.prototype = {
    // Utility Functions
    // -----------------

    // Run Events in *noConflict* mode, returning the `Events`
    // variable to its previous owner. Returns a reference to
    // the Events object.
    noConflict: function () {
      root.Events = previousEvents;
      return this;
    },

    // Bind one or more space separated events, `events`, to a `callback`
    // function. Passing `"all"` will bind the callback to all events fired.
    on: function (events, callback, context) {
      var calls, event, list;
      if (!callback) {
        return this;
      }

      events = events.split(eventSplitter);
      calls = this._callbacks || (this._callbacks = {});

      event = events.shift();
      while (event) {
        list = calls[event] || (calls[event] = []);
        list.push(callback, context);
        event = events.shift();
      }

      return this;
    },

    // Remove one or many callbacks. If `context` is null, removes all callbacks
    // with that function. If `callback` is null, removes all callbacks for the
    // event. If `events` is null, removes all bound callbacks for all events.
    off: function (events, callback, context) {
      var event, calls, list, i;

      // No events, or removing *all* events.
      if (!(calls = this._callbacks)) {
        return this;
      }
      if (!(events || callback || context)) {
        delete this._callbacks;
        return this;
      }

      events = events ? events.split(eventSplitter) : _.keys(calls);

      // Loop through the callback list, splicing where appropriate.
      event = events.shift();
      while (event) {
        if (!(list = calls[event]) || !(callback || context)) {
          delete calls[event];
          event = events.shift();
          continue;
        }

        for (i = list.length - 2; i >= 0; i -= 2) {
          if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
            list.splice(i, 2);
          }
        }
        event = events.shift();
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function (events) {
      var event, calls, list, i, length, args, all, rest;
      if (!(calls = this._callbacks)) {
        return this;
      }

      rest = [];
      events = events.split(eventSplitter);
      for (i = 1, length = arguments.length; i < length; i = i + 1) {
        rest[i - 1] = arguments[i];
      }

      // For each event, walk through the list of callbacks twice, first to
      // trigger the event, then to trigger any `"all"` callbacks.
      event = events.shift();
      while (event) {
        // Copy callback lists to prevent modification.
        all = calls.all;
        if (all) {
          all = all.slice();
        }
        list = calls[event];
        if (list) {
          list = list.slice();
        }

        // Execute event callbacks.
        if (list) {
          for (i = 0, length = list.length; i < length; i += 2) {
            list[i].apply(list[i + 1] || this, rest);
          }
        }

        // Execute "all" callbacks.
        if (all) {
          args = [event].concat(rest);
          for (i = 0, length = all.length; i < length; i += 2) {
            all[i].apply(all[i + 1] || this, args);
          }
        }
        event = events.shift();
      }

      return this;
    }
  };

  // Export an Events instance for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `Events` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  EventsInstance = new Events();
  // Sets Events on the browser window or on the process
  ((typeof exports !== 'undefined') ? exports : root).Events = new Events();
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = new Events();
    }
  }

// Establish the root object, `window` in the browser, or `global` on the server.
}(this));