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

    template: '#node.panel',

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
        phoneNumberInputValue: '',
        validationError: {
          tags: false,
          links: false,
          emails: false,
          phoneNumbers: false
        }
      };
    },

    methods: {

      addTag: function() {
        if (this.tagInputValue.length > 255) {
          this.validationError.tags = true;
        }
        else {
          this.node.data.properties.tags.push(new PropValue(this.tagInputValue));
          this.tagInputValue = '';
          this.validationError.tags = false;
        }
      },

      removeTag: function(tag) {
        var indexOfTag = this.node.data.properties.tags.indexOf(tag);
        this.node.data.properties.tags.$remove(indexOfTag);
      },

      addLink: function() {
        if (this.linkInputValue.length > 255) {
          this.validationError.links = true;
        }
        else if (!util.validateLink(this.linkInputValue)) {
          this.validationError.links = true;
        }
        else {
          this.node.data.properties.links.push(new PropValue(this.linkInputValue));
          this.linkInputValue = '';
          this.validationError.links = false;
        }
      },

      addEmail: function() {
        if (this.emailInputValue.length > 255) {
          this.validationError.emails = true;
        }
        else if (!util.validateEmail(this.emailInputValue)) {
          this.validationError.emails = true;
        }
        else {
          this.node.data.properties.emails.push(new PropValue(this.emailInputValue));
          this.emailInputValue = '';
          this.validationError.emails = false;
        }
      },

      addPhoneNumber: function() {
        if (this.phoneNumberInputValue.length > 255) {
          this.validationError.phoneNumbers = true;
        }
        else if (!util.validatePhoneNumber(this.phoneNumberInputValue)) {
          this.validationError.phoneNumbers = true;
        }
        else {
          this.node.data.properties.phoneNumbers.push(new PropValue(this.phoneNumberInputValue));
          this.phoneNumberInputValue = '';
          this.validationError.phoneNumbers = false;
        }
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
      }

    },

    events: {

      'hook:ready': function() {
        var node = this.node;

        this.nameCache = this.node.data.name;

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
