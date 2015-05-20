define([
    'vue',
    'jquery'
], function(Vue) {
  'use strict';

  var FloatingPanelBar = Vue.extend({

    methods: {

      updateDimensionsAndPosition: function() {
        var padding = 12;
        var navHeight = $('#nav').outerHeight();
        var windowHeight = $(window).outerHeight();

        $(this.$el).css({
          top: navHeight + padding + 'px',
          left: padding + 'px'
        });

        $(this.$el).outerHeight(
            windowHeight - navHeight - (2*padding)
        );
      },

      show: function() {
        this.$el.classList.remove('hide');
        this.$el.classList.add('show');
        this.updateDimensionsAndPosition();
      },

      hide: function() {
        this.$el.classList.remove('show');
        this.$el.classList.add('hide');
        this.updateDimensionsAndPosition();
      },

      removePanel: function() {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          delete this.$.currentPanel;
          this.hide();
        }
      },

      setPanel: function(panel) {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          delete this.$.currentPanel;
        }

        this.show();

        this.$.currentPanel = panel;
        panel.$mount();
        panel.$appendTo(this.$el);
      }
    },

    events: {

      'hook:ready': function() {
        this.updateDimensionsAndPosition();
        window.addEventListener(
            'resize',
            this.updateDimensionsAndPosition.bind(this)
        );
      }

    }

  });

  return FloatingPanelBar;

});