define([
    'util'
], function(util) {
  'use strict';

  //
  // Link Model
  //

  /*
     Link: {
       sourceId: UUID,
       targetId: UUID,
       data: {}
     }
   */

  var Link = {};

  Link.parseJSON = function (datum) {
    return datum;
  };

  Link.toJSON = function(link) {
    return link;
  };

  Link.create = function(hypergraphID, link) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify(Link.toJSON(link))
        })
        .then(function(response) {
          return Link.parseJSON(response);
        });
  };

  Link.delete = function(hypergraphID, link) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink/' + link.id,
          type: 'DELETE'
        });
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

  //
  // Node Model
  //

  var Node = {};

  Node.parseJSON = function (datum) {
    var clientDisplay = datum.data.clientDisplay;

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
    var xhr = util.getJSON('/hypergraph/' + hypergraphID + '/hypernode/all')
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

  Node.create = function(hypergraphID, node) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: Node.toJSON(node).data
          })
        })
        .then(function(response) {
          return Node.parseJSON(response);
        });
  };

  Node.delete = function(hypergraphID, node) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hypernode/' + node.id,
          type: 'DELETE'
        });
  };

  //
  // Hypergraph Model
  //

  var Hypergraph = {};

  Hypergraph.parseJSON = function(datum) {
    return datum;
  };

  Hypergraph.toJSON = function(hypergraph) {
    return hypergraph;
  };

  Hypergraph.create = function(hypergraph) {
    return util
        .ajax({
          url: '/hypergraph',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: Hypergraph.toJSON(hypergraph).data
          })
        })
        .then(function(response) {
          return Hypergraph.parseJSON(response);
        });
  };

  Hypergraph.update = function(hypergraph) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraph.id,
          type: 'PUT',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: hypergraph.data
          })
        });
  };

  Hypergraph.fetch = function(hypergraphID) {
    return util.getJSON('/hypergraph/' + hypergraphID);
  };

  return {
    Hypergraph: Hypergraph,
    Node: Node,
    Link: Link
  };
});