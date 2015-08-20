define([
    'vue',
    'lodash',
    'jquery',
    'shared/util',
    'shared/daos/NodeDAO'
], function(Vue, _, $, util, NodeDAO) {
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

  return Vue.extend({

    template: document.getElementById('node.panel').innerHTML,

    props: {
      'hypergraphID': {
        required: true,
        type: String
      },
      'node': {
        required: true,
        type: Object
      }
    },

    data: function() {
      return {
        padding: 0,

        saving:false,

        editingNodeName: false,
        nodeNameCache: '',

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

      doesNodeHaveUnsavedChanges: function() {
        return !_.isEqual(this.node._savedProperties, this.node.data.properties) ||
            this.node.data.name !== this.node._savedName;
      },

      closePanel: function() {
        this.$parent.nodeInfoToDisplay = null;
      },

      updateDimensionsAndPosition: function() {
        var padding = this.padding;
        var windowHeight = $(window).outerHeight();
        var navHeight = $('nav').outerHeight();

        var self = this;

        Vue.nextTick(function () {
          $(self.$el).css({
            top: padding + 'px',
            left: padding + 'px'
          });

          $(self.$el).outerHeight(
              windowHeight - (2 * padding) - navHeight
          );

          $(self.$$.panelContent).outerHeight(
              $(self.$el).innerHeight() - (2 * padding)
          );
        });
      },

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

          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      removeTag: function(indexOfTag) {
        this.node.data.properties.tags.$remove(indexOfTag);
        this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
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
          this.validationError.links.message = 'Link should look something like: http://www.jraph.io';
        }
        else {
          this.node.data.properties.links.push(new NodeProperty({ value: linkInputValue }));
          this.linkInputValue = '';
          this.validationError.links.hasErrors = false;

          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      updateLink: function(link) {
        link.editing_ = false;

        if (link.length > 255 || !util.validateLink(link.value)) {
          link.value = link.cachedValue_;
        }
        else {
          link.cachedValue_ = link.value;
          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      removeLink: function(indexOfLink, e) {
        this.node.data.properties.links.$remove(indexOfLink);
        this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        e.stopPropagation();
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

          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      updateEmail: function(email) {
        email.editing_ = false;

        if (email.length > 255 || !util.validateEmail(email.value)) {
          email.value = email.cachedValue_;
        }
        else {
          email.cachedValue_ = email.value;
          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      removeEmail: function(indexOfEmail, e) {
        this.node.data.properties.emails.$remove(indexOfEmail);
        this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        e.stopPropagation();
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
          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      updatePhoneNumber: function(phoneNumber) {
        phoneNumber.editing_ = false;

        if (!util.validatePhoneNumber(phoneNumber.value)) {
          phoneNumber.value = phoneNumber.cachedValue_;
        }
        else {
          phoneNumber.cachedValue_ = phoneNumber.value;
          this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        }
      },

      removePhoneNumber: function(indexOfPhoneNumber, e) {
        this.node.data.properties.phoneNumbers.$remove(indexOfPhoneNumber);
        this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        e.stopPropagation();
      },

      /**
       *
       * Methods to handle updates to node name
       *
       */

      editName: function() {
        this.editingNodeName = true;
        this.nodeNameCache = this.node.data.name;

        var $nameInput = this.$$.nameInput;

        Vue.nextTick(function() {
          $nameInput.focus();
          $nameInput.setSelectionRange(0, $nameInput.value.length);
        });
      },

      updateName: function() {
        if (!this.editingNodeName) { //blur is called redundantly after 'enter' and 'esc' action
          return;
        }

        if (!this.node.data.name || this.node.data.name.length > 255) {
          this.node.data.name = this.nodeNameCache;
        }

        this.node.hasChanges = this.doesNodeHaveUnsavedChanges();
        this.editingNodeName = false;
      },

      cancelNameUpdate: function() {
        this.editingNodeName = false;
        this.node.data.name = this.nodeNameCache;
      },

      /**
       *
       * Methods to create and save the node
       *
       */

      createNode: function() {
        var self = this;

        NodeDAO.create(this.hypergraphID, this.node)
            .done(function(node) {
              self.node.markedForDeletion = true; // mark temp node as markedForDeletion

              // reset data now
              self.node = node;
              self.$parent.nodes.push(node);
              self.saving = false;
              self.initializeData();
              self.$emit('removeGhostNode');
            });

        this.saving = true;
      },

      saveNode: function() {
        var self = this;

        NodeDAO.update(this.hypergraphID, [ this.node ])
            .done(function(nodes) {
              var node = nodes[0];

              self.saving = false;
              self.node = node;
              self.node._savedName = node.data.name;
              self.node._savedProperties = new NodeProperties(_.cloneDeep(node.data.properties));
            });

        this.saving = true;
      },

      cancelEdits: function() {
        this.node.data.name = this.node._savedName;
        this.node.data.properties = new NodeProperties(_.cloneDeep(this.node._savedProperties));

        this.node.hasChanges = false;
      },

      initializeData: function() {
        var node = this.node;

        node.isNodeInfoDisplayed = true;

        if (!node.data) {
          this.$add('node.data', { properties: new NodeProperties() });
        }
        else if (!node.data.properties) {
          this.$add('node.data.properties', new NodeProperties());
        }
        else if (node.data.properties.constructor != NodeProperties) {
          this.$set('node.data.properties', new NodeProperties(node.data.properties));
        }

        if (!this.node._savedName) {
          this.node._savedName = this.node.data.name;
        }

        if (!this.node._savedProperties) {
          this.node._savedProperties = new NodeProperties(_.cloneDeep(node.data.properties));
        }
      }

    },

    watch: {
      'node': function(newNodeVal, oldNodeVal) {
        if (oldNodeVal) {
          oldNodeVal.isNodeInfoDisplayed = false;
        }

        this.initializeData();

        if (this.node.isNew) {
          this.editName();
        }
        else {
          this.$$.nameInput.blur();
        }
      }
    },

    created: function() {
      this.initializeData();
    },

    ready: function() {
      this.$updateDimensionsAndPosition = this.updateDimensionsAndPosition.bind(this);
      window.addEventListener('resize', this.$updateDimensionsAndPosition);
      this.updateDimensionsAndPosition();

      if (this.node.isNew) {
        this.editName();
      }

      var self = this;

      Mousetrap.bind('esc', function() {
        self.$parent.nodeInfoToDisplay = null;
      });

      this.$watch('node.markedForDeletion', function(markedForDeletion) {
        if (markedForDeletion === true) {
          self.$parent.nodeInfoToDisplay = null;
        }
      });

      if (this.node.markedForDeletion) {
        this.$parent.nodeInfoToDisplay = null;
      }
    },

    beforeDestroy: function() {
      Mousetrap.unbind('esc');
      window.removeEventListener('resize', this.$updateDimensionsAndPosition);

      this.node.isNodeInfoDisplayed = false;

      if (this.node.isNew) {
        this.node.markedForDeletion = true;
      }
    }

  });

});
