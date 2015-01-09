define([
    'util'
], function(util) {
  // Link Model

  var Link = {};

  Link.parseJSON = function (datum) {
    return datum;
  };

  Link.fetchAll = function (hypergraphID) {
    return util
        .getJSON('/hypergraph/' + hypergraphID + '/hyperlink')
        .then(function (response) {
          return _(response)
              .uniq(function(datum) { return datum.id; })
              .map(Link.parseJSON)
              .value();
        });
  };

  // Node Model

  var Node = {};

  Node.parseJSON = function (datum) {
    var clientDisplay = datum.data.clientDisplay;

    datum.data.properties.push({ "p1": "v1" });

    datum.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    datum.y = clientDisplay ? (clientDisplay.y || 0) : 0;

    datum.px = datum.x;
    datum.py = datum.y;

    datum.fixed = clientDisplay ? (clientDisplay.fixed || false) : false;

    return datum;
  };

  Node.toJSON = function (node) {
    var json = { id: node.id };
    json.data = _.clone(node.data) || {};

    json.data.clientDisplay = {
      x: node.x,
      y: node.y,
      fixed: node.fixed
    };

    return json;
  };

  Node.fetchAll = function (hypergraphID) {
    var xhr = util.getJSON('/hypergraph/' + hypergraphID + '/hypernode')
        .then(function (response) {
          return _.map(response, Node.parseJSON);
        });

    return xhr;
  };

  Node.update = function(hypergraphID, nodes) {
    var nodesJson = _.map(nodes, function (node) {
      return Node.toJSON(node);
    });

    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode',
          type: 'PUT',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: nodesJson })
        })
        .then(function(response) {
          return _.map(response, Node.parseJSON);
        });
  };

  Node.create = function(hypergraphID, data) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({ data: data })
        })
        .then(function(response) {
          return Node.parseJSON(response);
        });
  };

  return {
    Node: Node,
    Link: Link
  };
});