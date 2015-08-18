define([
    'vue',
    'shared/util',
    'shared/daos/EdgeDAO'
], function(Vue, util, EdgeDAO) {
  'use strict';

  var mouse = util.mouse;

  function liangBarsky(edgeLeft, edgeRight, edgeBottom, edgeTop,
                       x0src, y0src, x1src, y1src) {
    var t0 = 0.0, t1 = 1.0;
    var xDelta = x1src-x0src;
    var yDelta = y1src-y0src;
    var p,q,r;

    for(var edge=0; edge<4; edge++) {   // Traverse through left, right, bottom, top edges.
      if (edge === 0) {
        p = -xDelta;
        q = -(edgeLeft - x0src);
      }
      else if (edge === 1) {
        p = xDelta;
        q =  (edgeRight - x0src);
      }
      else if (edge === 2) {
        p = -yDelta;
        q = -(edgeBottom - y0src);
      }
      else if (edge === 3) {
        p = yDelta;
        q = (edgeTop - y0src);
      }

      r = q/p;

      if (p === 0 && q < 0) {     // Don't draw line at all. (parallel line outside)
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
      x0Clip: x0src + (t0 * xDelta), // x0clip
      y0Clip: y0src + (t0 * yDelta), // y0clip
      x1Clip: x0src + (t1 * xDelta), // x1clip
      y1Clip: y0src + (t1 * yDelta)  // y1clip
    };
  }

  var EdgeComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.edge').innerHTML,

    props: {
      isForceLayoutRunning: {
        required: true
      },
      isZooming: {
        required: true
      },
      nodeState: {
        required: true
      }
    },

    data: function() {
      return {
        sourceClipX: 0,
        sourceClipY: 0,
        targetClipX: 0,
        targetClipY: 0
      };
    },

    computed: {

      isViewOptimizedForSpeed: function() {
        return this.isForceLayoutRunning || this.isZooming;
      },

    },

    methods: {

      calculateEdgeNodeIntersection: function() {
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
        // target clippings to adjust the source clippings for bidirectional edges
        Vue.nextTick(function() {
          // if its a bidirectional edges (ie <-->), then we have to calculate
          // the source clippings as well so we dont overlap the arrow marker of
          // the incoming edge.
          var edgesMap = self.$parent.$options.edgesMap;

          if (edgesMap[targetId] && edgesMap[targetId][sourceId]) {
            var oppositeEdge = edgesMap[targetId][sourceId];

            self.sourceClipX = oppositeEdge.targetClipX;
            self.sourceClipY = oppositeEdge.targetClipY;
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

        var graphComponent = this.$parent;

        EdgeDAO.delete(this.$parent.$options.hypergraphID, this)
            .done(function() {
              graphComponent.edges.$remove(self.$index);
            });
      },

      edgeContextMenu: function(e) {
        if (e.target != this.$$.arrowMarkerLine) return;

        e.preventDefault();

        var edgeContextMenu = this.$parent.$options.edgeContextMenu;

        edgeContextMenu.show(e.clientX, e.clientY, this);
      },

      freezePosition: function () {
        if (this.nodeState !== 'initial' ||
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

        this.$parent.$options.nodeComponentsMap[source.id].bringToFront();
        this.$parent.$options.nodeComponentsMap[target.id].bringToFront();

        Vue.nextTick(function() {
          self.$el.querySelector('.edge')
              .classList
              .add('hover');
        });
      },

      releasePosition: function () {
        if (this.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        this.source.fixed = false;
        this.target.fixed = false;

        Vue.nextTick(function() {
          self.$el.querySelector('.edge')
              .classList
              .remove('hover');
        });
      },

      dragstart: function (e) {
        if (this.nodeState != 'initial') {
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

        Vue.nextTick(function() {
          self.$parent.$el.style.setProperty('cursor', 'move');
        });
      },

      drag: function (e) {
        if (this.nodeState != 'initial') {
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
      },

      dragend: function() {
        var self = this;

        this.$parent.$parent.dataState = 'UNSAVED';

        Vue.nextTick(function() {
          self.$el.querySelector('.edge').classList.remove('hover');
          self.$parent.$el.style.removeProperty('cursor', 'auto');
        });
      },

      enableWatchersForCalculatingEdgeNodeIntersection: function() {
        this.$unwatch.sourceLeftEdge  = this.$watch('source.leftEdge',  this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.sourceTopEdge   = this.$watch('source.topEdge',   this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.targetLeftEdge  = this.$watch('target.leftEdge',  this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.targetTopEdge   = this.$watch('target.topEdge',   this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.targetX         = this.$watch('target.x',         this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.targetY         = this.$watch('target.y',         this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.sourceX         = this.$watch('source.x',         this.calculateEdgeNodeIntersection.bind(this));
        this.$unwatch.sourceY         = this.$watch('source.y',         this.calculateEdgeNodeIntersection.bind(this));
      },

      disabledWatchersForCalculatingEdgeNodeIntersection: function() {
        this.$unwatch.sourceLeftEdge();
        this.$unwatch.sourceTopEdge();
        this.$unwatch.targetLeftEdge();
        this.$unwatch.targetTopEdge();
        this.$unwatch.targetX();
        this.$unwatch.targetY();
        this.$unwatch.sourceX();
        this.$unwatch.sourceY();
      }

    },

    watch: {
      isForceLayoutRunning: function(newValue, prevValue) {
        if (newValue && !prevValue) {
          this.disabledWatchersForCalculatingEdgeNodeIntersection();
        }
        else if (!newValue && prevValue) {
          this.enableWatchersForCalculatingEdgeNodeIntersection();
          this.calculateEdgeNodeIntersection();
        }
      }
    },

    ready: function () {
      this.$unwatch = {};

      if (!this.isForceLayoutRunning) {
        this.enableWatchersForCalculatingEdgeNodeIntersection();
        this.calculateEdgeNodeIntersection();
      }

      var $g = util(this.$el);
      $g.on('mouseover', this.freezePosition.bind(this));
      $g.on('mouseout', this.releasePosition.bind(this));
      $g.on('dragstart', this.dragstart.bind(this));
      $g.on('drag', this.drag.bind(this));
      $g.on('dragend', this.dragend.bind(this));
    }

  });

  return EdgeComponent;
});
