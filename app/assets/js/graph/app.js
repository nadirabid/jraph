define([
    'lodash',
    'jquery',
    'mousetrap',
    'vue',
    'd3',
    'shared/util',
    'shared/daos/NodeDAO',
    'shared/daos/EdgeDAO',
    'graph/state',
    'graph/components/NodeComponent',
    'graph/components/EdgeComponent',
    'graph/components/NavigationBarComponent',
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
    NodeDAO,
    EdgeDAO,
    State,
    NodeComponent,
    EdgeComponent,
    NavigationBarComponent,
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

  var hypergraphID = window.location.pathname.split('/')[2];

  var GraphComponent = Vue.extend({

    data: function () {
      return {
        x: null,
        y: null,
        nodes: [ ],
        edges: [ ],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        zoomSensitivity: 0.22,
        maxZoomFactor: 1.55,
        minZoomFactor: 0.55,
        zoomTranslateX: 0,
        zoomTranslateY: 0
      };
    },

    events: {

      'startForceLayout': function(nodes, edges) {
        this.state.$layout
            .nodes(nodes)
            .links(edges)
            .start();
      }

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
        this.zoomUpdate(e, e.wheelDeltaY / 360);
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

      toggleForce: function () {
        var layout = this.state.layout;
        layout.enabled = !layout.enabled;
      },

      resize: function () {
        var newWidth = util.width(this.$el),
            newHeight = util.height(this.$el);

        if (this.width == newWidth &&
            this.height == newHeight) {
          return;
        }

        var layout = this.state.$layout;
        layout.size([ newWidth, newHeight ]);
        layout.resume();

        this.x = d3.scale.linear()
            .domain([0, newWidth])
            .range([0, newWidth]);

        this.y = d3.scale.linear()
            .domain([0, newHeight])
            .range([0, newHeight]);

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
        if (e.target != this.$el) return;

        e.stopPropagation();
        e.preventDefault();

        graphContextMenu.show(e.clientX, e.clientY);

        var closeContextMenu = function () {
          graphContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      }

    },

    created: function () {
      var layout = this.state.$layout;

      // TODO: unwatch when component is destroyed

      this.$watch('state.nodes', function (value, mutation) {
        if (!mutation) return;

        layout.force.nodes(value);
        layout.start();
      }, false, true);

      this.$watch('state.edges', function (value, mutation) {
        if (!mutation) return;

        layout.force.edges(value);
        layout.start();
      }, false, true);

      window.addEventListener('resize', this.resize.bind(this));
    },

    ready: function() {
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

  var graphComponent = new GraphComponent({

    state: state,

    edgesMap: edgesMap,

    nodeComponentsMap: nodeComponentsMap,

    hypergraphID: hypergraphID,

    floatingPanelBar: floatingPanelBar,

    edgeContextMenu: edgeContextMenu,

    data: {
      state: state
    }

  });

  var viewControls = new ViewControlsComponent({

    graphComponent: graphComponent

  });

  var navigationBarComponent = new NavigationBarComponent({

    data: {
      hypergraphID: hypergraphID,
      state: state
    }

  });

  Vue.component('x-edge', EdgeComponent);
  Vue.component('x-node', NodeComponent);

  graphContextMenu.$mount('#graphContextMenu');
  edgeContextMenu.$mount('#edgeContextMenu');
  graphComponent.$mount('#graph');
  viewControls.$mount('#viewControls');
  floatingPanelBar.$mount('#floatingPanelBar');

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

        graphComponent.edges = links;
        graphComponent.nodes = nodes;
        graphComponent.$emit('startForceLayout', nodes, links);
      });
});