define([
    'vue',
    'jquery',
    'mousetrap'
], function(Vue, $, Mousetrap) {
  'use strict';

  var FloatingPanelBarComponent = Vue.extend({

    data: {
      padding: 0 // 0 means no space (so not floating)
    },

    methods: {

      updateDimensionsAndPosition: function() {
        var padding = this.padding;
        var windowHeight = $(window).outerHeight();

        var self = this;

        Vue.nextTick(function() {
          $(self.$el).css({
            top: padding + 'px',
            left: padding + 'px'
          });

          $(self.$el).outerHeight(
              windowHeight - (2*padding)
          );

          $(self.$$.panelContent).outerHeight(
              $(self.$el).innerHeight() - (2*padding)
          );
        });
      },

      show: function() {
        this.$el.classList.remove('hidden');
        this.updateDimensionsAndPosition();
      },

      hide: function() {
        this.$el.classList.add('hidden');
        this.updateDimensionsAndPosition();
      },

      closePanel: function() {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          delete this.$.currentPanel;
          this.hide();

          Mousetrap.unbind('esc');
        }
      },

      setPanel: function(panel) {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          delete this.$.currentPanel;
        }

        var self = this;

        Mousetrap.bind('esc', function() {
          self.closePanel();
        });

        this.show();

        this.$.currentPanel = panel;
        panel.$mount();
        panel.$appendTo(this.$$.panelContent);
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

  return FloatingPanelBarComponent;

});