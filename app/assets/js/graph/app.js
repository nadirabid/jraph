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
    'graph/components/FloatingPanelBarComponent',
    'graph/components/ViewControlsComponent',
    'graph/components/ContextMenuComponent',
    'graph/components/NodePanelComponent'
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
    FloatingPanelBarComponent,
    ViewControlsComponent,
    ContextMenuComponent,
    NodePanelComponent
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

    props: [ 'nodes', 'edges' ],

    data: function () {
      return {
        state: state,
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        zoomSensitivity: 0.22,
        maxZoomFactor: 1.55,
        minZoomFactor: 0.55
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
        this.zoomUpdate(e, -(e.deltaY / 360));
      },

      zoomUpdate: function(e, zoomDelta) {
        var zoomFactor = Math.pow(1 + this.zoomSensitivity, zoomDelta);
        this.scaleZoom(e, zoomFactor);
      },

      scaleZoom: function(e, zoomFactor) {
        var nodesAndLinksGroupEl = this.$$.nodesAndLinksGroup;
        var ctm = nodesAndLinksGroupEl.getCTM();

        var p = this.$el.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        p = p.matrixTransform(ctm.inverse());

        var k = this.$el.createSVGMatrix()
            .translate(p.x, p.y)
            .scale(zoomFactor)
            .translate(-p.x, -p.y);

        k = ctm.multiply(k);

        Vue.nextTick(function() {
          util.setCTM(nodesAndLinksGroupEl, k);
        });
      },

      resize: function () {
        var newWidth = util.width(this.$el),
            newHeight = util.height(this.$el);

        if (this.width == newWidth &&
            this.height == newHeight) {
          return;
        }

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
      }

    },

    created: function () {
      window.addEventListener('resize', this.resize.bind(this));
    },

    ready: function() {
      this.$options.state = this.$parent.$options.state;
      this.$options.edgesMap = this.$parent.$options.edgesMap;
      this.$options.nodeComponentsMap = this.$parent.$options.nodeComponentsMap;
      this.$options.hypergraphID = this.$parent.$options.hypergraphID;
      this.$options.floatingPanelBar = this.$parent.$options.floatingPanelBar;
      this.$options.edgeContextMenu = this.$parent.$options.edgeContextMenu;

      this.resize();

      var $svg = util(this.$el);
      $svg.on('dragstart', this.panStart.bind(this));
      $svg.on('drag', this.pan.bind(this));
      $svg.on('dragend', this.panEnd.bind(this));
    }

  });

  ///
  /// MAIN APP CODE
  ///

  var graphComponent = new GraphComponent({});

  var graphContextMenu = new ContextMenuComponent({

    methods: {

      addNode: function(e) {
        var ctm = graphComponent.$$.nodesAndLinksGroup.getScreenCTM();
        var p = graphComponent.$el.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        p = p.matrixTransform(ctm.inverse());

        var nodeData = {
          x: p.x,
          y: p.y,
          fixed: false,
          isNew: true,
          data: {
            name: 'Node Name',
            properties: {}
          }
        };

        var nodeComponent = graphComponent
            .$addChild({ data: nodeData}, NodeComponent)
            .$mount()
            .$appendTo(graphComponent.$$.dynamicContent);

        var nodePanel = new NodePanelComponent({

          graphComponent: graphComponent,

          hypergraphID: hypergraphID,

          data: {
            isNew: true,
            node: nodeData
          }

        });

        nodePanel.$on('removeGhostNode', function() {
          nodeComponent.$destroy(true);
        });

        floatingPanelBar.setPanel(nodePanel);
      },

      saveGraph: function() {
        NodeDAO.update(hypergraphID, graphComponent.nodes);
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

  var floatingPanelBar = new FloatingPanelBarComponent();

  Vue.component('x-graph-controls', ViewControlsComponent);
  Vue.component('x-graph', GraphComponent);
  Vue.component('x-nav', NavComponent);
  Vue.component('x-edge', EdgeComponent);
  Vue.component('x-node', NodeComponent);

  graphContextMenu.$mount('#graphContextMenu');
  edgeContextMenu.$mount('#edgeContextMenu');
  floatingPanelBar.$mount('#floatingPanelBar');

  var app = new Vue({

    el: '#all',

    state: state,

    edgesMap: edgesMap,

    nodeComponentsMap: nodeComponentsMap,

    hypergraphID: hypergraphID,

    floatingPanelBar: floatingPanelBar,

    edgeContextMenu: edgeContextMenu,

    data: {
      dataState: 'SAVED', // UNSAVED/SAVING/SAVED
      graph: _graph, // _graph is bootstrapped into the graph.scala.html view
      nodes: [],
      edges: []
    },

    methods: {

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
        var updateEdgesPromise = EdgeDAO.update(hypergraphID, this.nodes);
        var updateGraphPromise = HypergraphDAO.update(this.graph);

        var self = this;
        this.dataState = 'SAVING';

        return $
            .when(updateGraphPromise, updateNodesPromise, updateEdgesPromise)
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
      });
});