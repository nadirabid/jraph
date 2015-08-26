define([
    'jquery'
], function($) {
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

  var NodeDAO = {};

  NodeDAO.parseJSON = function (datum) {
    var clientDisplay = datum.data.clientDisplay;

    datum.markedForDeletion = datum.markedForDeletion || false;

    datum.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    datum.y = clientDisplay ? (clientDisplay.y || 0) : 0;

    datum.px = datum.x;
    datum.py = datum.y;

    datum.isNew = datum.isNew || false;
    datum.hasChanges = datum.hasChanges || false;

    datum.data.properties = new NodeProperties(datum.data.properties);

    return datum;
  };

  NodeDAO.toJSON = function (node) {
    var json = {
      id: node.id
    };

    json.data = {};

    json.data.name = node.data.name;

    json.data.clientDisplay = {
      x: node.x,
      y: node.y
    };

    var properties = {};

    properties.tags = node.data.properties.tags.map(function(tag) {
      return { value: tag.value };
    });

    properties.links = node.data.properties.links.map(function(link) {
      return { value: link.value };
    });

    properties.emails = node.data.properties.emails.map(function(email) {
      return { value: email.value };
    });

    properties.phoneNumbers = node.data.properties.phoneNumbers.map(function(phoneNumber) {
      return { value: phoneNumber.value };
    });

    json.data.properties = properties;

    return json;
  };

  NodeDAO.fetchAll = function (hypergraphID) {
    var xhr = $.getJSON('/hypergraph/' + hypergraphID + '/hypernode/all')
        .then(function (response) {
          return _.map(response, NodeDAO.parseJSON);
        });

    return xhr;
  };

  NodeDAO.update = function(hypergraphID, nodes) {
    var nodesJson = _.map(nodes, function (node) {
      return NodeDAO.toJSON(node);
    });

    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode',
          type: 'PUT',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: nodesJson })
        })
        .then(function(response) {
          return _.map(response, NodeDAO.parseJSON);
        });
  };

  NodeDAO.create = function(hypergraphID, node) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: NodeDAO.toJSON(node).data
          })
        })
        .then(function(response) {
          return NodeDAO.parseJSON(response);
        });
  };

  NodeDAO.delete = function(hypergraphID, node) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode/' + node.id,
          type: 'DELETE'
        });
  };

  return NodeDAO;
});
