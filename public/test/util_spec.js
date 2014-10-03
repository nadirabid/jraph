define([
  'js/util',
  'testHelpers'
], function (util, testHelpers) {

  describe('Util', function () {
    describe('custom events', function () {
      var xmlns = 'http://www.w3.org/2000/svg';
      var svgEl, circleEl;
      var $circleEl;
      var customEvents = [
        'mouseover', 'mouseout', 'mousedown', 'mouseup',
        'mousemove', 'drag', 'dragstart', 'dragend', 'click'
      ];

      beforeEach(function () {
        svgEl = document.createElementNS(xmlns, 'svg');
        svgEl.style.visibility = 'hidden';
        svgEl.setAttributeNS(null, 'width', '500');
        svgEl.setAttributeNS(null, 'height', '500');

        circleEl = document.createElementNS(xmlns, 'circle');
        circleEl.setAttributeNS(null, 'cx', '250');
        circleEl.setAttributeNS(null, 'cy', '250');
        circleEl.setAttributeNS(null, 'r', '50');

        svgEl.appendChild(circleEl);
        //document.body.appendChild(svgEl);

        $circleEl = util(circleEl);
      });

      afterEach(function() {
        //document.body.removeChild(svgEl);
      });

      it('should trigger mouseover event when DOM based mouseover event is dispatched', function () {
        var mouseEventName = 'mouseover';
        var spy = jasmine.createSpy(mouseEventName + 'Spy');
        $circleEl.on(mouseEventName, spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function (eventName) {
              return eventName != mouseEventName;
            }).forEach(function (eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: mouseEventName, view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: mouseEventName }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });

      it('should trigger mouseout event when DOM based mouseout event is dispatched', function () {
        var mouseEventName = 'mouseout';
        var spy = jasmine.createSpy(mouseEventName + 'Spy');
        $circleEl.on(mouseEventName, spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function (eventName) {
              return eventName != mouseEventName;
            }).forEach(function (eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: mouseEventName, view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: mouseEventName }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });

      it('should trigger mousedown event when DOM mousedown event is dispatched', function () {
        var mouseEventName = 'mousedown';
        var spy = jasmine.createSpy(mouseEventName + 'Spy');
        $circleEl.on(mouseEventName, spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function (eventName) {
              return eventName != mouseEventName;
            }).forEach(function (eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: mouseEventName, view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: mouseEventName }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });

      it('should trigger mouseup event when DOM mouseup event is dispatched', function () {
        var mouseEventName = 'mouseup';
        var spy = jasmine.createSpy(mouseEventName + 'Spy');
        $circleEl.on(mouseEventName, spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function (eventName) {
              return eventName != mouseEventName;
            }).forEach(function (eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: mouseEventName, view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: mouseEventName }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });

    });
  });

});