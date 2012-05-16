// events
// -----------------
// Copyright(c) 2012 Bermi Ferrer <bermi@bermilabs.com>
// MIT Licensed

(function (root) {
  'use strict';

  var
    // Save the previous value of the `Events` variable.
    previousEvents = root.Events,

    _ = (root._ || require('underscore')),

    // Create a safe reference to the Events object for use below.
    Events = function (options) {
      var self = this;
      if (!(self instanceof Events)) {
        return new Events(options);
      }

      // Set defaults
      self.options = _.extend({
          debug: false
        }, options);

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
    }
  };


  // Export the Events object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `Events` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = Events;
    }
    exports.Events = Events;
  } else {
    // Set Events on the browser window
    root.Events = Events;
  }

// Establish the root object, `window` in the browser, or `global` on the server.
}(this));