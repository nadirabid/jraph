define([
  'vue'
], function(Vue) {
  'use strict';

  var NavbarComponent = Vue.extend({

    data: function(){
      return {
        layout: 'Static'
      };
    },

    methods: {

      setLayout: function(layout) {
        if (this.layout === layout) {
          return;
        }

        var $layout = this.state.$layout;
        this.layout = layout;

        switch(layout) {
          case 'Static':
            $layout.enabled = false;
            break;
          case 'Force Directed':
            $layout.enabled = true;
            break;
        }
      }

    }

  });

  return NavbarComponent;
});