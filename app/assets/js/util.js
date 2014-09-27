// Utils
define(function() {
  var Utils = {};

  Utils.noop = function() { };

  Utils.setCTM = function( element, matrix ) {
    var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";

    element.setAttributeNS( null, "transform", s );
  };

  Utils.extendClass = function( parentClass, childClass ) {
    if ( !childClass )
      childClass = function() { };

    function childClassWrapper() {
      parentClass.apply( this, arguments );
      return childClass.apply( this, arguments );
    }

    childClassWrapper.prototype = Object.create( parentClass.prototype );
    childClassWrapper.prototype.constructor = childClassWrapper;
    childClassWrapper.prototype.parent = parentClass.prototype;

    return childClassWrapper;
  };

  Utils.deepResolveIndex = function( obj, index ) {
    var resolve = function( o, i ) { return o ? o[i] : o; };
    return index.split( '.' ).reduce( resolve, obj );
  };

  Utils.chainEvalVm = function( vm, varName ) {
    if ( !vm.$parent || deepResolveIndex( vm, varName ) )
      return vm;
    else
      return chainEvalVm( vm.$parent, varName );
  };

  Utils.transformPointToEl = function( x, y, el ) {
    var viewportEl = el.nearestViewportElement || el;
    var ctm = viewportEl.getScreenCTM().inverse();
    var etm = el.getTransformToElement( viewportEl ).inverse();
    etm.e = etm.f = 0;

    var svgPoint = viewportEl.createSVGPoint();

    svgPoint.x = x;
    svgPoint.y = y;

    svgPoint = svgPoint.matrixTransform( ctm );
    svgPoint = svgPoint.matrixTransform( etm );

    return svgPoint;
  };

  Utils.transformVectorToEl = function( x, y, el ) {
    var viewportEl = el.nearestViewportElement;
    var ctm = viewportEl.getScreenCTM().inverse();
    ctm.e = ctm.f = 0;

    var etm = el.getTransformToElement( viewportEl ).inverse();
    etm.e = etm.f = 0;

    var svgPoint = viewportEl.createSVGPoint();

    svgPoint.x = x;
    svgPoint.y = y;

    svgPoint = svgPoint.matrixTransform( ctm );
    svgPoint = svgPoint.matrixTransform( etm );

    return svgPoint;
  };

  return Utils;
});