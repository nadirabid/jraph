define([
    'vue',
    'shared/util',
    'shared/daos/NodeDAO'
], function(Vue, util, NodeDAO) {
  'use strict';

  function DummyPropValue(value) {
    this.value = value;
  }

  function DummyProperties() {
    this.tags = [
      new DummyPropValue('country'),
      new DummyPropValue('europe'),
      new DummyPropValue('berlin'),
      new DummyPropValue('democracy'),
      new DummyPropValue('autobahn'),
      new DummyPropValue('engineers')
    ];

    this.links = [
        new DummyPropValue('https://en.wikipedia.org/?title=Germany'),
        new DummyPropValue('http://www.germany.travel/en/index.html'),
        new DummyPropValue('https://www.cia.gov/library/publications/the-world-factbook/geos/gm.html')
    ];

    this.emails = [
        new DummyPropValue('john.doe@email.com'),
        new DummyPropValue('jane.doe@email.com'),
        new DummyPropValue('mr.smith@email.com'),
        new DummyPropValue('mrs.smith@email.com')
    ];

    this.phoneNumbers = [
        new DummyPropValue('(510) 234-2342'),
        new DummyPropValue('(520) 235-2499'),
        new DummyPropValue('(453) 934-5292'),
        new DummyPropValue('(342) 882-7632'),
        new DummyPropValue('(654) 982-2832')
    ];
  }

  function NodeProperty(nodeProperty) {
    this.value = nodeProperty.value;
    this.cachedValue_ = nodeProperty.value;
    this.editing_ = false;
  }

  function NodeProperties(nodeProperties) {
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
        nameCache: '',
        propertiesCache: [],
        tagInputValue: '',
        linkInputValue: '',
        emailInputValue: '',
        phoneNumberInputValue: '',
        nodeProperties: new NodeProperties({}),
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

        if (tagInputValue.length > 255) {
          this.validationError.tags.hasErrors = true;
          this.validationError.tags.message = 'Cannot be more than 255 characters';
          return;
        }

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

        this.node.data.properties.tags.push(new NodeProperty({ value: tagInputValue }));
        this.tagInputValue = '';
        this.validationError.tags.hasErrors = false;
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
          this.validationError.links.message = 'Link should look something like: http://www.analyte.io';
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
      },

      removeLink: function(indexOfLink) {
        this.node.data.properties.links.$remove(indexOfLink);
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
      },

      removeEmail: function(indexOfEmail) {
        this.node.data.properties.emails.$remove(indexOfEmail);
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
      },

      removePhoneNumber: function(indexOfPhoneNumber) {
        this.node.data.properties.phoneNumbers.$remove(indexOfPhoneNumber);
      },

      /**
       *
       * Methods to handle updates to node name
       *
       */

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
          this.$add('node.data', { properties: new DummyProperties() });
        }
        else if (this.node.data.properties.constructor != NodeProperties) {
          this.$set('node.data.properties', new DummyProperties()); // temp
        }

        // parse if the node properties haven't already
        // been parsed as NodeProperties
        if (this.node.data.properties.constructor != NodeProperties) {
          this.node.data.properties = new NodeProperties(this.node.data.properties);
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
