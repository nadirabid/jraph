define([
  'vue',
  'util'
], function (Vue, util) {
  'use strict';

  Vue.directive('xon', {

    isFn: true,

    bind: function () {
      var ctx = this.binding.isExp ? this.vm : this.binding.compiler.vm;

      var $$el = this.$$el = util(this.el);
      this.context = ctx;

      if (ctx._xon) {
        ctx._xon++;
        return;
      }

      this.__dragstart__ = $$el.on('dragstart', function (dx, dy, x, y, e) {
        e.stopPropagation();
        ctx.$emit('x-dragstart', dx, dy, x, y, e);
      });

      this.__drag__ = $$el.on('drag', function (dx, dy, x, y, e) {
        ctx.$emit('x-drag', dx, dy, x, y, e);
      });

      this.__dragend__ = $$el.on('dragend', function (e) {
        ctx.$emit('x-dragend', e);
      });

      this.__mouseover__ = $$el.on('mouseover', function (e) {
        ctx.$emit('x-mouseover', e);
      });

      this.__mouseout__ = $$el.on('mouseout', function (e) {
        ctx.$emit('x-mouseout', e);
      });

      this.__click__ = $$el.on('click', function (e) {
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
      var $$el = this.$$el;

      this.vm._xon--;

      $$el.off('dragstart', this.__dragstart__);
      $$el.off('drag', this.__drag__);
      $$el.off('dragend', this.__dragend__);
      $$el.off('mouseover', this.__mouseover__);
      $$el.off('mouseout', this.__mouseout__);
      $$el.off('click', this.__click__);

      this.context.$off(this.arg, this.currHandler);
    }

  });
});