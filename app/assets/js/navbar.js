define([
    'vue',
    'util',
    'models'
], function(Vue, util, models) {
  'use strict';

  var Hypergraph = models.Hypergraph;

  var NavbarComponent = Vue.extend({

    data: function() {

      return {
        editingGraphName: false,
        graphNameCache: '',
        userName: 'Nadir Muzaffar',
        graph: {
          data: {
            name: ''
          }
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
        this.graphNameCache = this.graph.data.name;

        var $graphNameInputEl = this.$$.graphNameInput;
        util.animationFrame(function() {
          $graphNameInputEl.focus();
          $graphNameInputEl.setSelectionRange(0, $graphNameInputEl.value.length);
        });
      },

      updateGraphName: function() {
        if (!this.editingGraphName) { //blur is called redundantly after 'enter' and 'esc' action
          return;
        }

        var self = this;

        if (!this.graph.data.name) {
          this.graph.data.name = this.graphNameCache;
        }
        else {
          Hypergraph
              .update({
                id: this.graph.id,
                data: {
                  name: this.graph.name
                }
              })
              .done(function(hypergraph) {
                self.graph = hypergraph;
              });
        }

        this.editingGraphName = false;
      },

      cancelGraphNameUpdate: function() {
        this.editingGraphName = false;
        this.graph.data.name = this.graphNameCache;
      }

    },

    events: {

      'hook:created': function() {
        var self = this;

        if (this.state.$layout.enabled) {
          this.$add('layout', 'Force Directed');
        }
        else {
          this.$add('layout', 'Static');
        }

        Hypergraph
            .fetch(this.hypergraphID)
            .done(function(hypergraph) {
              self.graph = hypergraph;
            });
      }

    }

  });

  return NavbarComponent;
});