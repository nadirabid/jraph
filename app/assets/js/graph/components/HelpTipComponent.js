define([
    'vue'
], function(Vue) {
  'use strict';

  return Vue.extend({

    template: '#graph.help.tip',

    data: function() {
      return {
        left: 0
      };
    },

    methods: {

      centerHelpTip: function() {
        var windowWidth = $(window).innerWidth();
        var helpTipWidth = $(this.$el).outerWidth();

        this.left = (windowWidth/2) - (helpTipWidth/2);
      }

    },

    ready: function() {
      this.$centerHelpTip = this.centerHelpTip.bind(this);
      window.addEventListener('resize', this.$centerHelpTip);

      this.centerHelpTip();
    },

    beforeDestroy: function() {
      window.removeEventListener('resize', this.$centerHelpTip);
    }

  });
});
