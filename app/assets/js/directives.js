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

      this.context = ctx;
      this.$util = ctx.__$util__;

      if (ctx.__xon__) {
        ctx.__xon__++;
        return;
      }

      if (ctx.__$util__ !== undefined) {
        throw 'Util already initialized';
      }

      this.$util = ctx.__$util__ = util(this.el);
      ctx.__xon__ = 1;
    },

    update: function (handler) {
      var ctx = this.context;
      var $util = this.$util;

      if (this.currHandler) {
        $util.off(this.arg, this.currHandler);
      }

      if (typeof handler !== 'function') {
        throw 'Directive "xon" requires a valid function';
      }

      this.currHandler = handler.bind(ctx);
      $util.on(this.arg, this.currHandler);
    },

    unbind: function () {
      var $util = this.$util;

      this.vm.__xon__ -= 1;

      if (this.vm.__xon__ === 0) {
        $util.destroy();
      }

      this.context.$off(this.arg, this.currHandler);
    }

  });
});