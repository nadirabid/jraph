define([
    'lodash',
    'd3'
], function(_, d3) {

  var FORCE_THROTTLE_TIME = 500;

  function ForceLayout() {

  }

  function State(initData) {
    // since state will sometimes be passed
    // to Vue components, every method/property which
    // doesn't need to be watched by Vue (avoid overhead)
    // should be prefixed with '$'

    initData = initData || {};

    var $force = d3.layout.force()
        .theta(0.1)
        .friction(0.5)
        .gravity(0.5)
        .charge(-6000)
        .linkDistance(50);

    var _start = _.throttle(
        $force.start.bind($force),
        FORCE_THROTTLE_TIME);

    var _resume = _.throttle(
        $force.resume.bind($force),
        FORCE_THROTTLE_TIME);

    this.links = initData.links || [];
    this.nodes = initData.nodes || [];

    this.layout = { };
    this.$force = $force;
    this.layout.enabled = true;

    if (initData.layoutEnabled !== undefined) {
      this.layout.enabled = initData.layoutEnabled;
    }

    this.layout.start = function() {
      if (this.enabled) {
        _start();
      }
    };

    this.layout.resume = function() {
      if (this.enabled) {
        _resume();
      }
    };
  }

  return State;
});
