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
          case 'saved': return 'Saved';
          case 'saving': return 'Saving';
          case 'save': return 'Save';
        }
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
          this.editingGraphName = false;
        }
        else if (this.graph.data.name !== this.cachedGraphName) {
          var self = this;
          self.dataState = 'saving';

          HypergraphDAO
              .update(this.graph)
              .done(function(graph) {
                self.graph = graph;
                self.dataState = 'saved';
              });

          this.editingGraphName = false;
        }
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
