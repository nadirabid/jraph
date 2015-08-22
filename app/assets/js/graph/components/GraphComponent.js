define([
    'vue',
    'jquery',
    'shared/util'
], function(Vue, $, Util) {
  'use strict';

  return Vue.extend({

    template: document.getElementById('graph').innerHTML,

    props: {
      nodes: {
        required: true
      },
      edges: {
        required: true
      },
      forceLayoutSettings: {
        required: true
      },
      saveAllGraphData: {
        required: true,
        type: Function
      },
      showGraphContextMenu: {
        required: true,
        type: Function,
      },
      nodeState: {
        required: true
      }
    },

    data: function () {
      return {
        isZooming: false,
        isPanning: false,
        nodes: [],
        edges: [],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        offset: {
          left: 0,
          top: 0
        }
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
        this.zoomUpdate(e, -(e.deltaY / 360), true);
      },

      zoomUpdate: function(e, zoomDelta, optimizeForSpeed) {
        var zoomFactor = Math.pow(1 + Math.abs(zoomDelta)/2 , zoomDelta > 0 ? 1 : -1);
        //var zoomFactor = Math.pow(1 + this.zoomSensitivity, zoomDelta);
        this.scaleZoom(e, zoomFactor, optimizeForSpeed);
      },

      scaleZoom: function(e, zoomFactor, optimizeForSpeed) {
        var nodesAndLinksGroupEl = this.$$.nodesAndLinksGroup;

        var ctm = nodesAndLinksGroupEl.getCTM();

        var p = this.$el.createSVGPoint();
        p.x = e.clientX - this.offset.left;
        p.y = e.clientY - this.offset.top;
        p = p.matrixTransform(ctm.inverse());

        var k = ctm
            .translate(p.x, p.y)
            .scale(zoomFactor)
            .translate(-p.x, -p.y);

        Vue.nextTick(function() {
          Util.setCTM(nodesAndLinksGroupEl, k);
        });

        if (!optimizeForSpeed) {
          return;
        }

        // set isZooming to true and automatically reset it to false
        // after 100ms of idle zoom ... the isZooming flag is used
        // to speed up rendering

        if (this.$setIsZoomingToFalseTimeout) {
          clearTimeout(this.$setIsZoomingToFalseTimeout);
        }

        this.isZooming = true;

        var self = this;
        this.$setIsZoomingToFalseTimeout = setTimeout(function() {
          self.isZooming = false;
        }, 100);
      },

      resize: function () {
        var newWidth = this.$$el.width(),
            newHeight = this.$$el.height();

        this.offset = this.$$el.offset();

        this.width = newWidth;
        this.height = newHeight;
      },

      panStart: function () {
        var self = this;

        this._ctm = this.$$.nodesAndLinksGroup.getCTM();

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        var ctm = this._ctm;

        // we don't need to muck with transform the current mouse location
        // because all we need is the change in x and the change in y
        var v = Util.transformVectorFromClientToEl(e.dx, e.dy, this.$$.nodesAndLinksGroup);

        var self = this;

        Vue.nextTick(function() {
          Util.setCTM(self.$$.nodesAndLinksGroup, ctm.translate(v.x, v.y));
        });

        if (this.$setIsPanningToFalseTimeout) {
          clearTimeout(this.$setIsPanningToFalseTimeout);
        }

        this.isPanning = true;

        this.$setIsPanningToFalseTimeout = setTimeout(function() {
          self.isPanning = false;
        }, 100);
      },

      panEnd: function() {
        var self = this;
        this._ctm = null;

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'auto');
        });

        this.isPanning = false;
      },

      resetView: function() {
        var self = this;
        var defaultCTM = this.$el.createSVGMatrix();

        Vue.nextTick(function() {
          Util.setCTM(self.$$.nodesAndLinksGroup, defaultCTM);
        });
      },

      centerViewTo: function(x, y) {
        var ctm = this.$$.nodesAndLinksGroup.getCTM();
        var p =  this.$el.createSVGPoint();

        p.x = this.width/2;
        p.y = this.height/2;

        p = p.matrixTransform(ctm.inverse());

        var dx = p.x - x;
        var dy = p.y - y;

        var self = this;

        var translateX = d3.interpolateRound(0, dx);
        var translateY = d3.interpolateRound(0, dy);
        var easeT = d3.ease('quad');

        d3.timer(function(t) {
          var easedT = easeT(t/140);
          var dxT = translateX(easedT);
          var dyT = translateY(easedT);

          Vue.nextTick(function() {
            Util.setCTM(self.$$.nodesAndLinksGroup, ctm.translate(dxT, dyT));

            if (easedT >= 1) {
              setTimeout(function() { self.isPanning = easedT < 1; }, 60);
            }
          });

          return easedT >= 1;
        });

        this.isPanning = true;
      },

      contextMenu: function (e) {
        if (e.target != this.$$.backdrop) return;

        e.preventDefault();

        this.showGraphContextMenu(e.clientX, e.clientY);
      },

      onForceLayoutEnd: function() {
        this.saveAllGraphData();
        this.forceLayoutSettings.isRunning = false;
      },

      restartForceLayoutIfRunning: function() {
        if (this.forceLayoutSettings.isRunning) {
          this.forceLayoutSettings.isRunning = false;

          var self = this;
          Vue.nextTick(function() {
            self.forceLayoutSettings.isRunning = true;
          });
        }
      }

    },

    watch: {
      nodes: function(nodes) {
        this.$forceLayout.nodes(nodes);
      },

      edges: function(edges) {
        this.$forceLayout.links(edges);
      },

      // don't ever start/stop forceLayout directly. toggle the
      // forceLayout.isRunning flag to start/stop forceLayout
      'forceLayoutSettings.isRunning': function(newVal, oldVal) {
        if (newVal) {
          this.$forceLayout.start();

          var self = this;
          this.$forceLayoutAutoStart = setInterval(function() {
            self.$forceLayout.alpha(0.02);
          }, 2000);
        }
        else {
          this.$forceLayout.stop();
          clearInterval(this.$forceLayoutAutoStart);
        }
      },

      'forceLayoutSettings.parameters.theta': function(theta) {
        this.$forceLayout.theta(theta);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.friction': function(friction) {
        this.$forceLayout.friction(friction);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.gravity': function(gravity) {
        this.$forceLayout.gravity(gravity);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.charge': function(charge) {
        this.$forceLayout.charge(charge);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.chargeDistance': function(chargeDistance) {
        this.$forceLayout.chargeDistance(chargeDistance);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.linkDistance': function(linkDistance) {
        this.$forceLayout.linkDistance(linkDistance);
        this.forceLayoutSettings.isRunning = false;
      },

      'forceLayoutSettings.parameters.linkStrength': function(linkStrength) {
        this.$forceLayout.linkStrength(linkStrength);
        this.forceLayoutSettings.isRunning = false;
      }
    },

    created: function () {
      window.addEventListener('resize', this.resize.bind(this));
    },

    ready: function() {
      this.$$el = $(this.$el);
      this.$options.edgesMap = this.$parent.$options.edgesMap;
      this.$options.nodeComponentsMap = this.$parent.$options.nodeComponentsMap;
      this.$options.hypergraphID = this.$parent.$options.hypergraphID;
      this.$options.edgeContextMenu = this.$parent.$options.edgeContextMenu;

      this.resize();

      var $svg = Util(this.$el);
      $svg.on('dragstart', this.panStart.bind(this));
      $svg.on('drag', this.pan.bind(this));
      $svg.on('dragend', this.panEnd.bind(this));

      var forceLayoutParameters = this.forceLayoutSettings.parameters;
      this.$forceLayout = d3.layout.force()
          .size([this.width, this.height])
          .alpha(forceLayoutParameters.alpha)
          .theta(forceLayoutParameters.theta)
          .friction(forceLayoutParameters.friction)
          .gravity(forceLayoutParameters.gravity)
          .charge(forceLayoutParameters.charge)
          .chargeDistance(forceLayoutParameters.chargeDistance)
          .linkDistance(forceLayoutParameters.linkDistance)
          .linkStrength(forceLayoutParameters.linkStrength);

      this.$forceLayout.on('end', this.onForceLayoutEnd.bind(this));
    }

  });

});
