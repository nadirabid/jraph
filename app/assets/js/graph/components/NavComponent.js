define([
    'vue'
], function(Vue) {
  'use strict';

  var NavComponent = Vue.extend({

    data: function() {
      return {
        dataState: 'saved'
      };
    }

  });

  return NavComponent;

});
