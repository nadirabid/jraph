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
    Util,
    NodePanelComponent,
    NewEdgeComponent
) {
  'use strict';

  var mouse = Util.mouse;

  function StateEventHandlers() {
    this.click = Util.noop;
    this.dblclick = Util.noop;
    this.mouseover = Util.noop;
    this.mouseout = Util.noop;
    this.drag = Util.noop;
    this.dragstart = Util.noop;
    this.dragend = Util.noop;
  }

  /// GRAPH VIEW COMPONENTS

  var DisabledNodeState = Util.extendClass(StateEventHandlers);

  var InitialNodeState = Util.extendClass(StateEventHandlers, function (ctx) {
    this.click = function() {
      if (ctx.dragFlag) {
        ctx.dragFlag = false;
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
      if (mouse.dragState.state !== Util.DRAG_STATES.NONE) {
        return;
      }

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
      ctx.isMouseentered = true;

      ctx.bringToFront();
    };

    this.mouseout = function () {
      if (mouse.dragState.state !== Util.DRAG_STATES.NONE) {
        return;
      }

      ctx.fixed = false;
      ctx.isMouseentered = false;
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

      Vue.nextTick(function() {
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

      ctx.dragFlag = true;

      ctx.$parent.$options.state.$layout.resume();
    };

    this.dragend = function () {
      Vue.nextTick(function() {
        ctx.$parent.$el.style.setProperty('cursor', 'auto');
      });
    };
  });

  var LinkingNodeState = Util.extendClass(InitialNodeState, function (ctx) {

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

      ctx.bringToFront();
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

      Vue.nextTick(function() {
        ctx.$el.classList.remove('new-edge-node');
        sourceCtx.$el.classList.remove('new-edge-node');
      });

      ctx.isMouseentered = true;
      sourceCtx.fixed = false;

      ctx.$parent.$options.state.nodeState = 'initial';
      mouse.data.source = null;
    };
  });

  var NodeComponent = Vue.extend({

    template: document.getElementById('graph.node.rect').innerHTML,

    data: function () {
      return {
        x:0,
        y:0,
        leftEdge: 0,
        rightEdge: 0,
        bottomEdge: 0,
        topEdge: 0,
        width: 0,
        height: 0,
        pillButtonWidth: 21,
        isNodeReady: false,
        fixed: false, //d3.force doesn't pick it up if not explicitly linked
        dragFlag: false,
        isMouseentered: false,
        data: {
          name: ''
        }
      };
    },

    computed: {

      backgroundWidth: function() {
        return this.width + this.pillButtonWidth*2 + 1 + 4;
      },

      backgroundTranslate: function() {
        var x = -(this.width/2);
        var y = (-(this.height + 10)/2);
        return 'translate(' + x + ',' + y + ')';
      },

      linkNodePillButtonTranslate: function() {
        var x = (this.width/2) - 21;

        if (this.isMouseentered && !this.dragFlag) {
          x += this.pillButtonWidth + 4;
        }

        var y = (-(this.height + 10)/2);
        return 'translate(' + x + 'px,' + y + 'px)';
      },

      linkNodePillButtonTextTranslate: function() {
        var x = 10.5;
        var y = ((this.height + 10)/2);
        return 'translate(' + x + ',' + y + ')';
      },

      deleteNodePillButtonTranslate: function() {
        var x = (this.width/2) - 21;

        if (this.isMouseentered && !this.dragFlag) {
          x += this.pillButtonWidth*2 + 1 + 4;
        }

        var y = (-(this.height + 10)/2);
        return 'translate(' + x + 'px,' + y + 'px)';
      },

      deleteNodePillButtonTextTranslate: function() {
        var x = 10.5;
        var y = ((this.height + 10)/2);
        return 'translate(' + x + ',' + y + ')';
      },

      nodeTranslate: function() {
        return 'translate(' + this.x + ',' + this.y + ')';
      },

      rectTranslate: function() {
        return 'translate(' + (-this.width/2) + ',' + (-(this.height + 10)/2) + ')';
      }

    },

    methods: {

      bringToFront: function() {
        var nodes = this.$parent.nodes;
        if (this.$index < ( nodes.length - 1 )) {
          nodes.push(nodes.splice(this.$index,1)[0]);
        }
      },

      calculateRectBoundingEdges: function() {
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

          point.x = -shiftX;
          point.y = -shiftY;

          point = point.matrixTransform(transformPointToElementMat);

          dimensions.x = self.width + marginTX; // self.width == bBox.width
          dimensions.y = self.height + marginTY; // self.height == bBox.height

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

        var minWidth = Math.max(bBox.width, 50);
        var minHeight = Math.max(bBox.height, 18);

        this.width = minWidth + 24;
        this.height = minHeight + 12;
      },

      suppressContextMenu: function(e) {
        e.stopPropagation();
        e.preventDefault();
      },

      setNewEdgeSource: function () {
        var self = this;

        Vue.nextTick(function() {
          self.$el.classList.add('new-edge-node');
        });

        this.fixed = true;

        this.$parent.$options.state.nodeState = 'linking';
        mouse.data.source = this;
        this.isMouseentered = false;

        this.$.newEdge = this.$parent
            .$addChild({ source: this }, NewEdgeComponent)
            .$mount()
            .$appendTo(this.$parent.$$.newEdgeContainer);
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
      this.$parent.$options.nodeComponentsMap[this.id] = this;

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
      var $nodeRect = new Util(this.$$.nodeRect);

      $nodeRect.on('click', this.click.bind(this));
      $nodeRect.on('dragstart', this.dragstart.bind(this));
      $nodeRect.on('drag', this.drag.bind(this));
      $nodeRect.on('dragend', this.dragend.bind(this));

      this.updateDimensionsOfNodeRect();
      this.calculateRectBoundingEdges();

      var self = this;
      Vue.nextTick(function() {
        self.isNodeReady = true;
      });
    },

    beforeDestroyed: function () {
      this.$parent.nodeComponentsMap[this.id] = null;
      this.fixed = false;
    }

  });

  return NodeComponent;
});