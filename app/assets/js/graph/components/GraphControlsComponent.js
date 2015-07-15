define([
    'vue'
], function(Vue) {
  'use strict';

  return Vue.extend({

    template: '#graph.controls',

    props: {
      incrementZoom: {
        required: true,
        type: Function
      },
      decrementZoom: {
        required: true,
        type: Function
      },
      centerView: {
        required: true,
        type: Function
      }
    }

  });

});
