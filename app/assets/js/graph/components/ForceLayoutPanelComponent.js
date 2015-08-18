define([
    'vue'
], function(Vue) {
  'use strict';

  return Vue.extend({

    template: '#forceLayout.panel',

    props: {
      forceLayout: {
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
        this.forceLayout.parameters = _.clone(this.forceLayout.defaultParameters);
      }
    }

  });

});
