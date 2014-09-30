// Utils
define(function () {
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

    function childClassWrapper() {
      parentClass.apply(this, arguments);
      return childClass.apply(this, arguments);
    }

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
    if (!vm.$parent || deepResolveIndex(vm, varName)){
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
    Util.prototype[name] = function() {
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

  return Util;
});