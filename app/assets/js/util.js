// Utils
define([
  'jquery',
  'globals'
], function (jquery, glob) {
  'use strict';

  var DRAG_STATES = Object.freeze({
    'NONE': 0,
    'DRAG_START': 1,
    'DRAG': 2
  });

  var dragState = glob.mouse.dragState = {
    state: DRAG_STATES.NONE
  };

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
    // DO NOT use these properties as part
    // of the client API as that can lead to
    // memory leaks

    this.__object__ = value;
    this.__destroy__ = [];
  }

  WrappedUtil.prototype = Util.prototype;

  // jQuery forwarding methods
  (function() {
    function ajax() {
      return jquery.ajax.apply(jquery, arguments);
    }

    function getJSON() {
      return jquery.getJSON.apply(jquery, arguments);
    }

    function when() {
      return jquery.when.apply(jquery, arguments);
    }

    function width() {
      return jquery.apply(jquery, arguments).width();
    }

    function height() {
      return jquery.apply(jquery, arguments).height();
    }

    Util.ajax = ajax;
    Util.getJSON = getJSON;
    Util.when = when;
    Util.width = width;
    Util.height = height;
  })();

  //Unwrapped definitions
  (function() {
    var events = {};

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

    function transformPointFromViewportToEl(x, y, el) {
      var viewportEl = el.nearestViewportElement || el;

      var ctm = viewportEl.getCTM().inverse(0);
      var etm = el.getTransformToElement(viewportEl).inverse();
      etm.e = etm.f = 0;

      console.log(viewportEl.getCTM().inverse(), viewportEl.getScreenCTM().inverse(), etm);

      var svgPoint = viewportEl.createSVGPoint();

      svgPoint.x = x;
      svgPoint.y = y;

      svgPoint = svgPoint.matrixTransform(ctm);
      svgPoint = svgPoint.matrixTransform(etm);

      return svgPoint;
    }

    function transformVectorFromViewportToEl(x, y, el) {
      var viewportEl = el.nearestViewportElement;
      var ctm = viewportEl.getCTM().inverse();
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

    function transformPointFromScreenToEl(x, y, el) {
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

    function transformVectorFromScreenToEl(x, y, el) {
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
    Util.transformVectorFromScreenToEl = transformVectorFromScreenToEl;
    Util.transformPointFromScreenToEl = transformPointFromScreenToEl;
    Util.transformPointFromViewportToEl = transformPointFromViewportToEl;
    Util.transformVectorFromViewportToEl = transformVectorFromViewportToEl;
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
      glob.mouse.x = e.x;
      glob.mouse.y = e.y;
      Util.trigger('mousemove', e);
    });

    document.addEventListener('mouseup', function(e) {
      Util.trigger('mouseup', e);
    });

    var on = function (el, eventName, callback) {
      var events = this.__events__;
      if (!events) {
        events = this.__events__ = {};
        this.__destroy__.push(registerEvents(this, el));
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

    var destroy = function (el) {
      var self = this;
      this.__destroy__.forEach(function(destroyCallback) {
        destroyCallback.call(self);
      });

      this.__events__ = null;
    };

    function registerDropEvents($util, el) {
      // todo: how to check if the drop element is
      // a valid target
      function drop_mouseover(e) {
        if (dragState.state == DRAG_STATES.NONE) {
          return;
        }

        $util.trigger('dragenter', e);
      }

      function drop_mouseout(e) {
        if (dragState.state == DRAG_STATES.NONE) {
          return;
        }

        $util.trigger('dragleave', e);
      }

      function drop_click(e) {
        if (dragState.state == DRAG_STATES.NONE) {
          return;
        }

        $util.trigger('drop', e);
      }

      el.addEventListener('mouseover', drop_mouseover);
      el.addEventListener('mouseout', drop_mouseout);
      el.addEventListener('click', drop_click);

      return function() {
        el.removeEventListener('mouseover', drop_mouseover);
        el.removeEventListener('mouseout', drop_mouseout);
        el.removeEventListener('click', drop_click);
      };
    }

    function registerEvents($util, el) {
      var px, py = 0;
      var dragFlag = false;
      var mouseOnElFlag = false;

      function drag_mousedown(e) {
        if (e.button !== 0) {
          return;
        }

        dragState.state = DRAG_STATES.DRAG_START;
        dragState.element = el;
        px = e.x;
        py = e.y;

        $util.trigger('dragstart', e);

        //memory leak if we don't removeEventListener?
        Util.on('mousemove', drag_mousemove);
        Util.on('mouseup', drag_mouseup);
      }

      function drag_mousemove(e) {
        if (!dragFlag) {
          dragFlag = true;
          dragState.state = DRAG_STATES.DRAG;
        }

        e.dx = e.x - px;
        e.dy = e.y - py;
        $util.trigger('drag', e);
      }

      function drag_mouseup(e) {
        Util.off('mousemove', drag_mousemove);
        Util.off('mouseup', drag_mouseup);

        if (!dragFlag) {
          return;
        }

        var x = e.x;
        var y = e.y;

        dragState.state = DRAG_STATES.NONE;

        $util.trigger('dragend', e);

        if ((!mouseOnElFlag) ||
            (x < 0 || y < 0) ||
            (x > window.innerWidth || y > window.innerHeight)) {
          dragFlag = false;

          if (mouseoutEventIgnored) {
            mouseoutEventIgnored = false;
            $util.trigger('mouseout', e);
          }
        }
      }

      function mouseup(e) {
        $util.trigger('mouseup', e);
      }

      function mousedown(e) {
        $util.trigger('mousedown', e);
      }

      function mouseover(e) {
        mouseOnElFlag = true;
        if (dragFlag || mousedownFlag)
          return;

        $util.trigger('mouseover', e);
      }

      var mouseoutEventIgnored = false;
      function mouseout(e) {
        mouseOnElFlag = false;

        if (dragFlag || mousedownFlag) {
          mouseoutEventIgnored = true;
          return;
        }

        $util.trigger('mouseout', e);
      }

      function click(e) {
        if (dragFlag) {
          dragFlag = false;
        }
        else {
          $util.trigger('click', e);
        }
      }

      el.addEventListener('mousedown', drag_mousedown);
      el.addEventListener('mousedown', mousedown);
      el.addEventListener('mouseenter', mouseover);
      el.addEventListener('mouseleave', mouseout);
      el.addEventListener('mouseup', mouseup);
      el.addEventListener('click', click);

      var removeDropEventListeners = registerDropEvents($util, el);

      return function() {
        Util.off('mouseup', drag_mouseup);
        Util.off('mousemove', drag_mousemove);

        // can't assume that when the UtilWrapper object is
        // explicitly destroyed that its wrapped DOM element
        // will destroyed as well. thus we explicitly remove
        // the events listeners to avoid lost handles back to the
        // UtilWrapper that was requested to be destroyed
        el.removeEventListener('mousedown', drag_mousedown);
        el.removeEventListener('mousedown', mousedown);
        el.removeEventListener('mouseover', mouseover);
        el.removeEventListener('mouseout', mouseout);
        el.removeEventListener('mouseup', mouseup);
        el.removeEventListener('click', click);

        removeDropEventListeners();
      };
    }

    Util.mixin('on', on);
    Util.mixin('off', off);
    Util.mixin('trigger', trigger);
    Util.mixin('destroy', destroy);
  })();

  return Util;
});