define([
    'shared/util'
], function(
    util
) {

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
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify(EdgeDao.toJSON(link))
        })
        .then(function(response) {
          return EdgeDao.parseJSON(response);
        });
  };

  EdgeDao.delete = function(hypergraphID, link) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink/' + link.id,
          type: 'DELETE'
        });
  };

  EdgeDao.fetchAll = function (hypergraphID) {
    return util
        .getJSON('/hypergraph/' + hypergraphID + '/hyperlink')
        .then(function (response) {
          return _(response)
              .uniq(function(datum) { return datum.id; })
              .map(EdgeDao.parseJSON)
              .value();
        });
  };

  return EdgeDao;
});
