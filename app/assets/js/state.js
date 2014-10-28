define([
    'lodash',
    'd3',
    'util'
], function(_, d3, util) {

  var FORCE_THROTTLE_TIME = 500;

  var def = Object.defineProperty;

  function ForceLayout() {
    this._forceLayout = d3.layout.force()
        .theta(0.1)
        .friction(0.5)
        .gravity(0.5)
        .charge(-6000)
        .linkDistance(50);

    this._start = _.throttle(
        this._forceLayout.start.bind(this._forceLayout),
        FORCE_THROTTLE_TIME);

    this._resume = _.throttle(
        this._forceLayout.resume.bind(this._forceLayout),
        FORCE_THROTTLE_TIME);

    this._enabled = true;
  }

  var ForceLayoutProto = ForceLayout.prototype;

  def(ForceLayoutProto, 'enabled', {
    get: function() {
      return this._enabled;
    },
    set: function(value) {
      if (value === true && !this._enabled) {
        this._forceLayout.start();
        this._enabled = true;
      }
      else if (!value && this._enabled) {
        this._forceLayout.stop();
        this._enabled = false;
      }
    }
  });

  def(ForceLayoutProto, 'start', {
    value: function() {
      if (this.enabled) {
        this._start();
      }

      return this;
    }
  });

  def(ForceLayoutProto, 'resume', {
    value: function() {
      if (this.enabled) {
        this._resume();
      }

      return this;
    }
  });

  def(ForceLayoutProto, 'nodes', {
    value: function(nodes) {
      this._forceLayout.nodes(nodes);
      return this;
    }
  });

  def(ForceLayoutProto, 'links', {
    value: function(links) {
      this._forceLayout.links(links);
      return this;
    }
  });

  def(ForceLayoutProto, 'on', {
    value: function(event, handler) {
      this._forceLayout.on(event, handler);
      return this;
    }
  });

  def(ForceLayoutProto, 'size', {
    value: function(dimArray) {
      this._forceLayout.size(dimArray);
      return this;
    }
  });

  function State(initData) {
    // since state will sometimes be passed
    // to Vue components, every method/property which
    // doesn't need to be watched by Vue (avoid overhead)
    // should be prefixed with '$'

    initData = initData || {};

    this.nodeState = 'initial';
    this.links = initData.links || [];
    this.nodes = initData.nodes || [];
    this.$layout = new ForceLayout();

    if (!util.isNullOrUndefined(initData.layoutEnabled)) {
      this.$layout.enabled = initData.layoutEnabled;
    }
  }

  return State;
});
