define([
    'lodash',
    'jquery',
    'mousetrap',
    'vue',
    'util',
    'models',
    'graph/state',
    'graph/components/NodeComponent',
    'graph/components/LinkComponent',
    'graph/components/NavigationBarComponent',
    'graph/components/FloatingPanelBarComponent',
    'graph/components/ZoomBarComponent',
    'graph/components/ContextMenuComponent',
    'graph/components/NodePanelComponent'
], function (
    _,
    $,
    Mousetrap,
    Vue,
    util,
    models,
    State,
    NodeComponent,
    LinkComponent,
    NavigationBarComponent,
    FloatingPanelBarComponent,
    ZoomBarComponent,
    ContextMenuComponent,
    NodePanelComponent
) {
  'use strict';

  ///
  /// DEFINITIONS
  ///

  var Node = models.Node;
  var Link = models.Link;

  var linksMap = Object.create(null);

  var state = new State();

  var hypergraphID = window.location.pathname.split('/')[2];

  var GraphComponent = Vue.extend({

    data: function () {
      return {
        x: null,
        y: null,
        nodes: [ ],
        links: [ ],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        zoomSensitivity: 0.22,
        totalZoomFactor: 1,
        maxZoomFactor: 1.55,
        minZoomFactor: 0.55,
        zoomTranslateX: 0,
        zoomTranslateY: 0
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
        this.zoomUpdate(e, e.wheelDeltaY / 360);
      },

      zoomUpdate: function(e, zoomDelta) {
        var zoomFactor = Math.pow(1 + this.zoomSensitivity, zoomDelta);
        this.totalZoomFactor = this.totalZoomFactor * zoomFactor;

        switch(this.state.zoomType) {
          case 'scale':
            this.scaleZoom(e, zoomFactor, this.totalZoomFactor);
            break;
          case 'semantic':
            this.semanticZoom(e, zoomFactor, this.totalZoomFactor);
            break;
          default:
            console.error('Unknown zoomType:', this.state.zoomType);
        }
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

        util.animationFrame(function() {
          util.setCTM(nodesAndLinksGroupEl, ctm.multiply(k));
        });
      },

      semanticZoom: function(e, zoomFactor, totalZoomFactor) {
        var scaledWidth = this.width * totalZoomFactor;
        var scaledHeight = this.height * totalZoomFactor;
        var nodesAndLinksGroupEl = this.$$.nodesAndLinksGroup;
        var ctm = nodesAndLinksGroupEl.getCTM();

        var p = this.$el.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        p = p.matrixTransform(ctm.inverse());

        var p2 = { x: p.x*zoomFactor, y: p.y*zoomFactor };

        if (!this._t) {
          this._t = { x: 0, y: 0};
        }

        var t = this._t;

        t.x += (p2.x - p.x);
        t.y += (p2.y - p.y);

        this.x = d3.scale.linear()
            .domain([0, this.width])
            .range([(0 - t.x)/zoomFactor, (scaledWidth - t.x)/zoomFactor]);

        this.y = d3.scale.linear()
            .domain([0, this.height])
            .range([(0 - t.y)/zoomFactor, (scaledHeight - t.y)/zoomFactor]);
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

        util.animationFrame(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var ctm = this._ctm;

        var p = util.transformVectorFromClientToEl(e.dx, e.dy, this.$$.nodesAndLinksGroup);
        util.setCTM(this.$$.nodesAndLinksGroup, ctm.translate(p.x, p.y));
      },

      panEnd: function() {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        this._ctm = null;

        util.animationFrame(function() {
          self.$el.style.setProperty('cursor', 'auto');
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

    events: {

      'data': function(nodes, links) {
        this.nodes = nodes;
        this.links = links;

        this.state.$layout
            .nodes(nodes)
            .links(links)
            .start();
      },

      'hook:created': function () {
        var layout = this.state.$layout;

        // TODO: unwatch when component is destroyed

        this.$watch('state.nodes', function (value, mutation) {
          if (!mutation) return;

          layout.force.nodes(value);
          layout.start();
        }, false, true);

        this.$watch('state.links', function (value, mutation) {
          if (!mutation) return;

          layout.force.links(value);
          layout.start();
        }, false, true);

        window.addEventListener('resize', this.resize.bind(this));
      },

      'hook:ready': function() {
        var self = this;

        var $svg = util(this.$el);
        $svg.on('dragstart', this.panStart.bind(this));
        $svg.on('drag', this.pan.bind(this));
        $svg.on('dragend', this.panEnd.bind(this));

        this.resize();
      }

    }

  });

  ///
  /// MAIN APP CODE
  ///

  var graphContextMenu = new ContextMenuComponent({

    methods: {

      addNode: function(e) {
        var p = util.transformPointFromClientToEl(
            e.clientX,
            e.clientY,
            graphComponent.$el
        );

        var nodeData = {
          x: p.x,
          y: p.y,
          fixed: false,
          data: {
            name: 'Name',
            properties: []
          }
        };

        var nodeComponent = graphComponent
            .$addChild({ data: nodeData}, NodeComponent)
            .$mount(graphComponent.$$.dynamicContent);

        var nodePanel = new NodePanelComponent({

          graphComponent: graphComponent,

          hypergraphID: hypergraphID,

          data: {
            isNew: true,
            node: nodeData
          },

          methods: {

            // TODO: should abstract this method out into FloatingPanelBar
            closeNodePanel: function() {
              floatingPanelBar.removePanel();
            }

          }

        });

        nodePanel.$once('removeGhostNode', function() {
          nodeComponent.$destroy(true);
        });

        floatingPanelBar.setPanel(nodePanel);
      },

      saveGraph: function() {
        Node.update(hypergraphID, graphComponent.nodes);
      }

    }

  });

  var nodeContextMenu = new ContextMenuComponent({

    methods: {

      /*
        Called with the arguments passed to show
        before the menu is actually shown.
       */
      beforeShow: function(x, y, node) {
        this.$.node = node;
      },

      afterHide: function() {
        this.$.node = null;
      },

      delete: function() {
        this.$.node.delete();
      },

      link: function() {
        this.$.node.setLinkSource();
      }

    }

  });

  var linkContextMenu = new ContextMenuComponent({

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

    linksMap: linksMap,

    hypergraphID: hypergraphID,

    floatingPanelBar: floatingPanelBar,

    nodeContextMenu: nodeContextMenu,

    linkContextMenu: linkContextMenu,

    data: {
      state: state
    }

  });

  var zoomBar = new ZoomBarComponent({

    graphComponent: graphComponent

  });

  var navigationBarComponent = new NavigationBarComponent({

    data: {
      hypergraphID: hypergraphID,
      state: state
    }

  });

  Vue.component('x-link', LinkComponent);
  Vue.component('x-node', NodeComponent);

  graphContextMenu.$mount('#graphContextMenu');
  nodeContextMenu.$mount('#nodeContextMenu');
  linkContextMenu.$mount('#linkContextMenu');
  graphComponent.$mount('#graph');
  zoomBar.$mount('#zoomBar');
  navigationBarComponent.$mount('#navbar');
  floatingPanelBar.$mount('#floatingPanelBar');

  // fetch data

  util.when(Node.fetchAll(hypergraphID), Link.fetchAll(hypergraphID))
      .done(function (nodes, links) {
        nodes.forEach(function (n) {
          links.forEach(function (l) {
            if (l.sourceId == n.id) l.source = n;
            if (l.targetId == n.id) l.target = n;

            var targets = linksMap[l.sourceId] || (linksMap[l.sourceId] = {});
            targets[l.targetId] = l;
          });
        });

        graphComponent.$add('nodes', nodes);
        graphComponent.$add('links', links);
        graphComponent.$emit('data', nodes, links);
      });
});