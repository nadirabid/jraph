define([
    'vue'
], function(Vue) {
  'use strict';

  var ViewControlsComponent = Vue.extend({

    graphComponent: null,

    methods: {

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
    }

  });

  return ViewControlsComponent;

});
