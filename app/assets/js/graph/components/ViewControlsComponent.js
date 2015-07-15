define([
    'vue'
], function(Vue) {
  'use strict';

  var ViewControlsComponent = Vue.extend({

    template: '#graphControls',

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

  return ViewControlsComponent;

});
