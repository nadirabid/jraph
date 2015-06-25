define([
    'vue',
    'shared/util',
    'shared/daos/NodeDAO'
], function(Vue, util, NodeDAO) {
  'use strict';

  function PropValue(value) {
    this.value = value;
  }

  function Properties() {
    this.tags = [
      new PropValue('country'),
      new PropValue('europe'),
      new PropValue('berlin'),
      new PropValue('democracy'),
      new PropValue('autobahn'),
      new PropValue('engineers')
    ];

    this.links = [
        new PropValue('https://en.wikipedia.org/?title=Germany'),
        new PropValue('http://www.germany.travel/en/index.html'),
        new PropValue('https://www.cia.gov/library/publications/the-world-factbook/geos/gm.html')
    ];

    this.emails = [
        new PropValue('john.doe@email.com'),
        new PropValue('jane.doe@email.com'),
        new PropValue('mr.smith@email.com'),
        new PropValue('mrs.smith@email.com')
    ];

    this.phoneNumbers = [
        new PropValue('(510) 234-2342'),
        new PropValue('(520) 235-2499'),
        new PropValue('(453) 934-5292'),
        new PropValue('(342) 882-7632'),
        new PropValue('(654) 982-2832')
    ];
  }

  var NodePanelComponent = Vue.extend({

    replace: true,

    template: '#node.panel2',

    hypergraphID: null,

    graphComponent: null,

    floatingPanelBar: null,

    data: function() {
      return {
        saving:false,
        isNew: false,
        hasChanges: false,
        editingName: false,
        nameCache: '',
        propertiesCache: [],
        tagInputValue: '',
        linkInputValue: '',
        emailInputValue: '',
        phoneNumberInputValue: ''
      };
    },

    methods: {

      addTag: function() {
        if (this.tagInputValue.length > 255) {
          this.$$.tagInput.classList.add('has-error');
        }
        else {
          this.node.data.properties.tags.push(new PropValue(this.tagInputValue));
          this.$$.tagInput.classList.remove('has-error');
          this.tagInputValue = '';
        }
      },

      removeTag: function(tag) {
        var indexOfTag = this.node.data.properties.tags.indexOf(tag);
        this.node.data.properties.tags.$remove(indexOfTag);
      },

      addLink: function() {
        if (this.linkInputValue.length > 255) {
          this.$$.linkInput.classList.add('has-error');
        }
        else if (!util.validateLink(this.linkInputValue)) {
          this.$$.linkInput.classList.add('has-error');
        }
        else {
          this.node.data.properties.links.push(new PropValue(this.linkInputValue));
          this.linkInputValue = '';
        }
      },

      addEmail: function() {
        if (this.emailInputValue.length > 255) {
          this.$$.emailInput.classList.add('has-error');
        }
        else if (!util.validateEmail(this.emailInputValue)) {
          this.$$.emailInput.classList.add('has-error');
        }
        else {
          this.node.data.properties.emails.push(new PropValue(this.emailInputValue));
          this.emailInputValue = '';
        }
      },

      addPhoneNumber: function() {
        if (this.phoneNumberInputValue.length > 255) {
          this.$$.phoneNumberInput.classList.add('has-error');
        }
        else if (!util.validatePhoneNumber(this.phoneNumberInputValue)) {
          this.$$.phoneNumberInput.classList.add('has-error');
        }
        else {
          this.node.data.properties.phoneNumbers.push(new PropValue(this.phoneNumberInputValue));
          this.phoneNumberInputValue = '';
        }
      },

      validateInputChange: function() {
        var self = this;

        Vue.nextTick(function() {
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

          Vue.nextTick(function() {
            $propertyValueEl.value = '';
            $propertyInputGroupEl.classList.remove('has-error');
          });
        }
        else {
          Vue.nextTick(function() {
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

        NodeDAO.create(this.$options.hypergraphID, this.node)
            .done(function(node) {
              self.$options.graphComponent.nodes.push(node);
              self.saving = false;
              self.hasChanges = false;
              self.isNew = false;
              self.$emit('removeGhostNode');
            });

        this.saving = true;
      },

      saveNode: function() {
        var self = this;

        NodeDAO.update(this.$options.hypergraphID, [ this.node ])
            .done(function(node) {
              self.hasChanges = false;
              self.saving = false;
              //TODO: replace node in nodesAry??
            });

        this.saving = true;
      },

      editName: function() {
        this.editingName = true;
        this.nameCache = this.node.data.name;

        var $nameInput = this.$$.nameInput;

        Vue.nextTick(function() {
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
        var node = this.node;

        this.nameCache = this.node.data.name;
        this.propertiesCache = this.node.data.properties.slice(0);

        if (!node.data) {
          this.$add('node.data', { properties: new Properties() });
        }

        if (!node.data.properties) {
          this.$add('node.data.properties', new Properties());
        }
        else if (node.data.properties.constructor === Array) {
          node.data.properties = new Properties();
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
      },

      'hook:beforeDestroy': function() {
        if (!this.isNew && this.hasChanges) {
          this.node.data.name = this.nameCache;
          this.node.data.properties = this.propertiesCache;
        }

        if (this.isNew) {
          this.$emit('removeGhostNode');
        }
      }

    }

  });

  return NodePanelComponent;
});
