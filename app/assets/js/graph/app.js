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
    'graph/components/GraphComponent',
    'graph/components/NavComponent',
    'graph/components/NodeComponent',
    'graph/components/EdgeComponent',
    'graph/components/GraphControlsComponent',
    'graph/components/ContextMenuComponent',
    'graph/components/NodePanelComponent',
    'graph/components/ForceLayoutPanelComponent'
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
    GraphComponent,
    NavComponent,
    NodeComponent,
    EdgeComponent,
    GraphControlsComponent,
    ContextMenuComponent,
    NodePanelComponent,
    ForceLayoutPanelComponent
) {
  'use strict';

  ///
  /// DEFINITIONS
  ///

  var edgesMap = Object.create(null);
  var nodeComponentsMap = Object.create(null);

  var hypergraphID = _graph.id;

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

  Vue.component('x-force-layout-panel', ForceLayoutPanelComponent);
  Vue.component('x-node-panel', NodePanelComponent);
  Vue.component('x-graph-controls', GraphControlsComponent);
  Vue.component('x-graph', GraphComponent);
  Vue.component('x-nav', NavComponent);
  Vue.component('x-edge', EdgeComponent);
  Vue.component('x-node', NodeComponent);

  graphContextMenu.$mount('#graphContextMenu');
  edgeContextMenu.$mount('#edgeContextMenu');

  function ForceLayoutSettings() {
    this.isPanelOpen = false;
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

    edgesMap: edgesMap,

    nodeComponentsMap: nodeComponentsMap,

    hypergraphID: hypergraphID,

    edgeContextMenu: edgeContextMenu,

    data: {
      hypergraphID: hypergraphID,
      nodeState: 'initial',
      dataState: 'SAVED', // UNSAVED/SAVING/SAVED
      graph: _graph, // _graph is bootstrapped into the main.scala.html view
      nodes: [],
      edges: [],
      nodeInfoToDisplay: null,
      forceLayoutSettings: new ForceLayoutSettings()
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