(function ($) {
  var Events = require('events');
  $.ender({
    events: Events,
    eventize: Events.eventize
  });
}(ender));