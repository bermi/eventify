# events

Events is a lightweight module that can be mixed in to any object in order to provide it with custom events. It has no external dependencies. Based on Backbone.Events

## Installing

### On the browser

A 1.6k (830 bytes gzipped) browser ready version is available on the dist/ folder.

    <script src="/dist/events.min.js" type="text/javascript"></script>


### Node.js

    $ npm install events


## Documentation

Events is a module that can be mixed in to any object, giving the object the ability to bind and trigger custom named events. Events do not have to be declared before they are bound, and may take passed arguments. For example:

    var object = {};
    
    Events.eventify(object);
    
    object.on("alert", function(msg) {
      alert("Triggered " + msg);
    });
    
    object.trigger("alert", "an event");


### *eventify* Events.eventify(destination)

Copies the methods on, off and trigger to the destination object, and returns the destination object.

For example, to make a handy event dispatcher that can coordinate events among different areas of your application:

    var dispatcher = Events.eventify()


### *on* object.on(event, callback, [context])

Bind a callback function to an object. The callback will be invoked whenever the event is fired. If you have a large number of different events, the convention is to use colons to namespace them: "poll:start", or "change:selection". The event string may also be a space-delimited list of several events...

    book.on("change:title change:author", ...);

To supply a context value for this when the callback is invoked, pass the optional third argument: model.on('change', this.render, this)

Callbacks bound to the special "all" event will be triggered when any event occurs, and are passed the name of the event as the first argument. For example, to proxy all events from one object to another:

    proxy.on("all", function(eventName) {
      object.trigger(eventName);
    });


### *off* object.off([event], [callback], [context])
 
Remove a previously-bound callback function from an object. If no context is specified, all of the versions of the callback with different contexts will be removed. If no callback is specified, all callbacks for the event will be removed. If no event is specified, all event callbacks on the object will be removed.

    // Removes just the `onChange` callback.
    object.off("change", onChange);

    // Removes all "change" callbacks.
    object.off("change");

    // Removes the `onChange` callback for all events.
    object.off(null, onChange);

    // Removes all callbacks for `context` for all events.
    object.off(null, null, context);

    // Removes all callbacks on `object`.
    object.off();

### *trigger* object.trigger(event, [*args]) 

Trigger callbacks for the given event, or space-delimited list of events. Subsequent arguments to trigger will be passed along to the event callbacks.


### *noClonflict* var LocalEvents = Events.noConflict(); 

Returns the Events object back to its original value. You can use the return value of Events.noConflict() to keep a local reference to Events. Useful for embedding Events on third-party websites, where you don't want to clobber the existing Events object.

    var localEvents = Events.noConflict();
    var model = localEvents.eventify();


Another option is to bind the Events library to the window object using a different name. You can do so by declaring the localEventsLibraryName before loading the events library code. For example:

    <script>var localEventsLibraryName = 'EventManager';</script>
    <script src="/dist/events.min.js" type="text/javascript"></script>
    <script>
        var dispatcher = EventManager.eventify();
    </script>


## Testing

    $ make test

### On the browser

    $ make test-browser

### Code coverage

You will need to install https://github.com/visionmedia/node-jscoverage
and then run

    $ make test-coverage

## Development watcher and test runner

### Continuous linting

    $ make dev

### Continuous testing

    $ make test-watch

### Continuous linting + testing

    $ make dev-test


## License

(The MIT License)

Copyright (c) 2012 Bermi Ferrer &lt;bermi@bermilabs.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.