define([
    'shared/util'
], function(
    util
) {
  var NodeDAO = {};

  NodeDAO.parseJSON = function (datum) {
    var clientDisplay = datum.data.clientDisplay;

    datum.markedForDeletion = datum.markedForDeletion || false;

    datum.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    datum.y = clientDisplay ? (clientDisplay.y || 0) : 0;

    datum.px = datum.x ;
    datum.py = datum.y ;

    datum.fixed = clientDisplay ? (clientDisplay.fixed || false) : false;

    datum.isNew = datum.isNew || false;
    datum.hasChanges = datum.hasChanges || false;

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
      y: node.y,
      fixed: node.fixed
    };

    var properties = {};

    properties.tags = (node.data.properties.tags || []).map(function(tag) {
      return { value: tag.value };
    });

    properties.links = (node.data.properties.links || []).map(function(link) {
      return { value: link.value };
    });

    properties.emails = (node.data.properties.emails || []).map(function(email) {
      return { value: email.value };
    });

    properties.phoneNumbers = (node.data.properties.phoneNumbers || []).map(function(phoneNumber) {
      return { value: phoneNumber.value };
    });

    json.data.properties = properties;

    return json;
  };

  NodeDAO.fetchAll = function (hypergraphID) {
    var xhr = util.getJSON('/hypergraph/' + hypergraphID + '/hypernode/all')
        .then(function (response) {
          return _.map(response, NodeDAO.parseJSON);
        });

    return xhr;
  };

  NodeDAO.update = function(hypergraphID, nodes) {
    var nodesJson = _.map(nodes, function (node) {
      return NodeDAO.toJSON(node);
    });

    return util
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
    return util
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
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode/' + node.id,
          type: 'DELETE'
        });
  };

  return NodeDAO;
});
