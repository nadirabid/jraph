define([
    'snap',
    'vue'
], function(Snap, Vue) {
  'use strict';

  var mousedownFlag = false;

  document.documentElement.addEventListener('mousedown', function() { mousedownFlag = true; }, true);
  document.documentElement.addEventListener('mouseup', function() { mousedownFlag = false; }, true);

  Vue.directive('xon', {

    isFn: true,

    initializeEvents: function() {
      var ctx = this.context;
      var $$el = this.$$el;
      var dragFlag = false;
      var mouseoverFlag = false;

      this._drag = function( dx, dy, x, y, e ) {
        if ( dragFlag ) {
          ctx.$emit( 'x-drag', dx, dy, x, y, e );
        }
        else {
          ctx.$emit( 'x-dragstart', dx, dy, x, y, e );
          dragFlag = true;
        }
      };

      this._dragstart = function( x, y, e ) {
        e.stopPropagation();
      };

      this._dragEnd = function( e ) {
        e.mousedownFlag = mousedownFlag;
        ctx.$emit( 'x-dragend', e );

        if ( !mouseoverFlag ) {
          dragFlag = false;
          ctx.$emit( 'x-mouseout', e );
        }
      };

      this._mouseover = function( e ) {
        mouseoverFlag = true;

        if ( dragFlag )
          return;

        e.mousedownFlag = mousedownFlag;
        ctx.$emit( 'x-mouseover', e );
      };

      this._mouseout = function( e ) {
        mouseoverFlag = false;

        if ( dragFlag )
          return;

        e.mousedownFlag = mousedownFlag;
        ctx.$emit( 'x-mouseout', e );
      };

      this._click = function( e ) {
        if ( dragFlag ) {
          dragFlag = false;
          return;
        }

        ctx.$emit( 'x-click', e );
      };

      $$el.drag( this._drag, this._dragstart, this._dragEnd );
      $$el.mouseover( this._mouseover );
      $$el.mouseout( this._mouseout );
      $$el.click( this._click );
    },

    bind: function() {
      var ctx = this.binding.isExp	? this.vm : this.binding.compiler.vm;

      this.$$el = new Snap( this.el );
      this.context = ctx;

      if ( ctx._xon ) {
        ctx._xon++;
        return;
      }

      this.initializeEvents();
      ctx._xon = 1;
    },

    update: function( handler ) {
      var ctx = this.context;

      if ( this.currHandler )
        ctx.$off( this.arg, this.currHandler );

      if ( typeof handler !== 'function' )
        throw 'Directive "xon" requires a valid function';

      this.currHandler = handler.bind( ctx );
      ctx.$on( this.arg, this.currHandler );
    },

    unbind: function() {
      var $$el = this.$$el;

      this.vm._xon--;
      if ( this.vm._xon )
        $$el.undrag();

      $$el.unmouseover( this._mouseover );
      $$el.unmouseout( this._mouseout );
      $$el.unclick( this._click );

      this.context.$off( this.arg, this.currHandler );
    }

  });

});