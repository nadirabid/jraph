define([
  'js/util',
  'testHelpers'
],function (util, testHelpers) {

  describe('Util', function () {
    describe('custom events', function () {
      var xmlns = 'http://www.w3.org/2000/svg';
      var svgEl, circleEl;
      var $circleEl;
      var customEvents = [
        'mouseover', 'mouseout', 'mousedown', 'mouseup',
        'mousemove', 'drag', 'dragstart', 'dragend', 'click'
      ];

      beforeEach(function() {
        svgEl = document.createElementNS(xmlns, 'svg');
        svgEl.setAttributeNS(null, 'width', '500');
        svgEl.setAttributeNS(null, 'height', '500');

        circleEl = document.createElementNS(xmlns, 'circle');
        circleEl.setAttributeNS(null, 'cx', '250');
        circleEl.setAttributeNS(null, 'cy', '250');
        circleEl.setAttributeNS(null, 'r', '50');

        svgEl.appendChild(circleEl);

        $circleEl = util(circleEl);
      });

      it('should trigger mouseover event when DOM based mouseover event is dispatched', function () {
        var spy = jasmine.createSpy('mouseoverSpy');
        $circleEl.on('mouseover', spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function(eventName) {
              return eventName != 'mouseover'
            }).forEach(function(eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: 'mouseover', view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'mouseover' }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });

      it('should trigger mouseout event when DOM based mouseout event is dispatched', function() {
        var spy = jasmine.createSpy('mouseoutSpy');
        $circleEl.on('mouseout', spy);

        var otherEventsSpy = jasmine.createSpy('otherEventsSpy');
        customEvents
            .filter(function(eventName) {
              return eventName != 'mouseout'
            }).forEach(function(eventName) {
              $circleEl.on(eventName, otherEventsSpy);
            });

        var mouseEvent = document.createEvent('MouseEvents');
        testHelpers.initMouseEvent(mouseEvent, { type: 'mouseout', view: window });
        circleEl.dispatchEvent(mouseEvent);

        expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'mouseout' }));
        expect(otherEventsSpy.calls.any()).toEqual(false);
      });



    });
  });

});