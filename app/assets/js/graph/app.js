define([
    'lodash',
    'jquery',
    'mousetrap',
    'vue',
    'd3',
    'shared/util',
    'shared/daos/HypergraphDAO',
    'shared/daos/NodeDAO',
    'shared/daos/EdgeDAO',
    'graph/state',
    'graph/components/NavComponent',
    'graph/components/NodeComponent',
    'graph/components/EdgeComponent',
    'graph/components/GraphControlsComponent',
    'graph/components/ContextMenuComponent',
    'graph/components/NodePanelComponent',
    'graph/components/ForceLayoutPanel'
], function (
    _,
    $,
    Mousetrap,
    Vue,
    d3,
    util,
    HypergraphDAO,
    NodeDAO,
    EdgeDAO,
    State,
    NavComponent,
    NodeComponent,
    EdgeComponent,
    GraphControlsComponent,
    ContextMenuComponent,
    NodePanelComponent,
    ForceLayoutPanel
) {
  'use strict';

  ///
  /// DEFINITIONS
  ///

  var edgesMap = Object.create(null);
  var nodeComponentsMap = Object.create(null);

  var state = new State();

  var hypergraphID = _graph.id;

  var GraphComponent = Vue.extend({

    template: document.getElementById('graph').innerHTML,

    props: {
      nodes: {
        required: true
      },
      edges: {
        required: true
      },
      forceLayout: {
        required: true
      },
      saveAllGraphData: {
        required: true
      }
    },

    data: function () {
      return {
        isZooming: false,
        state: state,
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        offset: {
          left: 0,
          top: 0
        }
      };
    },

    methods: {

      incrementZoomLevel: function() {
        this.zoomUpdate({ clientX: this.width/2, clientY: this.height/2 }, 0.25);
      },

      decrementZoomLevel: function() {
        this.zoomUpdate({ clientX: this.width/2, clientY: this.height/2 }, -0.25);
      },

      mousewheelZoom: function(e) {
        e.preventDefault(); // this stops the page "overscroll" effect
        this.zoomUpdate(e, -(e.deltaY / 360), true);
      },

      zoomUpdate: function(e, zoomDelta, optimizeForSpeed) {
        var zoomFactor = Math.pow(1 + Math.abs(zoomDelta)/2 , zoomDelta > 0 ? 1 : -1);
        //var zoomFactor = Math.pow(1 + this.zoomSensitivity, zoomDelta);
        this.scaleZoom(e, zoomFactor, optimizeForSpeed);
      },

      scaleZoom: function(e, zoomFactor, optimizeForSpeed) {
        var nodesAndLinksGroupEl = this.$$.nodesAndLinksGroup;

        var ctm = nodesAndLinksGroupEl.getCTM();

        var p = this.$el.createSVGPoint();
        p.x = e.clientX - this.offset.left;
        p.y = e.clientY - this.offset.top;
        p = p.matrixTransform(ctm.inverse());

        var k = ctm
            .translate(p.x, p.y)
            .scale(zoomFactor)
            .translate(-p.x, -p.y);

        Vue.nextTick(function() {
          util.setCTM(nodesAndLinksGroupEl, k);
        });

        if (!optimizeForSpeed) {
          return;
        }


        // set isZooming to true and automatically reset it to false
        // after 100ms of idle zoom ... the isZooming flag is used
        // to speed up rendering

        if (this.$setIsZoomingToFalseTimeout) {
          clearTimeout(this.$setIsZoomingToFalseTimeout);
        }
        this.isZooming = true;

        var self = this;
        this.$setIsZoomingToFalseTimeout = setTimeout(function() {
          self.isZooming = false;
        }, 100);
      },

      resize: function () {
        var newWidth = this.$$el.width(),
            newHeight = this.$$el.height();

        if (this.width == newWidth &&
            this.height == newHeight) {
          return;
        }

        this.offset = this.$$el.offset();

        this.width = newWidth;
        this.height = newHeight;
      },

      panStart: function () {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        this._ctm = this.$$.nodesAndLinksGroup.getCTM();

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var ctm = this._ctm;

        var v = util.transformVectorFromClientToEl(e.dx, e.dy, this.$$.nodesAndLinksGroup);

        var self = this;
        Vue.nextTick(function() {
          util.setCTM(self.$$.nodesAndLinksGroup, ctm.translate(v.x, v.y));
        });
      },

      panEnd: function() {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;
        this._ctm = null;

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'auto');
        });
      },

      centerView: function() {
        var self = this;
        var defaultCTM = this.$el.createSVGMatrix();

        Vue.nextTick(function() {
          util.setCTM(self.$$.nodesAndLinksGroup, defaultCTM);
        });
      },

      contextMenu: function (e) {
        if (e.target != this.$$.backdrop) return;

        e.preventDefault();

        graphContextMenu.show(e.clientX, e.clientY);
      },

      onForceLayoutEnd: function() {
        if (this.forceLayout.isRunning) {
          this.saveAllGraphData();
        }

        this.forceLayout.isRunning = false;
      },

      restartForceLayoutIfRunning: function() {
        if (this.forceLayout.isRunning) {
          this.forceLayout.isRunning = false;

          var self = this;
          Vue.nextTick(function() {
            self.forceLayout.isRunning = true;
          });
        }
      }

    },

    created: function () {
      window.addEventListener('resize', this.resize.bind(this));
    },

    watch: {
      nodes: function(nodes) {
        this.$forceLayout.nodes(nodes);
      },

      edges: function(edges) {
        this.$forceLayout.links(edges);
      },

      'forceLayout.isRunning': function(isRunning) {
        if (isRunning) {
          this.$forceLayout.start();
        }
        else {
          this.$forceLayout.stop();
        }
      },

      'forceLayout.parameters.alpha': function(alpha) {
        this.$forceLayout.alpha(alpha);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.theta': function(theta) {
        this.$forceLayout.theta(theta);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.friction': function(friction) {
        this.$forceLayout.friction(friction);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.gravity': function(gravity) {
        this.$forceLayout.gravity(gravity);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.charge': function(charge) {
        this.$forceLayout.charge(charge);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.chargeDistance': function(chargeDistance) {
        this.$forceLayout.chargeDistance(chargeDistance);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.linkDistance': function(linkDistance) {
        this.$forceLayout.linkDistance(linkDistance);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.linkStrength': function(linkStrength) {
        this.$forceLayout.linkStrength(linkStrength);
        this.restartForceLayoutIfRunning();
      }
    },

    ready: function() {
      this.$$el = $(this.$el);
      this.$options.state = this.$parent.$options.state;
      this.$options.edgesMap = this.$parent.$options.edgesMap;
      this.$options.nodeComponentsMap = this.$parent.$options.nodeComponentsMap;
      this.$options.hypergraphID = this.$parent.$options.hypergraphID;
      this.$options.edgeContextMenu = this.$parent.$options.edgeContextMenu;

      this.resize();

      var $svg = util(this.$el);
      $svg.on('dragstart', this.panStart.bind(this));
      $svg.on('drag', this.pan.bind(this));
      $svg.on('dragend', this.panEnd.bind(this));

      var forceLayoutParameters = this.forceLayout.parameters;
      this.$forceLayout = d3.layout.force()
          .size([this.width, this.height])
          .alpha(forceLayoutParameters.alpha)
          .theta(forceLayoutParameters.theta)
          .friction(forceLayoutParameters.friction)
          .gravity(forceLayoutParameters.gravity)
          .charge(forceLayoutParameters.charge)
          .chargeDistance(forceLayoutParameters.chargeDistance)
          .linkDistance(forceLayoutParameters.linkDistance)
          .linkStrength(forceLayoutParameters.linkStrength);

      this.$forceLayout.on('end', this.onForceLayoutEnd.bind(this));
    }

  });

  ///
  /// MAIN APP CODE
  ///

  var graphContextMenu = new ContextMenuComponent({

    methods: {

      addNode: function(e) {
        app.newNode(e.clientX, e.clientY);
      },

      saveGraph: function() {
        app.saveAllGraphData();
      }

    }

  });

  var edgeContextMenu = new ContextMenuComponent({

    methods: {

      beforeShow: function(x, y, link) {
        this.$.link = link;
      },

      afterHide: function() {
        this.$.link = null;
      },

      delete: function() {
        this.$.link.delete();
      }

    }

  });

  Vue.component('x-force-layout-panel', ForceLayoutPanel);
  Vue.component('x-node-panel', NodePanelComponent);
  Vue.component('x-graph-controls', GraphControlsComponent);
  Vue.component('x-graph', GraphComponent);
  Vue.component('x-nav', NavComponent);
  Vue.component('x-edge', EdgeComponent);
  Vue.component('x-node', NodeComponent);

  graphContextMenu.$mount('#graphContextMenu');
  edgeContextMenu.$mount('#edgeContextMenu');

  function ForceLayoutSettings() {
    this.isPanelOpen = true;
    this.isRunning = false;

    this.defaultParameters = {
      alpha: 0.1,
      theta: 0.1,
      friction: 0.8,
      gravity: 0.15,
      charge: -20000,
      chargeDistance: 1600,
      linkDistance: 200,
      linkStrength: 10
    };

    this.parameters = _.clone(this.defaultParameters);
  }

  var app = new Vue({

    el: '#all',

    state: state,

    edgesMap: edgesMap,

    nodeComponentsMap: nodeComponentsMap,

    hypergraphID: hypergraphID,

    edgeContextMenu: edgeContextMenu,

    data: {
      hypergraphID: hypergraphID,
      dataState: 'SAVED', // UNSAVED/SAVING/SAVED
      graph: _graph, // _graph is bootstrapped into the main.scala.html view
      nodes: [],
      edges: [],
      nodeInfoToDisplay: null,
      forceLayout: new ForceLayoutSettings()
    },

    methods: {

      newNode: function(x, y) {
        var graphComponent = this.$.graphComponent;

        var ctm = graphComponent.$$.nodesAndLinksGroup.getScreenCTM();
        var p = graphComponent.$el.createSVGPoint();
        p.x = x;
        p.y = y;
        p = p.matrixTransform(ctm.inverse());

        var nodeData = {
          x: p.x,
          y: p.y,
          fixed: false,
          isNew: true,
          hasChanges: false,
          markedForDeletion: false,
          data: {
            name: 'Node Name',
            properties: {}
          }
        };

        var nodeComponent = graphComponent
            .$addChild({ data: nodeData}, NodeComponent)
            .$mount()
            .$appendTo(graphComponent.$$.dynamicContent);

        nodeComponent.$watch('markedForDeletion', function(markedForDeletion) {
          if (markedForDeletion) {
            nodeComponent.$destroy(true);
          }
        });

        this.nodeInfoToDisplay = nodeData;
      },

      incrementZoom: function() {
        this.$.graphComponent.incrementZoomLevel();
      },

      decrementZoom: function() {
        this.$.graphComponent.decrementZoomLevel();
      },

      centerView: function() {
        this.$.graphComponent.centerView();
      },

      saveAllGraphData: function() {
        var updateNodesPromise = NodeDAO.update(hypergraphID, this.nodes);
        //var updateEdgesPromise = EdgeDAO.update(hypergraphID, this.nodes);
        var updateGraphPromise = HypergraphDAO.update(this.graph);

        var self = this;
        this.dataState = 'SAVING';

        return $
            .when(updateGraphPromise, updateNodesPromise)
            .then(function() {
              self.dataState = 'SAVED';
            });
      }

    }

  });

  // fetch data

  util.when(NodeDAO.fetchAll(hypergraphID), EdgeDAO.fetchAll(hypergraphID))
      .done(function (nodes, links) {
        nodes.forEach(function (n) {
          links.forEach(function (l) {
            if (l.sourceId == n.id) l.source = n;
            if (l.targetId == n.id) l.target = n;

            var targets = edgesMap[l.sourceId] || (edgesMap[l.sourceId] = {});
            targets[l.targetId] = l;
          });
        });

        app.nodes = nodes;
        app.edges = links;

        app.$.graphComponent.$forceLayout.stop();
      });
});