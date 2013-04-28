if (process.env.NODE_ENV && process.env.NODE_ENV === 'coverage') {
  module.exports = require('./lib-cov/eventify.js');
} else {
  module.exports = require('./lib/eventify.js');
}
