define([
    'jquery'
], function($) {

  /*
   Link: {
   sourceId: UUID,
   targetId: UUID,
   data: {}
   }
   */

  var EdgeDao = {};

  EdgeDao.parseJSON = function (datum) {
    return datum;
  };

  EdgeDao.toJSON = function(link) {
    return link;
  };

  EdgeDao.create = function(hypergraphID, link) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/edge',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify(EdgeDao.toJSON(link))
        })
        .then(function(response) {
          return EdgeDao.parseJSON(response);
        });
  };

  EdgeDao.delete = function(hypergraphID, link) {
    return $
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/edge/' + link.id,
          type: 'DELETE'
        });
  };

  EdgeDao.fetchAll = function (hypergraphID) {
    return $
        .getJSON('/hypergraph/' + hypergraphID + '/edge')
        .then(function (response) {
          return _(response)
              .uniq(function(datum) { return datum.id; })
              .map(EdgeDao.parseJSON)
              .value();
        });
  };

  return EdgeDao;
});
