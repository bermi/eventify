(function ($) {
  "use strict";
  var Events = require('eventify');
  $.ender({
    eventify: function () {
      return Events.enable.apply(Events, arguments);
    }
  });
}(ender));