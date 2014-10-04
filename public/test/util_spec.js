define([
  'js/util',
  'testHelpers'
], function (util, testHelpers) {

  describe('Util', function () {
    describe('for DOM based events', function () {
      var xmlns = 'http://www.w3.org/2000/svg';
      var svgEl, circleEl, $circleEl;

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
        document.body.appendChild(svgEl);

        $circleEl = util(circleEl);
      });

      afterEach(function() {
        document.body.removeChild(svgEl);
        $circleEl.destroy();
      });

      it('should fire click event',
          function () {
            var mouseEventName = 'click';
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire mouseover event',
          function () {
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire mouseout event',
          function () {
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire mousedown event',
          function () {
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire mouseup event',
          function () {
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire mousemove event',
          function () {
            var mouseEventName = 'click';
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
            testHelpers.initMouseEvent(mouseEvent, {
              type: mouseEventName,
              view: window
            });

            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: mouseEventName
            }));

            expect(otherEventsSpy.calls.any()).toEqual(false);
          });

      it('should fire dragstart after mousedown and mousemove events',
          function() {
            var eventName = 'dragstart';
            var spy = jasmine.createSpy(eventName + 'Spy');
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.left + 0;
            var y = bBox.top + 0;

            $circleEl.on(eventName, spy);

            // first signal mousedown event simulating left mouse
            // button being depressed
            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            // signal two mousemove events to fire dragstart event
            for(var i = 0; i < 2; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + i*5,
                clientY: y + i*5
              });
              circleEl.dispatchEvent(mouseEvent);

              if (i < 1) {
                // only the final mousemove should fire drag
                expect(spy.calls.count()).toEqual(0);
              }
            }

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: 'mousemove'
            }));
          });

      it('should fire drag event after mousedown, mousemove and dragstart',
          function() {
            var eventName = 'drag';
            var spy = jasmine.createSpy(eventName + 'Spy');
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.left + 0;
            var y = bBox.top + 0;

            $circleEl.on(eventName, spy);

            // first signal mousedown event simulating left mouse
            // button being depressed
            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            // signal three mousemove events to fire drag event
            for(var i = 0; i < 3; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + i*5,
                clientY: y + i*5
              });
              circleEl.dispatchEvent(mouseEvent);

              if (i < 2) {
                // only the final mousemove should fire drag
                expect(spy.calls.count()).toEqual(0);
              }
            }

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: 'mousemove'
            }));
          });

      it('should fire dragend event immediately after dragstart and mouseup',
          function() {
            var eventName = 'dragend';
            var spy = jasmine.createSpy(eventName + 'Spy');
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.top + 0;
            var y = bBox.left + 0;

            $circleEl.on(eventName, spy);

            // first signal mousedown event simulating left mouse
            // button being depressed
            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            // signal two mousemove events to fire dragstart event
            for(var i = 0; i < 2; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + i*5,
                clientY: y + i*5
              });
              circleEl.dispatchEvent(mouseEvent);
            }

            mouseEvent = document.createEvent('MouseEvent');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mouseup',
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: 'mouseup'
            }));
          });

      it('should fire dragend event immediately after drag and mouseup',
          function() {
            var eventName = 'dragend';
            var spy = jasmine.createSpy(eventName + 'Spy');
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.top + 0;
            var y = bBox.left + 0;

            $circleEl.on(eventName, spy);

            // first signal mousedown event simulating left mouse
            // button being depressed
            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            for(var i = 0; i < 3; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + i*5,
                clientY: y + i*5
              });
              circleEl.dispatchEvent(mouseEvent);
            }

            mouseEvent = document.createEvent('MouseEvent');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mouseup',
              view: window
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(spy).toHaveBeenCalledWith(jasmine.objectContaining({
              type: 'mouseup'
            }));
          });

      it('should NOT fire dragend when mouse is being dragged ' +
              'outside of the browser window',
          function() {
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.left + 0;
            var y = bBox.top + 0;

            var dragendSpy = jasmine.createSpy('dragendSpy');
            $circleEl.on('dragend', dragendSpy);

            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            for(var i = 0; i < 3; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + 5*i,
                clientY: y + 5*i
              });
              circleEl.dispatchEvent(mouseEvent);
            }

            //simulate the mouse moving outside of the browser window
            mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousemove',
              view: window,
              clientX: window.innerWidth + 100,
              clientY: window.innerHeight + 100
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(dragendSpy.calls.count()).toEqual(0);
          });

      it('should NOT fire mouseout if, while dragging, the mouse is ' +
              'no longer over the original dragged element',
          function() {
            var bBox = circleEl.getBoundingClientRect();
            var x = bBox.left + 0;
            var y = bBox.top + 0;

            var mouseoutSpy = jasmine.createSpy('mouseoutSpy');
            $circleEl.on('mouseout', mouseoutSpy);

            var mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousedown',
              view: window,
              clientX: x,
              clientY: y
            });
            circleEl.dispatchEvent(mouseEvent);

            for(var i = 0; i < 3; i++) {
              mouseEvent = document.createEvent('MouseEvents');
              testHelpers.initMouseEvent(mouseEvent, {
                type: 'mousemove',
                view: window,
                clientX: x + 5*i,
                clientY: y + 5*i
              });
              circleEl.dispatchEvent(mouseEvent);
            }

            //simulate the mouse moving outside of the browser window
            mouseEvent = document.createEvent('MouseEvents');
            testHelpers.initMouseEvent(mouseEvent, {
              type: 'mousemove',
              view: window,
              clientX: window.innerWidth + 100,
              clientY: window.innerHeight + 100
            });
            circleEl.dispatchEvent(mouseEvent);

            expect(mouseoutSpy.calls.count()).toEqual(0);
          });
    });
  });

});