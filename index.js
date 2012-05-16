module.exports = process.env.NODE_ENV && process.env.NODE_ENV === 'coverage' ? require('./lib-cov/') : require('./lib/');
