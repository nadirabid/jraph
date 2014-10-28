define([
  'vue'
], function(Vue) {
  'use strict';

  var NavbarComponent = Vue.extend({

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

    },

    events: {

      'hook:created': function() {
        if (this.state.$layout.enabled) {
          this.$add('layout', 'Force Directed');
        }
        else {
          this.$add('layout', 'Static');
        }
      }

    }

  });

  return NavbarComponent;
});