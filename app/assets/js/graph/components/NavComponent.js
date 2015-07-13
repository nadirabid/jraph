define([
    'vue'
], function(Vue) {
  'use strict';

  var NavComponent = Vue.extend({

    template: '#nav',

    props: {
      dataState: {
        type: String,
        required: true
      }
    },

    data: function() {
      return {
        graphName: 'People I Know',
        editingGraphName: false
      };
    },

    methods: {
      editGraphName: function() {
        this.editingGraphName = true;

        var $graphNameInput = this.$$.graphNameInput;

        Vue.nextTick(function() {
          $graphNameInput.focus();
          $graphNameInput.setSelectionRange(0, $graphNameInput.value.length);
        });
      },

      updateGraphName: function() {
        this.editingGraphName = false;
      },

      cancelGraphNameUpdate: function() {
        this.editingGraphName = false;
      }

    }

  });

  return NavComponent;

});
