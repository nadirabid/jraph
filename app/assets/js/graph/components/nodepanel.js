define([
    'vue',
    'util',
    'mousetrap'
], function(Vue, util, Mousetrap) {
  'use strict';

  var NodePanel = Vue.extend({

    replace: true,

    template: '#node.panel',

    hypergraphID: null,

    graphComponent: null,

    floatingPanelBar: null,

    data: function() {
      return {
        isNew: false,
        hasChanges: false,
        editingName: false,
        nameCache: '',
        propertiesCache: []
      };
    },

    computed: {

      propertyGroups: function() {
        return _.groupBy(this.node.data.properties, function(prop) {
          return prop.type;
        });
      }

    },

    methods: {

      closeNodePanel: function() {
        throw 'closeNodePanel method has node been implemented for close functionality';
      },

      validateInputChange: function() {
        var self = this;

        util.animationFrame(function() {
          var $addDropdownBtnEl = self.$$.addDropdownBtn;
          var propertyValue = self.$$.propertyValue.value;

          if (!propertyValue) {
            $addDropdownBtnEl.classList.add('disabled');
          }
          else {
            $addDropdownBtnEl.classList.remove('disabled');
          }
        });
      },

      addProp: function(propertyType) {
        var $propertyInputGroupEl = this.$$.propertyInputGroup;
        var $propertyValueEl = this.$$.propertyValue;

        var validPropertyType = false;

        switch(propertyType) {
          case 'email':
            validPropertyType = util.validateEmail($propertyValueEl.value);
            break;
          case 'phone':
            validPropertyType = util.validatePhoneNumber($propertyValueEl.value);
            break;
          case 'link':
            validPropertyType = util.validateLink($propertyValueEl.value);
            break;
          default:
            validPropertyType = true; //case text
        }

        if (validPropertyType) {
          this.node.data.properties.push({
            value: $propertyValueEl.value,
            type: propertyType
          });

          this.validateInputChange();
          this.hasChanges = true;

          util.animationFrame(function() {
            $propertyValueEl.value = '';
            $propertyInputGroupEl.classList.remove('has-error');
          });
        }
        else {
          util.animationFrame(function() {
            $propertyInputGroupEl.classList.add('has-error');
          });
        }

      },

      removeProp: function(propVm) {
        var propIndex = _.indexOf(this.node.data.properties, propVm.prop);

        if (propIndex < 0) {
          throw "Trying to remove property that apparently doesn't exist.";
        }

        this.node.data.properties.$remove(0);
        this.hasChanges = true;
      },

      createNode: function() {
        var self = this;

        Node.create(this.$options.hypergraphID, this.node)
            .done(function(node) {
              self.hasChanges = false;
              self.isNew = false;
              self.$options.graphComponent.nodes.push(node);
              self.$emit('removeGhostNode');
            });
      },

      saveNode: function() {
        var self = this;

        Node.update(this.$options.hypergraphID, [ this.node ])
            .done(function(node) {
              self.hasChanges = false;
              //TODO: replace node in nodesAry??
            });
      },

      editName: function() {
        this.editingName = true;
        this.nameCache = this.node.data.name;

        var $nameInput = this.$$.nameInput;

        util.animationFrame(function() {
          $nameInput.focus();
          $nameInput.setSelectionRange(0, $nameInput.value.length);
        });
      },

      updateName: function() {
        if (!this.editingName) { //blur is called redundantly after 'enter' and 'esc' action
          return;
        }

        if (!this.node.data.name) {
          this.node.data.name = this.nameCache;
        }
        else if (this.node.data.name !== this.nameCache) {
          this.hasChanges = true;
        }

        this.editingName = false;
      },

      cancelNameUpdate: function() {
        this.editingName = false;
        this.node.data.name = this.nameCache;
      }

    },

    events: {

      'hook:ready': function() {
        var self = this;
        var node = this.node;

        this.nameCache = this.node.data.name;
        this.propertiesCache = this.node.data.properties.slice(0);

        if (!node.data) {
          this.$add('node.data', { properties: [] });
        }

        if (!node.data.properties) {
          this.$add('node.data.properties', []);
        }

        if (this.isNew) {
          this.editName();
        }

        if (!this.$options.hypergraphID) {
          throw 'Option hypergraphID must be set';
        }

        if (!this.$options.graphComponent) {
          throw 'Option graphComponent must be set';
        }

        Mousetrap.bind('esc', function() {
          self.closeNodePanel();
        });
      },

      'hook:beforeDestroy': function() {
        if (!this.isNew && this.hasChanges) {
          this.node.data.name = this.nameCache;
          this.node.data.properties = this.propertiesCache;
        }

        if (this.isNew) {
          this.$emit('removeGhostNode');
        }

        Mousetrap.unbind('esc');
      }

    }

  });

  return NodePanel;
});
