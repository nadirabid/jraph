define([
    'vue'
], function(Vue) {
  'use strict';

  var ViewControlsComponent = Vue.extend({

    graphComponent: null,

    methods: {

      updatePosition: function() {
        var padding = 12;

        this.$el.style.setProperty('bottom', padding + 'px');
        this.$el.style.setProperty('right', padding + 'px');
      },

      incrementZoomLevel: function() {
        this.$options.graphComponent.incrementZoomLevel();
      },

      decrementZoomLevel: function() {
        this.$options.graphComponent.decrementZoomLevel();
      },

      centerView: function() {
        this.$options.graphComponent.centerView();
      }

    },

    created: function() {
      if (!this.$options.graphComponent) throw 'graphComponent must be specified';
    },

    ready: function() {
      this.updatePosition();
      window.addEventListener('resize', this.updatePosition.bind(this));
    }

  });

  return ViewControlsComponent;

});
