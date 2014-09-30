var requirejs = require('requirejs');

requirejs.config({
  nodeRequire: require,
  baseUrl: __dirname
});

global.should = require('./libs/should.js');