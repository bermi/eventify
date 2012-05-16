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
    before(function () {});

    describe('Setup', function () {
      it('should have default options', function () {
        var b = new Events();
        expect(b.options.debug).to.be(false);
      });
      it('should have set options', function () {
        var b = new Events({
          debug: true
        }),
          b2 = new Events({
            debug: true
          });

        expect(b.options.debug).to.be(true);
        expect(b2.options.debug).to.be(true);
      });
    });

    describe('No conflict', function () {
      it('should restore original Events', function () {
        var b = new Events({}),
          currentVersion = b.noConflict();
        expect(currentVersion).to.be(b);
        expect(root.Events).to.be("original");
      });
    });

  });

}(this));