define([
    'vue',
    'shared/util'
], function(Vue, util) {
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

  var NewEdgeComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.newEdge').innerHTML,

    data: function () {
      return {
        distanceFromMouse: 13,
        sourceClipX: 0,
        sourceClipY: 0,
        targetClipX: 0,
        targetClipY: 0,
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

        this.targetClipX = p.x;
        this.targetClipY = p.y;
      },

      setTargetNode: function(targetNode) {
        this.$.target = targetNode;
        util.off('mousemove', this._mousemove);

        var source = this.$options.linkSource;
        var target = targetNode;

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
        var sourceId = this.$options.linkSource.id;
        var targetId = targetNode.id;

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

      removeTargetNode: function() {
        this.$.targetNode = null;
        util.on('mousemove', this._mousemove);

        this.mousemove({ clientX: mouse.x, clientY: mouse.y });

        // update sourceClip[X/Y] back to linkSource
        // position because it might have been altered
        // if, temporarily, a candidate targetNode would
        // have resulted in bidirectional edges between
        // the two nodes
        this.sourceClipX = this.$options.linkSource.x;
        this.sourceClipY = this.$options.linkSource.y;
      }

    },

    events: {

      'hook:created': function () {
        this.sourceClipX = this.$options.linkSource.x;
        this.sourceClipY = this.$options.linkSource.y;

        this.mousemove({ clientX: mouse.x, clientY: mouse.y });

        this._mousemove = this.mousemove.bind(this);
        util.on('mousemove', this._mousemove);
      },

      'hook:beforeDestroy': function () {
        util.off('mousemove', this._mousemove);
      }

    }

  });

  return NewEdgeComponent;
});
