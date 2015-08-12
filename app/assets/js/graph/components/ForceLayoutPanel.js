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
    }

  });

});
