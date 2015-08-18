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
      forceLayout: {
        required: true
      },
      saveAllGraphData: {
        required: true
      }
    },

    data: function () {
      return {
        isZooming: false,
        state: null,
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

        if (this.width == newWidth &&
            this.height == newHeight) {
          return;
        }

        this.offset = this.$$el.offset();

        this.width = newWidth;
        this.height = newHeight;
      },

      panStart: function () {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        this._ctm = this.$$.nodesAndLinksGroup.getCTM();

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var ctm = this._ctm;

        var v = Util.transformVectorFromClientToEl(e.dx, e.dy, this.$$.nodesAndLinksGroup);

        var self = this;
        Vue.nextTick(function() {
          Util.setCTM(self.$$.nodesAndLinksGroup, ctm.translate(v.x, v.y));
        });
      },

      panEnd: function() {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;
        this._ctm = null;

        Vue.nextTick(function() {
          self.$el.style.setProperty('cursor', 'auto');
        });
      },

      centerView: function() {
        var self = this;
        var defaultCTM = this.$el.createSVGMatrix();

        Vue.nextTick(function() {
          Util.setCTM(self.$$.nodesAndLinksGroup, defaultCTM);
        });
      },

      contextMenu: function (e) {
        if (e.target != this.$$.backdrop) return;

        e.preventDefault();

        graphContextMenu.show(e.clientX, e.clientY);
      },

      onForceLayoutEnd: function() {
        if (this.forceLayout.isRunning) {
          this.saveAllGraphData();
        }

        this.forceLayout.isRunning = false;
      },

      restartForceLayoutIfRunning: function() {
        if (this.forceLayout.isRunning) {
          this.forceLayout.isRunning = false;

          var self = this;
          Vue.nextTick(function() {
            self.forceLayout.isRunning = true;
          });
        }
      }

    },

    created: function () {
      window.addEventListener('resize', this.resize.bind(this));
    },

    watch: {
      nodes: function(nodes) {
        this.$forceLayout.nodes(nodes);
      },

      edges: function(edges) {
        this.$forceLayout.links(edges);
      },

      'forceLayout.isRunning': function(isRunning) {
        if (isRunning) {
          this.$forceLayout.start();
        }
        else {
          this.$forceLayout.stop();
        }
      },

      'forceLayout.parameters.alpha': function(alpha) {
        this.$forceLayout.alpha(alpha);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.theta': function(theta) {
        this.$forceLayout.theta(theta);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.friction': function(friction) {
        this.$forceLayout.friction(friction);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.gravity': function(gravity) {
        this.$forceLayout.gravity(gravity);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.charge': function(charge) {
        this.$forceLayout.charge(charge);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.chargeDistance': function(chargeDistance) {
        this.$forceLayout.chargeDistance(chargeDistance);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.linkDistance': function(linkDistance) {
        this.$forceLayout.linkDistance(linkDistance);
        this.restartForceLayoutIfRunning();
      },

      'forceLayout.parameters.linkStrength': function(linkStrength) {
        this.$forceLayout.linkStrength(linkStrength);
        this.restartForceLayoutIfRunning();
      }
    },

    ready: function() {
      this.$$el = $(this.$el);
      this.$options.state = this.$parent.$options.state;
      this.$options.edgesMap = this.$parent.$options.edgesMap;
      this.$options.nodeComponentsMap = this.$parent.$options.nodeComponentsMap;
      this.$options.hypergraphID = this.$parent.$options.hypergraphID;
      this.$options.edgeContextMenu = this.$parent.$options.edgeContextMenu;

      this.state = this.$parent.$options.state;

      this.resize();

      var $svg = Util(this.$el);
      $svg.on('dragstart', this.panStart.bind(this));
      $svg.on('drag', this.pan.bind(this));
      $svg.on('dragend', this.panEnd.bind(this));

      var forceLayoutParameters = this.forceLayout.parameters;
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
