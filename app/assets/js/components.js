define([
    'lodash',
    'vue',
    'd3',
    'globals',
    'util',
    'models'
], function (_, Vue, d3, glob, util, models) {
  'use strict';

  var HALF_PI = glob.HALF_PI;
  var TWO_PI = glob.TWO_PI;

  var Node = models.Node;

  Vue.component('x-radial-button', {

    inherit: true,

    replace: true,

    template: document.getElementById('radial.button').innerHTML,

    data: function () {
      return {
        x: 0,
        dy: 0,
        highlightDistance: 2,
        highlightThickness: 3,
        radiusInner: 35,
        radiusOuter: 75,
        startAngle: 0,
        endAngle: 0,
        label: 'None',
        textPathId: _.uniqueId('radial_button_')
      };
    },

    computed: {

      backgroundPath: function () {
        var arc = d3.svg.arc()
            .innerRadius(this.radiusInner)
            .outerRadius(this.radiusOuter)
            .startAngle(this.startAngle + HALF_PI)
            .endAngle(this.endAngle + HALF_PI);

        return arc();
      },

      highlightPath: function () {
        var arc = d3.svg.arc()
            .innerRadius(this.radiusInner - this.highlightDistance)
            .outerRadius(this.radiusInner - this.highlightDistance - this.highlightThickness)
            .startAngle(this.startAngle + HALF_PI)
            .endAngle(this.endAngle + HALF_PI);

        return arc();
      },

      textPath: function () {
        var radiusInner = this.radiusInner,
            radiusOuter = this.radiusOuter,
            startAngle = this.startAngle,
            endAngle = this.endAngle;

        var midRadius = radiusInner + ( ( radiusOuter - radiusInner ) / 2 );
        var midAngle = startAngle + ( ( endAngle - startAngle ) / 2 );

        var reverse = midAngle > 0 && midAngle < Math.PI;

        var arcData = {
          x0: midRadius * Math.cos(reverse ? endAngle : startAngle),
          y0: midRadius * Math.sin(reverse ? endAngle : startAngle),
          r: midRadius,
          large: ( endAngle - startAngle > Math.PI ) ? 1 : 0,
          sweep: reverse ? 0 : 1,
          x1: midRadius * Math.cos(reverse ? startAngle : endAngle),
          y1: midRadius * Math.sin(reverse ? startAngle : endAngle)
        };

        var arcPath = "M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}";
        return _.template(arcPath, arcData);
      }

    },

    directives: {

      //val is considered to be in pixels
      'radius-inner': function (val) {
        val = Number.isInteger(val) ? val : parseInt(this.expression, 10);

        if (Number.isNaN(val) || val < 0)
          throw "v-inner-radius need to specify a valid positive integer";

        this.vm.radiusInner = val;
      },

      //val is considered to be in pixels
      'radius-outer': function (val) {
        val = Number.isInteger(val) ? val : parseInt(this.expression, 10);

        if (Number.isNaN(val) || val < 0)
          throw "v-outer-radius need to specify a valid positive integer";

        this.vm.radiusOuter = val;
      },

      'highlight-thickness': function (val) {
        val = Number.isInteger(val) ? val : parseInt(this.expression, 10);

        if (Number.isNaN(val) || val < 0)
          throw "v-highlight-thickness need to specify a valid positive integer";

        this.vm.highlightThickness = val;
      },

      'highlight-distance': function (val) {
        val = Number.isInteger(val) ? val : parseInt(this.expression, 10);

        if (Number.isNaN(val) || val < 0)
          throw "v-highlight-distance need to specify a valid positive integer";

        this.vm.highlightDistance = val;
      }

    },

    methods: {

      updateX: function () {
        var endAngle = this.endAngle,
            startAngle = this.startAngle,
            radiusInner = this.radiusInner,
            radiusOuter = this.radiusOuter;

        this.x = ((endAngle - startAngle) / 2) *
                 (radiusInner + ((radiusOuter - radiusInner) / 2));
      },

      updateY: function () {
        var fontSize = window.getComputedStyle(this.$$.textElement)
            .getPropertyValue('font-size');

        this.dy = parseInt(fontSize, 10) / 3;
      }

    },

    events: {

      'hook:compiled': function() {
        this.$$.textElement = this.$el.querySelector('.node-menu-item-label');
        this.label = this.$$.textElement.textContent.trim();

        console.log(this.$parent);
        this.$parent.buttonVms.push(this);
      },

      'hook:attached': function() {
        this.updateX();
        this.updateY();
      }

    }

  });

  Vue.component('x-radial-menu', {

    inherit: true,

    replace: true,

    template: document.getElementById('radial.menu').innerHTML,

    data: function() {
      return {
        buttonVms: [ ]
      };
    },

    methods: {

      calcButtonAngles: function () {
        var totalLetters = this.buttonVms.reduce(function (sum, vm) {
          return sum + vm.label.length;
        }, 0);

        this.buttonVms.forEach(function (vm, index, buttonVms) {
          vm.startAngle = index ? buttonVms[ index - 1 ].endAngle : 0;
          vm.endAngle = vm.startAngle + ( vm.label.length / totalLetters ) * TWO_PI;
        });
      }

    },

    events: {

      'hook:compiled': function() {
        this.calcButtonAngles();
      }

    }

  });

  Vue.component('x-node-data', {

    data: function () {
      return {
        nodeData: { },
        key: '',
        value: '',
        valueHasError: false,
        keyHasError: false,
        addProperty: false
      };
    },

    computed: {

      nodeDataList: function () {
        return _.map(this.nodeData, function (v, k) {
          return { key: k, value: v };
        });
      }

    },

    methods: {

      savePropertyHandler: function () {
        var self = this;

        if (!self.key || !self.value) {
          self.keyHasError = !self.key;
          self.valueHasError = !self.value;
          return;
        }

        if (!self.nodeData.data) {
          self.nodeData.data = { };
        }

        self.nodeData.data[ self.key ] = self.value;
        self.addProperty = false;

        Node.update(self.nodeData.data)
            .then(function(node) {
              self.nodeData.data = node;
            });
      }

    },

    events: {

      'hook:created': function () {
        this.nodeData = this.$parent.nodeData;
      }

    }

  });

  Vue.component('x-node-create', {

    data: function () {
      return {
        key: "",
        value: "",
        valueHasError: false,
        keyHasError: false,
        data: null
      };
    },

    methods: {

      addPropertyHandler: function () {
        var self = this;

        if (!self.key || !self.value) {
          self.keyHasError = !self.key;
          self.valueHasError = !self.value;
          return;
        }

        var data = self.data || { };
        data[ self.key ] = self.value;
        self.data = data;
      },

      createNodeHandler: function () {
        var self = this;

        Node.save(self.data)
            .then(function(node) {
              self.$parent.nodes.push(node);

              self.key = "";
              self.value = "";
              self.data = null;
              self.keyHasError = false;
              self.valueHasError = false;
              self.$parent.displayNodeCreate = false;
            });
      }

    }

  });

});