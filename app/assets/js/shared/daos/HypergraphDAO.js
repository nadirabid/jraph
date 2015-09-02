define([
    'jquery'
], function($) {
  var HypergraphDAO = {};

  HypergraphDAO.parseJSON = function(datum) {
    return datum;
  };

  HypergraphDAO.toJSON = function(hypergraph) {
    return hypergraph;
  };

  HypergraphDAO.create = function(hypergraph) {
    return $
        .ajax({
          url: '/hypergraph',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: HypergraphDAO.toJSON(hypergraph).data
          })
        })
        .then(function(response) {
          return HypergraphDAO.parseJSON(response);
        });
  };

  HypergraphDAO.update = function(hypergraph) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraph.id,
          type: 'PUT',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({
            data: hypergraph.data
          })
        })
        .then(function(response) {
          return HypergraphDAO.parseJSON(response);
        });
  };

  HypergraphDAO.fetch = function(hypergraphID) {
    return $.getJSON('/hypergraph/' + hypergraphID);
  };

  HypergraphDAO.delete = function(hypergraphID) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID,
          type: 'DELETE'
        });
  };

  return HypergraphDAO;
});
