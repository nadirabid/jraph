define([
    'vue',
    'util'
], function(Vue, util) {
  'use strict';

  var NavbarComponent = Vue.extend({

    data: function() {

      return {
        editingGraphName: false,
        graphNameCache: '',
        userName: 'Nadir Muzaffar',
        graph: {
          name: 'Graph'
        }
      };

    },

    methods: {

      setLayout: function(layout) {
        if (this.layout === layout) {
          return;
        }

        var $layout = this.state.$layout;
        this.layout = layout;

        switch(layout) {
          case 'Static':
            $layout.enabled = false;
            break;
          case 'Force Directed':
            $layout.enabled = true;
            break;
        }
      },

      editGraphName: function() {
        this.editingGraphName = true;
        this.graphNameCache = this.graph.name;

        var $graphNameInputEl = this.$$.graphNameInput;
        util.animationFrame(function() {
          $graphNameInputEl.focus();
          $graphNameInputEl.setSelectionRange(0, $graphNameInputEl.value.length);
        });
      },

      updateGraphName: function() {
        if (!this.editingGraphName) return; //blur is called redundantly after 'enter' and 'esc' action

        if (!this.graph.name) {
          this.graph.name = this.graphNameCache;
        }
        else {
          //update hypergraph name
        }

        this.editingGraphName = false;
      },

      cancelGraphNameUpdate: function() {
        this.editingGraphName = false;
        this.graph.name = this.graphNameCache;
      }

    },

    events: {

      'hook:created': function() {
        if (this.state.$layout.enabled) {
          this.$add('layout', 'Force Directed');
        }
        else {
          this.$add('layout', 'Static');
        }
      }

    }

  });

  return NavbarComponent;
});