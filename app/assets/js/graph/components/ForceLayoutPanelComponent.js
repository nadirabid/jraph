define([
    'vue'
], function(Vue) {
  'use strict';

  return Vue.extend({

    template: '#forceLayout.panel',

    props: {
      forceLayoutSettings: {
        required: true
      }
    },

    data: function() {
      return {
        showAdvancedSettings: false
      };
    },

    methods: {
      resetToForceLayoutParametersToDefaults: function() {
        this.forceLayoutSettings.parameters = _.clone(this.forceLayoutSettings.defaultParameters);
      }
    }

  });

});
