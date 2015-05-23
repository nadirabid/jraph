define([
    'shared/util'
], function(
    util
) {
  var NodeDAO = {};

  NodeDAO.parseJSON = function (datum) {
    var clientDisplay = datum.data.clientDisplay;

    datum.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    datum.y = clientDisplay ? (clientDisplay.y || 0) : 0;

    datum.px = datum.x;
    datum.py = datum.y;

    datum.fixed = clientDisplay ? (clientDisplay.fixed || false) : false;

    return datum;
  };

  NodeDAO.toJSON = function (node) {
    var json = { id: node.id };
    json.data = _.clone(node.data) || {};

    json.data.clientDisplay = {
      x: node.x,
      y: node.y,
      fixed: node.fixed
    };

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
