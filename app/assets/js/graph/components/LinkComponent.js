define([
    'vue',
    'util',
    'models'
], function(
    Vue,
    util,
    models
) {
  'use strict';

  var mouse = util.mouse;
  var Link = models.Link;

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
          var linksMap = self.$parent.$options.linksMap;

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

        var graphComponent = this.$parent;

        Link.delete(this.$parent.$options.hypergraphID, this)
            .done(function() {
              graphComponent.links.$remove(self.$index);
            });
      },

      linkContextMenu: function(e) {
        if (e.target != this.$$.arrowMarkerLine) return;

        e.stopPropagation();
        e.preventDefault();

        var linkContextMenu = this.$parent.$options.linkContextMenu;

        linkContextMenu.show(e.clientX, e.clientY, this);

        var closeContextMenu = function () {
          linkContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

      freezePosition: function () {
        if (this.$parent.$options.state.nodeState !== 'initial' ||
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

        Vue.nextTick(function() {
          self.$el.querySelector('.link')
              .classList
              .add('hover');
        });
      },

      releasePosition: function () {
        if (this.$parent.$options.state.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        this.source.fixed = false;
        this.target.fixed = false;

        Vue.nextTick(function() {
          self.$el.querySelector('.link')
              .classList
              .remove('hover');
        });
      },

      dragstart: function (e) {
        if (this.$parent.$options.state.nodeState != 'initial') {
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
        if (this.$parent.$options.state.nodeState != 'initial') {
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

        this.$parent.$options.state.$layout.resume();
      },

      dragend: function() {
        var self = this;

        Vue.nextTick(function() {
          self.$el.querySelector('.link').classList.remove('hover');
          self.$parent.$el.style.removeProperty('cursor', 'auto');
        });
      }

    },

    ready: function () {
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

  });

  return LinkComponent;
});
