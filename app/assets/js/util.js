// Utils
define(function () {
  'use strict';
  var events = {};

  var slice = Array.prototype.slice;
  var push = Array.prototype.push;
  var defer = window.requestAnimationFrame ||
              window.webkitRequestAnimationFrame ||
              window.setTimeout;

  function Util(value) {
    if (value.hasOwnProperty('__object__')) {
      return value;
    } else {
      return new WrappedUtil(value);
    }
  }

  function WrappedUtil(value) {
    this.__object__ = value;
  }

  WrappedUtil.prototype = Util.prototype;

  //Unwrapped definitions
  (function() {
    function animationFrame(callback) {
      defer(callback, 0);
    }

    function on(eventName, callback) {
      var callbacks = events[eventName];
      if (!callbacks) {
        callbacks = events[eventName] = [];
      }
      callbacks.push(callback);
    }

    function off(eventName, callback) {
      var callbacks = events[eventName];
      if (!callbacks || !callback) {
        events[eventName] = [];
        return;
      }

      var callbackIndex = callbacks.indexOf(callback);
      if (callbackIndex < 0) {
        return;
      }

      return callbacks.splice(callbackIndex, 1);
    }

    function trigger(eventName) {
      var callbacks = events[eventName];
      if (!callbacks) {
        return;
      }

      var args = slice.call(arguments, 1, arguments.length);
      console.log('trigger', eventName, args);
      callbacks.forEach(function (callback) {
        callback.apply(Util, args);
      });
    }

    function noop() {
      //do nothing
    }

    function setCTM(element, matrix) {
      var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

      element.setAttributeNS(null, "transform", s);
    }

    function extendClass(parentClass, childClass) {
      if (!childClass) {
        childClass = function () {
        };
      }

      var childClassWrapper = function () {
        parentClass.apply(this, arguments);
        return childClass.apply(this, arguments);
      };

      childClassWrapper.prototype = Object.create(parentClass.prototype);
      childClassWrapper.prototype.constructor = childClassWrapper;
      childClassWrapper.prototype.parent = parentClass.prototype;

      return childClassWrapper;
    }

    function deepResolveIndex(obj, index) {
      var resolve = function (o, i) {
        return o ? o[i] : o;
      };
      return index.split('.').reduce(resolve, obj);
    }

    function chainEvalVm(vm, varName) {
      if (!vm.$parent || deepResolveIndex(vm, varName)) {
        return vm;
      }
      else {
        return chainEvalVm(vm.$parent, varName);
      }
    }

    function transformPointToEl(x, y, el) {
      var viewportEl = el.nearestViewportElement || el;
      var ctm = viewportEl.getScreenCTM().inverse();
      var etm = el.getTransformToElement(viewportEl).inverse();
      etm.e = etm.f = 0;

      var svgPoint = viewportEl.createSVGPoint();

      svgPoint.x = x;
      svgPoint.y = y;

      svgPoint = svgPoint.matrixTransform(ctm);
      svgPoint = svgPoint.matrixTransform(etm);

      return svgPoint;
    }

    function transformVectorToEl(x, y, el) {
      var viewportEl = el.nearestViewportElement;
      var ctm = viewportEl.getScreenCTM().inverse();
      ctm.e = ctm.f = 0;

      var etm = el.getTransformToElement(viewportEl).inverse();
      etm.e = etm.f = 0;

      var svgPoint = viewportEl.createSVGPoint();

      svgPoint.x = x;
      svgPoint.y = y;

      svgPoint = svgPoint.matrixTransform(ctm);
      svgPoint = svgPoint.matrixTransform(etm);

      return svgPoint;
    }

    function mixin(name, func) {
      Util.prototype[name] = function () {
        var args = [ this.__object__ ];
        push.apply(args, arguments);
        return func.apply(this, args);
      };
    }

    Util.animationFrame = animationFrame;
    Util.chainEvalVm = chainEvalVm;
    Util.deepResolveIndex = deepResolveIndex;
    Util.extendClass = extendClass;
    Util.noop = noop;
    Util.mixin = mixin;
    Util.on = on;
    Util.off = off;
    Util.setCTM = setCTM;
    Util.trigger = trigger;
    Util.transformVectorToEl = transformVectorToEl;
    Util.transformPointToEl = transformPointToEl;
  })();

  //Wrapper definitions
  (function() {
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
  })();

  return Util;
});