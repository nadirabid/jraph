'use strict';

// Utils 

function noop() {

}

function setCTM( element, matrix ) {
	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + ","
										+ matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttributeNS( null, "transform", s );
}

function extendClass( parentClass, childClass ) {
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
}

function deepResolveIndex( obj, index ) {
	var resolve = function( o, i ) { return o ? o[i] : o; };
	return index.split( '.' ).reduce( resolve, obj );
}

function chainEvalVm( vm, varName ) {
	if ( !vm.$parent || deepResolveIndex( vm, varName ) )
		return vm;
	else 
		return chainEvalVm( vm.$parent, varName );
}


function transformPointToEl( x, y, el ) {
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
}

function transformVectorToEl( x, y, el ) {
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
}