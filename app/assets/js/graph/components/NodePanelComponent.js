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

  return Vue.extend({

    template: document.getElementById('node.panel').innerHTML,

    props: {
      hypergraphID: {
        required: true,
        type: String
      },
      dataSyncState: {
        required: true,
        type: String
      },
      node: {
        required: true
      }
    },

    data: function() {
      return {
        padding: 0,

        nodeHasChanges: false,

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

      initializeNodeData: function(node) {
        if (!node._data) {
          node._data = {};
          node._data.name = node.data.name;
          node._data.properties = _.cloneDeep(node.data.properties);
        }
      },

      cancelEdits: function() {
        this.node.data.name = this.node._data.name;
        this.node.data.properties = _.cloneDeep(this.node._data.properties);
      },

      setStateForNodeNoLongerShownInPanel: function(node) {
        node.isNodeInfoDisplayed = false;

        if (node.isNew) {
          node.markedForDeletion = true;
        }
      },

      closePanel: function() {
        this.setStateForNodeNoLongerShownInPanel(this.node);
        this.node = null;
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

      doesNodeHaveChanges: function(node) {
        if (!node._data) {
          return false;
        }
        else {
          return !_.isEqual(node._data.properties, _.cloneDeep(node.data.properties)) ||
              node.data.name !== node._data.name;
        }
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
        }
      },

      removeTag: function(indexOfTag) {
        this.node.data.properties.tags.$remove(indexOfTag);
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
        }
      },

      updateLink: function(link) {
        link.editing_ = false;

        if (link.length > 255 || !util.validateLink(link.value)) {
          link.value = link.cachedValue_;
        }
        else {
          link.cachedValue_ = link.value;
        }
      },

      removeLink: function(indexOfLink, e) {
        this.node.data.properties.links.$remove(indexOfLink);
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
        }
      },

      updateEmail: function(email) {
        email.editing_ = false;

        if (email.length > 255 || !util.validateEmail(email.value)) {
          email.value = email.cachedValue_;
        }
        else {
          email.cachedValue_ = email.value;
        }
      },

      removeEmail: function(indexOfEmail, e) {
        this.node.data.properties.emails.$remove(indexOfEmail);
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
        }
      },

      updatePhoneNumber: function(phoneNumber) {
        phoneNumber.editing_ = false;

        if (!util.validatePhoneNumber(phoneNumber.value)) {
          phoneNumber.value = phoneNumber.cachedValue_;
        }
        else {
          phoneNumber.cachedValue_ = phoneNumber.value;
        }
      },

      removePhoneNumber: function(indexOfPhoneNumber, e) {
        this.node.data.properties.phoneNumbers.$remove(indexOfPhoneNumber);
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

              node.isNodeInfoDisplayed = true;

              // reset data now
              self.node = node;
              self.$parent.nodes.push(node);
              self.dataSyncState = 'SAVED';
              self.initializeNodeData(self.node);
            });

        this.dataSyncState = 'SAVING';
      },

      updateNode: function() {
        var self = this;

        NodeDAO.update(this.hypergraphID, [ this.node ])
            .done(function(nodes) {
              var node = nodes[0];

              self.dataSyncState = 'SAVED';
              _.merge(self.node, node);
              self.node._data.name = node.data.name;
              self.node._data.properties = _.cloneDeep(node.data.properties);
            });

        this.dataSyncState = 'SAVING';
      }

    },

    watch: {

      'node': function(newNodeVal, oldNodeVal) {
        if (oldNodeVal) {
          this.setStateForNodeNoLongerShownInPanel(oldNodeVal);
        }

        newNodeVal.isNodeInfoDisplayed = true;

        this.initializeNodeData(newNodeVal);

        if (newNodeVal.isNew) {
          this.editName();
        }
        else {
          this.$$.nameInput.blur();
        }
      },

      'node.data.properties': {
        handler: function() {
          this.nodeHasChanges = this.doesNodeHaveChanges(this.node);
        },
        deep: true
      },

      'node.data.name': function() {
        this.nodeHasChanges = this.doesNodeHaveChanges(this.node);
      },

      'node.markedForDeletion': function(markedForDeletion) {
        if (markedForDeletion) {
          this.closePanel();
        }
      }

    },

    created: function() {
      this.initializeNodeData(this.node);
      this.node.isNodeInfoDisplayed = true;
      this.nodeHasChanges = this.doesNodeHaveChanges(this.node);
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
        self.closePanel();
      });
    },

    beforeDestroy: function() {
      Mousetrap.unbind('esc');
      window.removeEventListener('resize', this.$updateDimensionsAndPosition);
    }

  });

});
