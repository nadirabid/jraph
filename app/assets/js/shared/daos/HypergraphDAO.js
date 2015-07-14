define([
    'shared/util'
], function(
    util
) {
  var HypergraphDAO = {};

  HypergraphDAO.parseJSON = function(datum) {
    return datum;
  };

  HypergraphDAO.toJSON = function(hypergraph) {
    return hypergraph;
  };

  HypergraphDAO.create = function(hypergraph) {
    return util
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
    return util
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
    return util.getJSON('/hypergraph/' + hypergraphID);
  };

  return HypergraphDAO;
});
