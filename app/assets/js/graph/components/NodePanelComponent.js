define([
    'vue',
    'lodash',
    'shared/util',
    'shared/daos/NodeDAO'
], function(Vue, _, util, NodeDAO) {
  'use strict';

  function NodeProperty(nodeProperty) {
    this.value = nodeProperty.value;
    this.cachedValue_ = nodeProperty.value;
    this.editing_ = false;
  }

  function NodeProperties(nodeProperties) {
    if (!nodeProperties || nodeProperties.constructor == Array) {
      nodeProperties = Object.create(null);
    }

    var tags = nodeProperties.tags || [];
    this.tags = tags.map(function(tag) {
      return new NodeProperty(tag);
    });

    var links = nodeProperties.links || [];
    this.links = links.map(function(link) {
      return new NodeProperty(link);
    });

    var emails = nodeProperties.emails || [];
    this.emails = emails.map(function(email) {
      return new NodeProperty(email);
    });

    var phoneNumbers = nodeProperties.phoneNumbers || [];
    this.phoneNumbers = phoneNumbers.map(function(phoneNumber) {
      return new NodeProperty(phoneNumber);
    });
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
        nodeNameCache: '',
        propertiesCache: [],
        tagInputValue: '',
        linkInputValue: '',
        emailInputValue: '',
        phoneNumberInputValue: '',
        validationError: {
          tags: {
            hasErrors: false,
            message: ''
          },
          links: {
            hasErrors: false,
            message: ''
          },
          emails: {
            hasErrors: false,
            message: ''
          },
          phoneNumbers: {
            hasErrors: false,
            message: ''
          }
        }
      };
    },

    methods: {

      /**
       *
       * Methods to handle updates for tag properties
       *
       */

      addTag: function() {
        var tagInputValue = this.tagInputValue.toLowerCase();

        if (tagInputValue.length === 0) {
          return;
        }

        var isDuplicate = this.node.data.properties.tags.some(function(tag) {
          return tag.value.toLowerCase() == tagInputValue;
        });

        if (isDuplicate) {
          this.tagInputValue = '';
          return;
        }

        if (tagInputValue.length > 255) {
          this.validationError.tags.hasErrors = true;
          this.validationError.tags.message = 'Cannot be more than 255 characters';
        }
        else {
          this.node.data.properties.tags.push(new NodeProperty({ value: tagInputValue }));
          this.tagInputValue = '';
          this.validationError.tags.hasErrors = false;

          this.hasChanges = !_.isEqual(this._originalNodeProperties.tags, this.node.data.properties.tags);
        }
      },

      removeTag: function(indexOfTag) {
        this.node.data.properties.tags.$remove(indexOfTag);
        this.hasChanges = !_.isEqual(this._originalNodeProperties.tags, this.node.data.properties.tags);
      },

      /**
       *
       * General methods used for emails, phoneNumbers, links (not tags)
       *
       */

      editProperty: function(viewModel, property) {
        property.cachedValue_ = property.value;
        property.editing_ = true;

        var $inputEl = viewModel.$$.input;
        Vue.nextTick(function() {
          $inputEl.focus();
          $inputEl.setSelectionRange(0, $inputEl.value.length);
        });
      },

      cancelEditingProperty: function(property) {
        property.value = property.cachedValue_;
        property.editing_ = false;
      },

      /**
       *
       * Methods specifically for link properties
       *
       */

      addLink: function() {
        var linkInputValue = this.linkInputValue;

        var isDuplicate = this.node.data.properties.links.some(function(link) {
          return linkInputValue == link.value;
        });

        if (isDuplicate) {
          this.linkInputValue = '';
          return;
        }

        if (linkInputValue.length > 255) {
          this.validationError.links.hasErrors = true;
          this.validationError.links.message = 'Cannot be more than 255 characters';
        }
        else if (!util.validateLink(linkInputValue)) {
          this.validationError.links.hasErrors = true;
          this.validationError.links.message = 'Link should look something like: http://www.analyte.io';
        }
        else {
          this.node.data.properties.links.push(new NodeProperty({ value: linkInputValue }));
          this.linkInputValue = '';
          this.validationError.links.hasErrors = false;

          this.hasChanges = !_.isEqual(this._originalNodeProperties.links, this.node.data.properties.links);
        }
      },

      updateLink: function(link) {
        link.editing_ = false;

        if (link.length > 255 || !util.validateLink(link.value)) {
          link.value = link.cachedValue_;
        }
        else {
          link.cachedValue_ = link.value;
          this.hasChanges = !_.isEqual(this._originalNodeProperties.links, this.node.data.properties.links);
        }
      },

      removeLink: function(indexOfLink) {
        this.node.data.properties.links.$remove(indexOfLink);
        this.hasChanges = !_.isEqual(this._originalNodeProperties.links, this.node.data.properties.links);
      },

      /**
       *
       * Methods specifically for email properties
       *
       */

      addEmail: function() {
        var emailInputValue = this.emailInputValue;
        var isDuplicate = this.node.data.properties.emails.some(function(email) {
          return emailInputValue == email.value;
        });

        if (isDuplicate) {
          this.emailInputValue = '';
          return;
        }

        if (this.emailInputValue.length > 255) {
          this.validationError.emails.hasErrors = true;
          this.validationError.emails.message = 'Cannot be more than 255 characters';
        }
        else if (!util.validateEmail(this.emailInputValue)) {
          this.validationError.emails.hasErrors = true;
          this.validationError.emails.message = "We know you know we know that's not a correct email";
        }
        else {
          this.node.data.properties.emails.push(new NodeProperty({ value: this.emailInputValue }));
          this.emailInputValue = '';
          this.validationError.emails.hasErrors = false;

          this.hasChanges = !_.isEqual(this._originalNodeProperties.emails, this.node.data.properties.emails);
        }
      },

      updateEmail: function(email) {
        email.editing_ = false;

        if (email.length > 255 || !util.validateEmail(email.value)) {
          email.value = email.cachedValue_;
        }
        else {
          email.cachedValue_ = email.value;
          this.hasChanges = !_.isEqual(this._originalNodeProperties.emails, this.node.data.properties.emails);
        }
      },

      removeEmail: function(indexOfEmail) {
        this.node.data.properties.emails.$remove(indexOfEmail);
        this.hasChanges = !_.isEqual(this._originalNodeProperties.emails, this.node.data.properties.emails);
      },

      /**
       *
       * Methods specifically to handle updates to phoneNumber properties
       *
       */

      addPhoneNumber: function() {
        if (!util.validatePhoneNumber(this.phoneNumberInputValue)) {
          this.validationError.phoneNumbers.hasErrors = true;
          this.validationError.phoneNumbers.message = 'Phone number should have 10 digits';
        }
        else {
          this.node.data.properties.phoneNumbers.push(new NodeProperty({ value: this.phoneNumberInputValue }));
          this.phoneNumberInputValue = '';
          this.validationError.phoneNumbers.hasErrors = false;
          this.hasChanges = !_.isEqual(this._originalNodeProperties.phoneNumbers, this.node.data.properties.phoneNumbers);
        }
      },

      updatePhoneNumber: function(phoneNumber) {
        phoneNumber.editing_ = false;

        if (!util.validatePhoneNumber(phoneNumber.value)) {
          phoneNumber.value = phoneNumber.cachedValue_;
        }
        else {
          phoneNumber.cachedValue_ = phoneNumber.value;
          this.hasChanges = !_.isEqual(this._originalNodeProperties.phoneNumbers, this.node.data.properties.phoneNumbers);
        }
      },

      removePhoneNumber: function(indexOfPhoneNumber) {
        this.node.data.properties.phoneNumbers.$remove(indexOfPhoneNumber);
        this.hasChanges = !_.isEqual(this._originalNodeProperties.phoneNumbers, this.node.data.properties.phoneNumbers);
      },

      /**
       *
       * Methods to handle updates to node name
       *
       */

      editName: function() {
        this.editingName = true;
        this.nodeNameCache = this.node.data.name;

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
          this.node.data.name = this.nodeNameCache;
        }

        this.hasChanges = this.node.data.name !== this._originalNodeName;
        this.editingName = false;
      },

      cancelNameUpdate: function() {
        this.editingName = false;
        this.node.data.name = this.nodeNameCache;
      },

      /**
       *
       * Methods to create and save the node
       *
       */

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
            .done(function(nodes) {
              var node = nodes[0];

              self.hasChanges = false;
              self.saving = false;
              self._originalNodeName = node.data.name;
              self._originalNodeProperties = new NodeProperties(_.cloneDeep(node.data.properties));
            });

        this.saving = true;
      },

      cancelEdits: function() {
        this.node.data.name = this._originalNodeName;
        this.node.data.properties = new NodeProperties(_.cloneDeep(this._originalNodeProperties));

        this.hasChanges = false;
      }

    },

    events: {

      'hook:ready': function() {
        var node = this.node;

        if (!node.data) {
          this.$add('node.data', { properties: new NodeProperties() });
        }
        else if (!node.data.properties) {
          this.$add('node.data.properties', new NodeProperties());
        }
        else if (node.data.properties.constructor != NodeProperties) {
          this.$set('node.data.properties', new NodeProperties(node.data.properties));
        }

        this._originalNodeName = this.node.data.name;
        this._originalNodeProperties = new NodeProperties(_.cloneDeep(node.data.properties));

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
        if (this.isNew) {
          this.$emit('removeGhostNode');
        }
      }

    }

  });

  return NodePanelComponent;
});
