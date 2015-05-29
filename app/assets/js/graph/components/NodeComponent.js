define([
    'vue',
    'd3',
    'shared/daos/EdgeDAO',
    'shared/daos/NodeDAO',
    'shared/util',
    'graph/components/NodePanelComponent',
    'graph/components/NewEdgeComponent'
], function(
    Vue,
    d3,
    EdgeDAO,
    NodeDAO,
    util,
    NodePanelComponent,
    NewEdgeComponent
) {
  'use strict';

  var mouse = util.mouse;

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

      var nodePanel = new NodePanelComponent({

        hypergraphID: ctx.$parent.$options.hypergraphID,

        graphComponent: ctx.$parent,

        data: {
          isNew: false,
          node: ctx.$data
        },

        methods: {

          // TODO: should abstract this method out into FloatingPanelBar
          closeNodePanel: function() {
            ctx.$parent.$options.floatingPanelBar.removePanel();
          }

        }

      });

      ctx.$parent.$options.floatingPanelBar.setPanel(nodePanel);
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

      ctx.$parent.$options.state.$layout.resume();
    };

    this.dragend = function () {
      util.animationFrame(function() {
        ctx.$parent.$el.style.setProperty('cursor', 'auto');
      });
    };
  });

  var LinkingNodeState = util.extendClass(InitialNodeState, function (ctx) {
    var state = ctx.$parent.$options.state;

    //select node target
    this.mouseover = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      mouse.data.source.$.newEdge.setTargetNode(ctx);

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;

      Vue.nextTick(function() {
        ctx.$el.classList.add('new-edge-node');
      });
    };

    //unselect node target
    this.mouseout = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      mouse.data.source.$.newEdge.removeTargetNode();
      // fixes issue #2. re-calculateRectBoundingEdges after
      // mouseout incase mouseout occurred while we were still
      // animating the effect from the preceding mouseover event
      ctx.calculateRectBoundingEdges();

      ctx.fixed = false;

      Vue.nextTick(function() {
        ctx.$el.classList.remove('new-edge-node');
      });
    };

    //set link target
    this.click = function () {
      var sourceCtx = mouse.data.source;

      if (sourceCtx.id != ctx.id) {
        var graphComponent = ctx.$parent;

        EdgeDAO.create(ctx.$parent.$options.hypergraphID, {
              sourceId: sourceCtx.id,
              targetId: ctx.id,
              data: {}
            })
            .done(function(link) {
              graphComponent.nodes.forEach(function(n) {
                if (link.sourceId == n.id) link.source = n;
                if (link.targetId == n.id) link.target = n;
              });

              graphComponent.edges.push(link);
            });
      }
      else {
        ctx.$parent.$options.state.$layout.resume();
      }

      sourceCtx.$.newEdge.$destroy(true);
      sourceCtx.$.newEdge = null;

      util.animationFrame(function() {
        ctx.$el.classList.remove('new-edge-node');
        sourceCtx.$el.classList.remove('new-edge-node');
      });

      sourceCtx.fixed = false;

      ctx.$parent.$options.state.nodeState = 'initial';
      mouse.data.source = null;
    };
  });

  var NodeComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.node.rect').innerHTML,

    data: function () {
      return {
        leftEdge: 0,
        rightEdge: 0,
        bottomEdge: 0,
        topEdge: 0,
        width: 0,
        height: 0,
        isNodeContextMenuOpen: false,
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
        var bBox = this.$$.nodeRect.getBBox();
        var point = this.$parent.$el.createSVGPoint();
        var dimensions = this.$parent.$el.createSVGPoint();

        // we get the transform to nodesAndLinksGroup element
        // because, in calculating the bounding edges, we only
        // want the transforms applied to the node element itself
        // while disregarding the transforms to nodesAndLinksGroup
        var transformPointToElementMat = this.$$.nodeRect.getTransformToElement(this.$parent.$$.nodesAndLinksGroup);
        var transformVectorToElementMat = this.$$.nodeRect.getTransformToElement(this.$parent.$$.nodesAndLinksGroup);
        transformVectorToElementMat.e = transformVectorToElementMat.f = 0;

        // adding margin allows us to add some space around the node
        // border. this allows us to shift the arrow marker on the link
        // forwards without being completely hidden behind the node OR
        // to far back that the line from the link isn't being completely
        // covered by the arrowhead marker
        var marginX = 8, marginY = 4;

        var self = this;

        var updateEdgesT = function(elapsed, animationDuration, easeT, marginBufferT) {
          var t = elapsed / animationDuration;
          var marginBuffer = marginBufferT(easeT(t));

          var marginTX = marginX + marginBuffer;
          var marginTY = marginY + marginBuffer;

          var shiftX = marginTX/2, shiftY = marginTY/2;

          point.x = bBox.x - shiftX;
          point.y = bBox.y - shiftY;

          point = point.matrixTransform(transformPointToElementMat);

          dimensions.x = bBox.width + marginTX; // self.width == bBox.width
          dimensions.y = bBox.height + marginTY; // self.height == bBox.height

          dimensions = dimensions.matrixTransform(transformVectorToElementMat);

          self.leftEdge = point.x;
          self.rightEdge = point.x + dimensions.x;
          self.topEdge = point.y;
          self.bottomEdge = point.y + dimensions.y;

          return t >= 1 || !self.fixed; // cancel timer - only way of doing so
        };

        var marginBufferT, easeT;
        if (this.$parent.$options.state.nodeState == 'linking' && this.fixed) {
          marginBufferT = d3.interpolateRound(0, 8);
          easeT = d3.ease('quad');

          d3.timer(function(elapsed) {
            return updateEdgesT(elapsed, 140, easeT, marginBufferT);
          });

          // immediately calculate edges first time around
          updateEdgesT(0, 140, easeT, marginBufferT);
        }
        else {
          marginBufferT = d3.interpolateRound(0, 0);
          easeT = d3.ease('quad');

          updateEdgesT(1, 1, easeT, marginBufferT);
        }
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

        var nodeContextMenu = this.$parent.$options.nodeContextMenu;
        nodeContextMenu.show(e.clientX, e.clientY, this);

        this.isNodeContextMenuOpen = true;

        var self = this;

        var closeContextMenu = function () {
          self.isNodeContextMenuOpen = false;
          nodeContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

      setLinkSource: function () {
        var self = this;

        Vue.nextTick(function() {
          self.$el.classList.add('new-edge-node');
        });

        this.fixed = true;

        this.$parent.$options.state.nodeState = 'linking';
        mouse.data.source = this;

        this.$.newEdge = this.$parent
            .$addChild({ linkSource: this }, NewEdgeComponent)
            .$mount()
            .$appendTo(this.$parent.$$.dynamicContent);
      },

      delete: function() {
        var self = this;

        var hypergraphID = this.$parent.$options.hypergraphID;
        var graphComponent = this.$parent;

        NodeDAO.delete(hypergraphID, this)
            .done(function() {
              graphComponent.edges = graphComponent.edges.filter(function(l) {
                return l.sourceId != self.id && l.targetId != self.id;
              });

              graphComponent.nodes.$remove(self.$index);
            });
      },

      getStateEventHandlers: function () {
        return this.$states[ this.$parent.$options.state.nodeState ];
      },

      mouseover: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.mouseover.apply(stateEventHandlers, arguments);
      },

      mouseout: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.mouseout.apply(stateEventHandlers, arguments);
      },

      click: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.click.apply(stateEventHandlers, arguments);
      },

      dblclick: function() {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.dblclick.apply(stateEventHandlers, arguments);
      },

      drag: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.drag.apply(stateEventHandlers, arguments);
      },

      dragstart: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.dragstart.apply(stateEventHandlers, arguments);
      },

      dragend: function () {
        var stateEventHandlers = this.getStateEventHandlers();
        return stateEventHandlers.dragend.apply(stateEventHandlers, arguments);
      }

    },

    created: function () {
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
      // hovering over node causes a "highlight border" to appear,
      // effectively increasing the size of the node, so we have to
      // recalculate the bounding edges
      this.$watch('fixed', this.calculateRectBoundingEdges.bind(this));
    },

    ready: function () {
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

    beforeDestroyed: function () {
      this.fixed = false;
    }

  });

  return NodeComponent;
});