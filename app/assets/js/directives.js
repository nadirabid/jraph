define([
  'vue',
  'util'
], function (Vue, Util) {
  'use strict';

  //TODO: refactor this out as part of the Util library

  var slice = Array.prototype.slice;
  var mousedownFlag = false;

  document.addEventListener('mousedown', function () {
    mousedownFlag = true;
  }, true);

  document.addEventListener('mouseup', function () {
    mousedownFlag = false;
  }, true);

  document.addEventListener('mousemove', function (e) {
    Util.trigger('mousemove', e);
  });

  document.addEventListener('mouseup', function(e) {
    Util.trigger('mouseup', e);
  });

  var on = function (el, eventName, callback) {
    var events = this.__events__;
    if (!events) {
      events = this.__events__ = {};
      registerEvents(this, el);
    }

    var callbacks = events[eventName];
    if (!callbacks) {
      callbacks = events[eventName] = [];
    }

    callbacks.push(callback);
    return callback;
  };

  var off = function (el, eventName, callback) {
    var events = this.__events__;
    if (!events) {
      return;
    }

    var callbacks = events[eventName];
    if (!callbacks) {
      return;
    }

    if (!callbacks) {
      events[eventName] = [];
    }

    var callbackIndex = callbacks.indexOf(callback);
    if (callbackIndex < 0) {
      return;
    }
    return callbacks.splice(callbackIndex, 1);
  };

  var trigger = function (el, eventName, e) {
    var events = this.__events__;
    if (!events) {
      return;
    }

    var callbacks = events[eventName];
    if (!callbacks) {
      return;
    }

    var args = slice.call(arguments, 2, arguments.length);
    callbacks.forEach(function (callback) {
      callback.apply(el, args);
    });
  };

  function registerEvents(util, el) {
    var mdx, mdy = 0;
    var px, py = 0;
    var dragFlag = false;
    var mouseOnElFlag = false;

    function mousemove(e) {
      var x = e.x;
      var y = e.y;
      var dx = e.x - mdx;
      var dy = e.y - mdy;

      if (!dragFlag) {
        var distSquared = dx * dx + dy * dy;

        if (distSquared > 2) {
          util.trigger('dragstart', dx, dy, x, y, e);
          dragFlag = true;
        }
      }
      else {
        util.trigger('drag', dx, dy, x, y, e);
      }

      px = e.x;
      py = e.y;
    }

    function mouseup(e) {
      Util.off('mousemove', mousemove);
      Util.off('mouseup', mouseup);

      if (!dragFlag)
        return;

      var x = e.x;
      var y = e.y;

      e.mousedownFlag = mousedownFlag;
      util.trigger('dragend', e);

      if (!mouseOnElFlag || x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
        dragFlag = false;
        util.trigger('mouseup', e);
        util.trigger('mouseout', e);
      }
    }

    function mouseover(e) {
      mouseOnElFlag = true;
      if (dragFlag || mousedownFlag)
        return;

      e.mousedownFlag = mousedownFlag;
      util.trigger('mouseover', e);
    }

    function mouseout(e) {
      mouseOnElFlag = false;
      if (dragFlag || mousedownFlag)
        return;

      e.mousedownFlag = mousedownFlag;
      util.trigger('mouseout', e);
    }

    function mousedown(e) {
      e.stopPropagation();
      px = mdx = e.x;
      py = mdy = e.y;

      //memory leak if we don't removeEventListener?
      Util.on('mousemove', mousemove);
      Util.on('mouseup', mouseup);
    }

    function click(e) {
      if (dragFlag) {
        dragFlag = false;
      }
      else {
        util.trigger('click', e);
      }
    }

    el.addEventListener('mouseover', mouseover);
    el.addEventListener('mouseout', mouseout);
    el.addEventListener('mousedown', mousedown);
    el.addEventListener('click', click);
  }

  Util.mixin('on', on);
  Util.mixin('off', off);
  Util.mixin('trigger', trigger);

  Vue.directive('xon', {

    isFn: true,

    bind: function () {
      var ctx = this.binding.isExp ? this.vm : this.binding.compiler.vm;

      var $$el = this.$$el = new Util(this.el);
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