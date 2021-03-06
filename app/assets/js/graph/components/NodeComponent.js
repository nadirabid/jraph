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

  var InitialNodeState = Util.extendClass(StateEventHandlers, function (ctx) {
    this.click = function() {
      if (ctx.dragFlag) {
        ctx.dragFlag = false;
        return;
      }

      ctx.$parent.$parent.nodeInfoToDisplay = ctx.$data;
    };

    this.dblclick = function() {
      // most of the time, centering the node in the view
      // will result in shifting the view until the node is in the
      // center. in this case, we assume the mouse is no longer on the node.
      // the one exception is if the node is already in the center, the
      // mouse will obviously remain on the node

      if (ctx.centerViewTo(ctx.x, ctx.y)) {
        ctx.isMouseentered = false;
      }
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
    };

    this.dragend = function () {
      if (ctx.dragFlag) {
        ctx.updateNode();
      }

      Vue.nextTick(function() {
        ctx.$parent.$el.style.setProperty('cursor', 'auto');
      });
    };
  });

  var LinkingNodeState = Util.extendClass(StateEventHandlers, function (ctx) {

    //select node target
    this.mouseover = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      mouse.data.source.$.newEdge.setTargetNode(ctx);

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
      ctx.isNewEdgeNode = true;

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
      ctx.isNewEdgeNode = false;
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

        sourceCtx.removeNewEdgeState(ctx);
      }
      else {
        sourceCtx.removeNewEdgeState();
      }

      ctx.isMouseentered = true;
    };

    this.dragstart = function(e) {
      // to stop drag event from propagating to panning handler on svg
      e.stopPropagation();
    };
  });

  var NodeComponent = Vue.extend({

    template: document.getElementById('graph.node').innerHTML,

    props: {
      isViewOptimizedForSpeed: {
        required: true
      },
      nodeState: {
        required: true
      },
      dataSyncState: {
        required: true
      },
      centerViewTo: {
        required: true,
        type: Function
      }
    },

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
        isNew: false,
        isNodeReady: false,
        isNodeInfoDisplayed: false,
        isMouseentered: false,
        isNewEdgeNode: false,
        hasNodeHaloTransitionBeenExecuted: false,
        fixed: false, //d3.force doesn't pick it up if not explicitly linked
        dragFlag: false,
        clickCount: 0
      };
    },

    computed: {

      isNodeSelected: function() {
        return this.isNewEdgeNode || this.isNodeInfoDisplayed;
      },

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

          if (this.isNodeInfoDisplayed) {
            x += 4;
          }
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

          if (this.isNodeInfoDisplayed) {
            x += 4;
          }
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
        var marginX = 4, marginY = 4;

        var self = this;

        // updateEdgesT provides a manual way to create a transition effect
        // that cause the the arrows around the node to slowly recede to the new margins
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

          return t >= 1 || !self.isNodeSelected; // cancel timer - only way of doing so
        };

        if (this.isNodeSelected && !this.hasNodeHaloTransitionBeenExecuted) {
          var easeT = d3.ease('quad');
          var marginBufferT = d3.interpolateRound(2, 8);

          // immediately calculate edges for T = 0
          updateEdgesT(0, 140, easeT, marginBufferT);

          // then d3 calculates edges for the rest of T values
          d3.timer(function(elapsed) {
            return updateEdgesT(elapsed, 140, easeT, marginBufferT);
          });

          this.hasNodeHaloTransitionBeenExecuted = true;
        }
        else if (this.isNodeSelected) {
          updateEdgesT(1, 1, d3.ease('quad'), d3.interpolateRound(0, 8));
        }
        else {
          updateEdgesT(1, 1, d3.ease('quad'), d3.interpolateRound(0, 0));
          this.hasNodeHaloTransitionBeenExecuted = false;
        }
      },

      updateDimensionsOfNodeRect: function() {
        var bBox = this.$$.nodeName.getBBox();

        var minWidth = Math.max(bBox.width, 50);
        var minHeight = Math.max(bBox.height, 18);

        this.width = minWidth + 36;
        this.height = minHeight + 12;
      },

      suppressContextMenu: function(e) {
        e.preventDefault();
      },

      setNewEdgeSource: function () {
        this.isNewEdgeNode = true;
        this.fixed = true;

        this.nodeState = 'linking';
        mouse.data.source = this;
        this.isMouseentered = false;

        this.$.newEdge = this.$parent
            .$addChild({ source: this }, NewEdgeComponent)
            .$mount()
            .$appendTo(this.$parent.$$.newEdgeContainer);

        var self = this;
        Util.addEventListenerOnce(window, 'click', function(e) {
          if($(e.target).closest('.node').length === 0) {
            self.removeNewEdgeState();
          }
        }, true);
      },

      removeNewEdgeState: function(targetNodeComponent) {
        this.$.newEdge.$destroy(true);
        this.$.newEdge = null;

        this.isNewEdgeNode = false;

        this.nodeState = 'initial';
        mouse.data.source = null;

        if (targetNodeComponent) {
          targetNodeComponent.isNewEdgeNode = false;
          targetNodeComponent.fixed = false;
        }
      },

      enableWatchersForCalculateRectBoundingEdges: function() {
        this.$unwatch.x =                   this.$watch('x',                    this.calculateRectBoundingEdges.bind(this));
        this.$unwatch.y =                   this.$watch('y',                    this.calculateRectBoundingEdges.bind(this));
        this.$unwatch.width =               this.$watch('width',                this.calculateRectBoundingEdges.bind(this));
        this.$unwatch.height =              this.$watch('height',               this.calculateRectBoundingEdges.bind(this));
        this.$unwatch.isNewEdgeNode =       this.$watch('isNewEdgeNode',        this.calculateRectBoundingEdges.bind(this));
        this.$unwatch.isNodeInfoDisplayed = this.$watch('isNodeInfoDisplayed',  this.calculateRectBoundingEdges.bind(this));
      },

      disableWatchersForCalculateRectBoundingEdges: function() {
        this.$unwatch.x();
        this.$unwatch.y();
        this.$unwatch.width();
        this.$unwatch.height();
        this.$unwatch.isNewEdgeNode();
        this.$unwatch.isNodeInfoDisplayed();
      },

      updateNode: function() {
        if (this.isNew) {
          return;
        }

        var self = this;

        NodeDAO.update(this.id, [ this.$data ])
            .done(function(nodes) {
              var node = nodes[0];

              self.dataSyncState = 'SAVED';
              _.merge(self.$data, node);
            });

        this.dataSyncState = 'SAVING';
      },

      deleteNode: function() {
        var self = this;

        var hypergraphID = this.$parent.$options.hypergraphID;
        var graphComponent = this.$parent;

        NodeDAO.delete(hypergraphID, this)
            .done(function() {
              self.markedForDeletion = true;

              graphComponent.edges = graphComponent.edges.filter(function(l) {
                return l.sourceId != self.id && l.targetId != self.id;
              });
            });
      },

      mouseover: function () {
        if (this.isNew) {
          return;
        }

        var stateEventHandlers = this.$states[ this.nodeState ];
        return stateEventHandlers.mouseover.apply(stateEventHandlers, arguments);
      },

      mouseout: function () {
        if (this.isNew) {
          return;
        }

        var stateEventHandlers = this.$states[ this.nodeState ];
        return stateEventHandlers.mouseout.apply(stateEventHandlers, arguments);
      },

      click: function () {
        if (this.isNew) {
          return;
        }

        var stateEventHandlers = this.$states[ this.nodeState ];
        var args = arguments;

        if (!this.clickCount) {
          this.clickCount = 1;
          var self = this;
          this.$deferClickID = Util.deferFor(200, function () {
            stateEventHandlers.click.apply(stateEventHandlers, args);
            self.clickCount = 0;
          });
        }
        else  {
          Util.clearDeferFor(this.$deferClickID);
          this.clickCount = 0;
          stateEventHandlers.dblclick.apply(stateEventHandlers, args);
        }
      },

      drag: function () {
        var stateEventHandlers = this.$states[ this.nodeState ];
        return stateEventHandlers.drag.apply(stateEventHandlers, arguments);
      },

      dragstart: function () {
        var stateEventHandlers = this.$states[ this.nodeState ];
        return stateEventHandlers.dragstart.apply(stateEventHandlers, arguments);
      },

      dragend: function () {
        var stateEventHandlers = this.$states[ this.nodeState ];
        return stateEventHandlers.dragend.apply(stateEventHandlers, arguments);
      }

    },

    watch: {
      isViewOptimizedForSpeed: function(isViewOptimizedForSpeed) {
        if (isViewOptimizedForSpeed) {
          this.disableWatchersForCalculateRectBoundingEdges();
        }
        else {
          this.enableWatchersForCalculateRectBoundingEdges();
          this.calculateRectBoundingEdges();
        }
      },
      markedForDeletion: function(markedForDeletion) {
        if(markedForDeletion) {
          this.$parent.nodes.$remove(this.$index);
        }
      }
    },

    created: function () {
      this.$parent.$options.nodeComponentsMap[this.id] = this;

      this.$unwatch = {};
      this.enableWatchersForCalculateRectBoundingEdges();

      this.$states = {
        initial: new InitialNodeState(this),
        linking: new LinkingNodeState(this)
      };

      this.$watch('data.name', this.updateDimensionsOfNodeRect.bind(this));
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