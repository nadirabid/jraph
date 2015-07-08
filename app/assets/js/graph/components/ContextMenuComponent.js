define([
    'vue'
], function(Vue) {
  'use strict';

  var ContextMenuComponent = Vue.extend({

    data: function() {
      return { x: 0, y: 0 };
    },

    methods: {

      show: function(x, y) {
        if (this.beforeShow) {
          this.beforeShow.apply(this, arguments);
        }

        this.x = x;
        this.y = y;

        var $el = this.$el;

        Vue.nextTick(function() {
          $el.classList.add('show');
          $el.classList.remove('hidden');

          $el.style.left = x + 'px';
          $el.style.top = y + 'px';
          $el.style.position = 'absolute';
        });
      },

      hide: function() {
        var $el = this.$el;

        Vue.nextTick(function() {
          $el.classList.add('hidden');
          $el.classList.remove('show');
        });

        if (this.afterHide) {
          this.afterHide.apply(this, arguments);
        }
      }

    }

  });

  return ContextMenuComponent;
});
