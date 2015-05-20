define([
    'lodash',
    'jquery',
    'mousetrap',
    'vue',
    'util',
    'models',
    'graph/state',
    'graph/components/navbar',
    'graph/components/floatingpanelbar',
    'graph/components/zoombar',
    'graph/components/contextmenu'
], function (
    _,
    $,
    Mousetrap,
    Vue,
    util,
    models,
    State,
    NavbarComponent,
    FloatingPanelBar,
    ZoomBarComponent,
    ContextMenu
) {
  'use strict';

  ///
  /// DEFINITIONS
  ///

  var Node = models.Node;
  var Link = models.Link;

  var linksMap = Object.create(null);

  var state = new State();
  var mouse = util.mouse;

  var hypergraphID = window.location.pathname.split('/')[2];

  function StateEventHandlers() {
    this.click = util.noop;
    this.dblclick = util.noop;
    this.mouseover = util.noop;
    this.mouseout = util.noop;
    this.drag = util.noop;
    this.dragstart = util.noop;
    this.dragend = util.noop;
  }

  /// GRAPH VIEW COMPONENTS

  var DisabledNodeState = util.extendClass(StateEventHandlers);

  var InitialNodeState = util.extendClass(StateEventHandlers, function (ctx) {
    var dragFlag = false;

    this.click = function() {
      if (dragFlag) {
        dragFlag = false;
        return;
      }

      var nodePanel = new NodePanel({
        data: {
          isNew: false,
          node: ctx.$data
        }
      });

      floatingPanelBar.setPanel(nodePanel);
    };

    // focus on node
    this.mouseover = function () {
      if (mouse.dragState.state !== util.DRAG_STATES.NONE) {
        return;
      }

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;

      // move node to front so that it isn't
      // hidden behind another node
      var nodes = ctx.$parent.nodes;
      if (ctx.$index < ( nodes.length - 1 )) {
        nodes.push(nodes.$remove(ctx.$index));
      }
    };

    //hide menu
    this.mouseout = function () {
      if (mouse.dragState.state !== util.DRAG_STATES.NONE) {
        return;
      }

      ctx.fixed = false;
    };

    //drag node
    this.dragstart = function (e) {
      // to stop drag event from propagating to panning handler on svg
      e.stopPropagation();

      if (e.target !== ctx.$$.nodeRect) {
        return;
      }

      // to stop cursor from default
      e.preventDefault();

      ctx.px = ctx.x;
      ctx.py = ctx.y;

      ctx.menu = false;

      util.animationFrame(function() {
        ctx.$parent.$el.style.setProperty('cursor', 'move');
      });
    };

    this.drag = function (e) {
      var ctm = ctx.$parent.$$.nodesAndLinksGroup.getScreenCTM();
      var p = ctx.$parent.$el.createSVGPoint();

      p.x = e.clientX;
      p.y = e.clientY;
      p = p.matrixTransform(ctm.inverse());

      ctx.px = ctx.x = p.x;
      ctx.py = ctx.y = p.y;

      dragFlag = true;

      state.$layout.resume();
    };

    this.dragend = function () {
      ctx.menu = true;

      util.animationFrame(function() {
        ctx.$parent.$el.style.setProperty('cursor', 'auto');
      });
    };
  });

  var LinkingNodeState = util.extendClass(InitialNodeState, function (ctx) {
    //select node target
    this.mouseover = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      util.animationFrame(function() {
        ctx.$$.nodeRect.classList.add('node-linking-target', 'hover');
      });

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
    };

    //unselect node target
    this.mouseout = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      util.animationFrame(function() {
        ctx.$$.nodeRect.classList.remove('node-linking-target', 'hover');
      });

      ctx.fixed = false;
    };

    //set link target
    this.click = function () {
      var sourceCtx = mouse.data.source;

      if (sourceCtx.id != ctx.id) {
        Link.create(hypergraphID, { sourceId: sourceCtx.id, targetId: ctx.id, data: {} })
            .done(function(link) {
              graphComponent.nodes.forEach(function(n) {
                if (link.sourceId == n.id) link.source = n;
                if (link.targetId == n.id) link.target = n;
              });

              graphComponent.links.push(link);
            });
      }
      else {
        state.$layout.resume();
      }

      sourceCtx.$.ghostLink.$destroy(true);
      sourceCtx.$.ghostLink = null;

      util.animationFrame(function() {
        ctx.$$.nodeRect.classList.remove('node-linking-target', 'hover');
        ctx.$$.nodeRect.classList.remove('node-linking-source');
      });

      sourceCtx.fixed = false;

      state.nodeState = 'initial';
      mouse.data.source = null;
    };
  });

  function liangBarsky(edgeLeft, edgeRight, edgeBottom, edgeTop,
                       x0src, y0src, x1src, y1src) {
    var t0 = 0.0, t1 = 1.0;
    var xdelta = x1src-x0src;
    var ydelta = y1src-y0src;
    var p,q,r;

    for(var edge=0; edge<4; edge++) {   // Traverse through left, right, bottom, top edges.
      if (edge === 0) {
        p = -xdelta;
        q = -(edgeLeft - x0src);
      }
      else if (edge === 1) {
        p = xdelta;
        q =  (edgeRight - x0src);
      }
      else if (edge === 2) {
        p = -ydelta;
        q = -(edgeBottom - y0src);
      }
      else if (edge === 3) {
        p = ydelta;
        q = (edgeTop - y0src);
      }

      r = q/p;

      if (p === 0 && q < 0) {          // Don't draw line at all. (parallel line outside)
        return false;
      }

      if (p < 0) {
        if (r > t1) return false; // Don't draw line at all.
        else if (r > t0) t0=r;    // Line is clipped!
      }
      else if (p > 0) {
        if (r < t0) return false; // Don't draw line at all.
        else if (r<t1) t1=r;      // Line is clipped!
      }
    }

    return {
      x0Clip: x0src + (t0 * xdelta), // x0clip
      y0Clip: y0src + (t0 * ydelta), // y0clip
      x1Clip: x0src + (t1 * xdelta), // x1clip
      y1Clip: y0src + (t1 * ydelta)  // y1clip
    };
  }

  var NodeComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.node.rect').innerHTML,

    data: function () {
      return {
        mouseover: false,
        leftEdge: 0,
        rightEdge: 0,
        bottomEdge: 0,
        topEdge: 0,
        width: 0,
        height: 0,
        menu: false,
        nodeTranslate: 'translate(0, 0)',
        rectTranslate: 'translate(0, 0)',
        fixed: false, //d3.force doesn't pick it up if not explicitly linked
        data: {
          name: ''
        }
      };
    },

    computed: {

      nodeTranslate: function() {
        return 'translate(' + this.x + ',' + this.y + ')';
      },

      rectTranslate: function() {
        return 'translate(' + (-this.width/2) + ',' + (-(this.height + 10)/2) + ')';
      }

    },

    methods: {

      calculateRectBoundingEdges: function() {
        // we get the transform to nodesAndLinksGroup element
        // because, in calculating the bounding edges, we only
        // want the transforms applied to the node element itself
        // while disregarding the transforms to nodesAndLinksGroup
        var ttm = this.$$.nodeRect.getTransformToElement(this.$parent.$$.nodesAndLinksGroup);
        var bBox = this.$$.nodeRect.getBBox();
        var point = this.$parent.$el.createSVGPoint();
        var dimensions = this.$parent.$el.createSVGPoint();

        // adding margin allows us to add some space around the node
        // border. this allows us to shift the arrow marker on the link
        // forwards without being completely hidden behind the node OR
        // to far back that the line from the link isn't being completely
        // covered by the arrowhead marker
        var marginX = 8, marginY = 4;
        var shiftX = 4, shiftY = 2;

        point.x = bBox.x - shiftX;
        point.y = bBox.y - shiftY;

        point = point.matrixTransform(ttm);

        ttm.e = ttm.f = 0; // next we multiply bBox.width/height as vectors

        dimensions.x = this.width + marginX;
        dimensions.y = this.height + marginY;

        dimensions = dimensions.matrixTransform(ttm);

        this.leftEdge = point.x;
        this.rightEdge = point.x + dimensions.x;
        this.topEdge = point.y;
        this.bottomEdge = point.y + dimensions.y;
      },

      updateDimensionsOfNodeRect: function() {
        var bBox = this.$$.nodeName.getBBox();

        this.width = bBox.width + 24;
        this.height = bBox.height + 12;
      },

      nodeContextMenu: function(e) {
        if (e.target != this.$$.nodeRect) {
          return;
        }

        e.stopPropagation();
        e.preventDefault();

        nodeContextMenu.show(e.clientX, e.clientY, this);

        var closeContextMenu = function () {
          nodeContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

      setLinkSource: function () {
        var self = this;

        util.animationFrame(function() {
          self.$$.nodeRect.classList.add('node-linking-source');
        });

        this.menu = false;
        this.fixed = true;

        state.nodeState = 'linking';
        mouse.data.source = this;

        this.$.ghostLink = this.$parent
            .$addChild({ data: { linkSource: this } }, GhostLinkComponent)
            .$mount()
            .$appendTo(this.$parent.$$.dynamicContent);
      },

      delete: function() {
        var self = this;

        Node.delete(hypergraphID, this)
            .done(function() {
              graphComponent.links = graphComponent.links.filter(function(l) {
                return l.sourceId != self.id && l.targetId != self.id;
              });

              graphComponent.nodes.$remove(self.$index);
            });
      },

      getState: function () {
        return this.$states[ state.nodeState ];
      },

      mouseover: function () {
        return this.getState().mouseover.apply(state, arguments);
      },

      mouseout: function () {
        return this.getState().mouseout.apply(state, arguments);
      },

      click: function () {
        return this.getState().click.apply(state, arguments);
      },

      dblclick: function() {
        return this.getState().dblclick.apply(state, arguments);
      },

      drag: function () {
        return this.getState().drag.apply(state, arguments);
      },

      dragstart: function () {
        return this.getState().dragstart.apply(state, arguments);
      },

      dragend: function () {
        return this.getState().dragend.apply(state, arguments);
      }

    },

    events: {

      'hook:created': function () {
        this.$states = {
          initial: new InitialNodeState(this),
          linking: new LinkingNodeState(this),
          disabled: new DisabledNodeState(this)
        };

        this.$watch('data.name', this.updateDimensionsOfNodeRect.bind(this));

        this.$watch('x', this.calculateRectBoundingEdges.bind(this));
        this.$watch('y', this.calculateRectBoundingEdges.bind(this));
        this.$watch('width', this.calculateRectBoundingEdges.bind(this));
        this.$watch('height', this.calculateRectBoundingEdges.bind(this));
      },

      'hook:ready': function () {
        var $nodeRect = util(this.$$.nodeRect);

        $nodeRect.on('click', this.click.bind(this));
        $nodeRect.on('mouseover', this.mouseover.bind(this));
        $nodeRect.on('mouseout', this.mouseout.bind(this));
        $nodeRect.on('dragstart', this.dragstart.bind(this));
        $nodeRect.on('drag', this.drag.bind(this));
        $nodeRect.on('dragend', this.dragend.bind(this));

        this.updateDimensionsOfNodeRect();
        this.calculateRectBoundingEdges();
      },

      'hook:beforeDestroyed': function () {
        this.menu = false;
        this.fixed = false;
      }

    }

  });

  Vue.component('x-node', NodeComponent);

  var LinkComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.link').innerHTML,

    data: function() {
      return {
        sourceClipX: 0,
        sourceClipY: 0,
        targetClipX: 0,
        targetClipY: 0
      };
    },

    methods: {

      calculateLinkNodeIntersection: function() {
        //TODO: bug with translate transforms

        var source = this.source;
        var target = this.target;

        var targetClippings = liangBarsky(
            target.leftEdge,
            target.rightEdge,
            target.topEdge,
            target.bottomEdge,
            source.x,
            source.y,
            target.x,
            target.y
        );

        var self = this;
        var sourceId = this.sourceId;
        var targetId = this.targetId;

        // set the sourceClipX/Y values in the next animation frame
        // to make sure that all the target clippings have been calculated
        // in the previous animation frame. then we can use the
        // target clippings to adjust the source clippings for bidirectional links
        Vue.nextTick(function() {
          // if its a bidirectional links (ie <-->), then we have to calculate
          // the source clippings as well so we dont overlap the arrow marker of
          // the incoming link.
          if (linksMap[targetId] && linksMap[targetId][sourceId]) {
            var oppositeLink = linksMap[targetId][sourceId];

            self.sourceClipX = oppositeLink.targetClipX;
            self.sourceClipY = oppositeLink.targetClipY;
          }
          else {
            self.sourceClipX = source.x;
            self.sourceClipY = source.y;
          }
        });

        this.targetClipX = targetClippings.x0Clip;
        this.targetClipY = targetClippings.y0Clip;
      },

      delete: function() {
        var self = this;

        Link.delete(hypergraphID, this)
            .done(function() {
              graphComponent.links.$remove(self.$index);
            });
      },

      linkContextMenu: function(e) {
        if (e.target != this.$$.arrowMarkerLine) return;

        e.stopPropagation();
        e.preventDefault();

        linkContextMenu.show(e.clientX, e.clientY, this);

        var closeContextMenu = function () {
          linkContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

      freezePosition: function () {
        if (state.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        var source = this.source,
            target = this.target;

        source.px = source.x;
        source.py = source.y;
        source.fixed = true;

        target.px = target.x;
        target.py = target.y;
        target.fixed = true;

        util.animationFrame(function() {
          self.$el.querySelector('.link')
              .classList
              .add('hover');
        });
      },

      releasePosition: function () {
        if (state.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        this.source.fixed = false;
        this.target.fixed = false;

        util.animationFrame(function() {
          self.$el.querySelector('.link')
              .classList
              .remove('hover');
        });
      },

      dragstart: function (e) {
        if (state.nodeState != 'initial') {
          return;
        }

        e.stopPropagation();
        e.preventDefault(); //to stop browser from turning
                            // the cursor into type selection

        var self = this;

        var source = this.source,
            target = this.target;

        this.source_x = source.px = source.x;
        this.source_y = source.py = source.y;

        this.target_x = target.px = target.x;
        this.target_y = target.py = target.y;

        util.animationFrame(function() {
          self.$parent.$el.style.setProperty('cursor', 'move');
        });
      },

      drag: function (e) {
        if (state.nodeState != 'initial') {
          return;
        }

        var source = this.source,
            target = this.target;

        var v = util.transformVectorFromClientToEl(
            e.dx, e.dy, this.$el);

        source.px = source.x = this.source_x + v.x;
        source.py = source.y = this.source_y + v.y;

        target.px = target.x = this.target_x + v.x;
        target.py = target.y = this.target_y + v.y;

        this.state.$layout.resume();
      },

      dragend: function() {
        var self = this;

        util.animationFrame(function() {
          self.$el.querySelector('.link').classList.remove('hover');
          self.$parent.$el.style.removeProperty('cursor', 'auto');
        });
      }

    },

    events: {

      'hook:ready': function () {
        this.state = this.$parent.state;

        this.$watch('target.leftEdge', this.calculateLinkNodeIntersection.bind(this));
        this.$watch('target.topEdge', this.calculateLinkNodeIntersection.bind(this));
        this.$watch('target.x', this.calculateLinkNodeIntersection.bind(this));
        this.$watch('target.y', this.calculateLinkNodeIntersection.bind(this));
        this.$watch('source.x', this.calculateLinkNodeIntersection.bind(this));
        this.$watch('source.y', this.calculateLinkNodeIntersection.bind(this));

        this.calculateLinkNodeIntersection();

        var $g = util(this.$el);
        $g.on('mouseover', this.freezePosition.bind(this));
        $g.on('mouseout', this.releasePosition.bind(this));
        $g.on('dragstart', this.dragstart.bind(this));
        $g.on('drag', this.drag.bind(this));
        $g.on('dragend', this.dragend.bind(this));
      }

    }

  });

  Vue.component('x-link', LinkComponent);

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

  var GhostLinkComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.ghostLink').innerHTML,

    data: function () {
      return {
        distanceFromMouse: 13,
        source: { x: 0, y: 0 },
        target: { x: 0, y: 0 }
      };
    },

    methods: {

      mousemove: function(e) {
        var ctm = this.$parent.$$.nodesAndLinksGroup.getScreenCTM();
        var p = this.$parent.$el.createSVGPoint();

        p.x = e.clientX;
        p.y = e.clientY;

        p = p.matrixTransform(ctm.inverse());

        var dx = p.x  - this.source.x,
            dy = p.y - this.source.y;

        var theta = Math.atan(dy / dx);

        var sX = this.distanceFromMouse * Math.cos(theta);
        var sY = this.distanceFromMouse * Math.sin(theta);

        if (dx >= 0) { // from π/2 to -π/2 inclusively
          p.x -= sX;
          p.y -= sY;
        }
        else { // from π/2 to 3π/2
          p.x = p.x + sX;
          p.y = p.y + sY;
        }

        this.target = p;
      }

    },

    events: {

      'hook:created': function () {
        this.source = this.linkSource;

        this.mousemove({ clientX: mouse.x, clientY: mouse.y });

        this._mousemove = this.mousemove.bind(this);
        util.on('mousemove', this._mousemove);
      },

      'hook:beforeDestroy': function () {
        util.off('mousemove', this._mousemove);
      }

    }

  });

  var NodePanel = Vue.extend({

    replace: true,

    template: '#node.panel',

    data: function() {
      return {
        isNew: false,
        hasChanges: false,
        editingName: false,
        nameCache: '',
        propertiesCache: []
      };
    },

    computed: {

      propertyGroups: function() {
        return _.groupBy(this.node.data.properties, function(prop) {
          return prop.type;
        });
      }

    },

    methods: {

      closeNodePanel: function() {
        floatingPanelBar.removePanel();
      },

      validateInputChange: function() {
        var self = this;

        util.animationFrame(function() {
          var $addDropdownBtnEl = self.$$.addDropdownBtn;
          var propertyValue = self.$$.propertyValue.value;

          if (!propertyValue) {
            $addDropdownBtnEl.classList.add('disabled');
          }
          else {
            $addDropdownBtnEl.classList.remove('disabled');
          }
        });
      },

      addProp: function(propertyType) {
        var $propertyInputGroupEl = this.$$.propertyInputGroup;
        var $propertyValueEl = this.$$.propertyValue;

        var validPropertyType = false;

        switch(propertyType) {
          case 'email':
            validPropertyType = util.validateEmail($propertyValueEl.value);
            break;
          case 'phone':
            validPropertyType = util.validatePhoneNumber($propertyValueEl.value);
            break;
          case 'link':
            validPropertyType = util.validateLink($propertyValueEl.value);
            break;
          default:
            validPropertyType = true; //case text
        }

        if (validPropertyType) {
          this.node.data.properties.push({
            value: $propertyValueEl.value,
            type: propertyType
          });

          this.validateInputChange();
          this.hasChanges = true;

          util.animationFrame(function() {
            $propertyValueEl.value = '';
            $propertyInputGroupEl.classList.remove('has-error');
          });
        }
        else {
          util.animationFrame(function() {
            $propertyInputGroupEl.classList.add('has-error');
          });
        }

      },

      removeProp: function(propVm) {
        var propIndex = _.indexOf(this.node.data.properties, propVm.prop);

        if (propIndex < 0) {
          throw "Trying to remove property that apparently doesn't exist.";
        }

        this.node.data.properties.$remove(0);
        this.hasChanges = true;
      },

      createNode: function() {
        var self = this;

        Node.create(hypergraphID, this.node)
            .done(function(node) {
              self.hasChanges = false;
              self.isNew = false;
              graphComponent.nodes.push(node);
              self.$emit('removeGhostNode');
            });
      },

      saveNode: function() {
        var self = this;

        Node.update(hypergraphID, [ this.node ])
            .done(function(node) {
              self.hasChanges = false;
              //TODO: replace node in nodesAry??
            });
      },

      editName: function() {
        this.editingName = true;
        this.nameCache = this.node.data.name;

        var $nameInput = this.$$.nameInput;

        util.animationFrame(function() {
          $nameInput.focus();
          $nameInput.setSelectionRange(0, $nameInput.value.length);
        });
      },

      updateName: function() {
        if (!this.editingName) { //blur is called redundantly after 'enter' and 'esc' action
          return;
        }

        if (!this.node.data.name) {
          this.node.data.name = this.nameCache;
        }
        else if (this.node.data.name !== this.nameCache) {
          this.hasChanges = true;
        }

        this.editingName = false;
      },

      cancelNameUpdate: function() {
        this.editingName = false;
        this.node.data.name = this.nameCache;
      }

    },

    events: {

      'hook:ready': function() {
        var self = this;
        var node = this.node;

        this.nameCache = this.node.data.name;
        this.propertiesCache = this.node.data.properties.slice(0);

        if (!node.data) {
          this.$add('node.data', { properties: [] });
        }

        if (!node.data.properties) {
          this.$add('node.data.properties', []);
        }

        if (this.isNew) {
          this.editName();
        }

        Mousetrap.bind('esc', function() {
          self.closeNodePanel();
        });
      },

      'hook:beforeDestroy': function() {
        if (!this.isNew && this.hasChanges) {
          this.node.data.name = this.nameCache;
          this.node.data.properties = this.propertiesCache;
        }

        if (this.isNew) {
          this.$emit('removeGhostNode');
        }

        Mousetrap.unbind('esc');
      }

    }

  });

  ///
  /// MAIN APP CODE
  ///

  var graphContextMenu = new ContextMenu({

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

        var nodePanel = new NodePanel({
          data: {
            isNew: true,
            node: nodeData
          }
        });

        nodePanel.$once('removeGhostNode', function() {
          nodeComponent.$destroy(true);
        });

        floatingPanelBar.setPanel(nodePanel);
      },

      saveGraph: function() {
        Node.update(hypergraphID, self.nodes);
      }

    }

  });

  var nodeContextMenu = new ContextMenu({

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

  var linkContextMenu = new ContextMenu({

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

  var graphComponent = new GraphComponent({

    data: {
      state: state
    }

  });

  var zoomBar = new ZoomBarComponent({

    graphComponent: graphComponent

  });

  var navbarComponent = new NavbarComponent({

    data: {
      hypergraphID: hypergraphID,
      state: state
    }

  });

  var floatingPanelBar = new FloatingPanelBar();

  graphContextMenu.$mount('#graphContextMenu');
  nodeContextMenu.$mount('#nodeContextMenu');
  linkContextMenu.$mount('#linkContextMenu');
  graphComponent.$mount('#graph');
  zoomBar.$mount('#zoomBar');
  navbarComponent.$mount('#navbar');
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