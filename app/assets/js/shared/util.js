// Utils
define([
    'jquery'
], function (jquery) {
  'use strict';

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

  var counter = 0;

  function WrappedUtil(value) {
    // DO NOT use these properties as part
    // of the client API as that can lead to
    // memory leaks

    this.__id__ = counter++;
    this.__object__ = value;
    this.__destroy__ = [];
  }

  WrappedUtil.prototype = Util.prototype;

  // properties
  (function() {
    var DRAG_STATES = Object.freeze({
      'NONE': 0,
      'DRAG_START': 1,
      'DRAG': 2
    });

    var mouse = {
      state: 'initial',
      data: { },
      dragState: {
        state: DRAG_STATES.NONE
      }
    };

    Util.DRAG_STATES = DRAG_STATES;
    Util.mouse = mouse;
  })();

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

    function noop() {
      //do nothing
    }

    function isNullOrUndefined(value) {
      return value === null || value === undefined;
    }

    function animationFrame(callback) {
      return defer(callback, 0);
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

    function setCTM(element, m) {
      element.setAttributeNS(
          null,
          "transform",
          "matrix(" + m.a + "," + m.b + "," + m.c + "," + m.d + "," + m.e + "," + m.f + ")"
      );
    }

    function transformPointFromClientToEl(x, y, el) {
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

    function transformVectorFromClientToEl(x, y, el) {
      var viewportEl = el.nearestViewportElement;
      var ctm = viewportEl.getScreenCTM().inverse();
      ctm.e = ctm.f = 0; // specifically for dealing with vectors

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

    function validateEmail(email) {
      var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return re.test(email);
    }

    function validateLink(link) {
      var re = /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
      return re.test(link);
    }

    function validatePhoneNumber(phoneNumber) {
      var matches = phoneNumber.match(/\d/g);

      if (!matches)
        return false;

      return matches.length === 10;
    }

    function validateAlphanumeric(str) {
      var alphaNumericReg = /^[a-z0-9]+$/i;
      return alphaNumericReg.test(str);
    }

    function addEventListenerOnce(el, eventName, callback) {
      var callbackWrapper = function() {
        callback.apply(this, arguments);
        el.removeEventListener(eventName, callbackWrapper);
      };

      el.addEventListener(eventName, callbackWrapper);
    }

    Util.addEventListenerOnce = addEventListenerOnce;
    Util.validateAlphanumeric = validateAlphanumeric;
    Util.validateEmail = validateEmail;
    Util.validateLink = validateLink;
    Util.validatePhoneNumber = validatePhoneNumber;
    Util.isNullOrUndefined = isNullOrUndefined;
    Util.animationFrame = animationFrame;
    Util.extendClass = extendClass;
    Util.noop = noop;
    Util.mixin = mixin;
    Util.on = on;
    Util.off = off;
    Util.setCTM = setCTM;
    Util.trigger = trigger;
    Util.transformVectorFromClientToEl = transformVectorFromClientToEl;
    Util.transformPointFromClientToEl = transformPointFromClientToEl;
  })();

  //Wrapper definitions
  (function() {
    var slice = Array.prototype.slice;
    var mousedownFlag = false;
    var DRAG_STATES = Util.DRAG_STATES;
    var mouse = Util.mouse;
    var dragState = Util.mouse.dragState;

    document.addEventListener('mousedown', function () {
      mousedownFlag = true;
    }, true);

    document.addEventListener('mouseup', function () {
      mousedownFlag = false;
    }, true);

    document.addEventListener('mousemove', function (e) {
      // TODO: (BUG) sometimes mouse position is required before
      // mousemove event. like scrolling for zoom. so we should initially
      // bind to all events that reveal mouse location and then remove
      // them when mousemove is finally called

      mouse.x = e.clientX;
      mouse.y = e.clientY;

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

      el.addEventListener('mouseenter', drop_mouseover);
      el.addEventListener('mouseleave', drop_mouseout);
      el.addEventListener('click', drop_click);

      return function() {
        el.removeEventListener('mouseenter', drop_mouseover);
        el.removeEventListener('mouseleave', drop_mouseout);
        el.removeEventListener('click', drop_click);
      };
    }

    function registerEvents($util, el) {
      var px, py = 0;
      var dragFlag = false;

      function drag_mousedown(e) {
        if (e.button !== 0) {
          return;
        }

        dragState.state = DRAG_STATES.DRAG_START;
        dragState.element = e.target;

        px = e.clientX;
        py = e.clientY;

        $util.trigger('dragstart', e);

        //memory leak if we don't removeEventListener?
        Util.on('mousemove', drag_mousemove);
        Util.on('mouseup', drag_mouseup);
      }

      function drag_mousemove(e) {
        dragFlag = true;
        dragState.state = DRAG_STATES.DRAG;

        e.dx = e.clientX - px;
        e.dy = e.clientY - py;

        $util.trigger('drag', e);
      }

      function drag_mouseup(e) {
        Util.off('mousemove', drag_mousemove);
        Util.off('mouseup', drag_mouseup);

        if (dragState.element !== e.target) {
          dragFlag = false;
        }

        $util.trigger('dragend', e);

        dragState.state = DRAG_STATES.NONE;
        dragState.element = null;
      }

      function mouseup(e) {
        $util.trigger('mouseup', e);
      }

      function mousedown(e) {
        $util.trigger('mousedown', e);
      }

      function mouseover(e) {
        $util.trigger('mouseover', e);
      }

      function mouseout(e) {
        $util.trigger('mouseout', e);
      }

      function click(e) {
        if (dragFlag) {
          e.preventDefault();
          dragFlag = false;
        }

        $util.trigger('click', e);
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
        el.removeEventListener('mouseenter', mouseover);
        el.removeEventListener('mouseleave', mouseout);
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