define([
    'vue'
], function(Vue) {
  'use strict';

  var NavComponent = Vue.extend({

    template: '#nav',

    props: {
      dataState: {
        type: String,
        required: true
      }
    }
    
  });

  return NavComponent;

});
