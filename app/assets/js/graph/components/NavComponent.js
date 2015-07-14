define([
    'vue',
    'shared/daos/HypergraphDAO'
], function(Vue, HypergraphDAO) {
  'use strict';

  var NavComponent = Vue.extend({

    template: '#nav',

    props: {
      dataState: {
        type: String,
        required: true
      },
      graph: {
        type: Object,
        required: true
      },
      onSave: {
        type: Function,
        required: true
      }
    },

    data: function() {
      return {
        cachedGraphName: '',
        editingGraphName: false
      };
    },

    computed: {

      dataStateDisplayValue: function() {
        switch(this.dataState) {
          case 'UNSAVED': return 'Save';
          case 'SAVING': return 'Saving';
          case 'SAVED': return 'Saved';
        }
      },

      dataStateCssClassValue: function() {
        return this.dataState.toLowerCase();
      }

    },

    methods: {

      editGraphName: function() {
        this.editingGraphName = true;
        this.cachedGraphName = this.graph.data.name;

        var $graphNameInput = this.$$.graphNameInput;

        Vue.nextTick(function() {
          $graphNameInput.focus();
          $graphNameInput.setSelectionRange(0, $graphNameInput.value.length);
        });
      },

      updateGraphName: function() {
        if (!this.graph.data.name || this.graph.data.name.length > 255) {
          this.graph.data.name = this.cachedGraphName;
        }
        else if (this.graph.data.name !== this.cachedGraphName) {
          var self = this;
          self.dataState = 'SAVING';

          HypergraphDAO
              .update(this.graph)
              .done(function(graph) {
                self.graph = graph;
                self.dataState = 'SAVED';
              });
        }

        this.editingGraphName = false;
      },

      cancelGraphNameUpdate: function() {
        this.editingGraphName = false;
        this.graphName = this.cachedGraphName;
      }

    },

    created: function() {
      this.cachedGraphName = this.graphName;
    }

  });

  return NavComponent;

});
