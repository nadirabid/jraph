define([
    'vue',
    'util'
], function(
    Vue,
    util
) {
  'use strict';

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

  return GhostLinkComponent;
});
