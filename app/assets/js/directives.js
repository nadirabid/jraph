define([
  'vue',
  'util'
], function (Vue, util) {
  'use strict';

  Vue.directive('xon', {

    isFn: true,

    bind: function () {
      var ctx = this.binding.isExp ?
                    this.vm : this.binding.compiler.vm;

      var $util = this.$util = util(this.el);
      this.context = ctx;

      if (ctx._xon) {
        ctx._xon++;
        return;
      }

      $util.on('dragstart', function (e) {
        e.stopPropagation();
        ctx.$emit('x-dragstart', e);
      });

      $util.on('drag', function (e) {
        ctx.$emit('x-drag', e);
      });

      $util.on('dragend', function (e) {
        ctx.$emit('x-dragend', e);
      });

      $util.on('mouseover', function (e) {
        ctx.$emit('x-mouseover', e);
      });

      $util.on('mouseout', function (e) {
        ctx.$emit('x-mouseout', e);
      });

      $util.on('click', function (e) {
        ctx.$emit('x-click', e);
      });

      ctx._xon = 1;
    },

    update: function (handler) {
      var ctx = this.context;

      if (this.currHandler)
        ctx.$off(this.arg, this.currHandler);

      if (typeof handler !== 'function')
        throw 'Directive "xon" requires a valid function';

      this.currHandler = handler.bind(ctx);
      ctx.$on(this.arg, this.currHandler);
    },

    unbind: function () {
      var $util = this.$util;

      this.vm._xon--;

      $util.destroy();

      this.context.$off(this.arg, this.currHandler);
    }

  });
});