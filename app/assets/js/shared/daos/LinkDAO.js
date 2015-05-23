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

  var LinkDAO = {};

  LinkDAO.parseJSON = function (datum) {
    return datum;
  };

  LinkDAO.toJSON = function(link) {
    return link;
  };

  LinkDAO.create = function(hypergraphID, link) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify(LinkDAO.toJSON(link))
        })
        .then(function(response) {
          return LinkDAO.parseJSON(response);
        });
  };

  LinkDAO.delete = function(hypergraphID, link) {
    return util
        .ajax({
          url: '/hypergraph/' + hypergraphID + '/hyperlink/' + link.id,
          type: 'DELETE'
        });
  };

  LinkDAO.fetchAll = function (hypergraphID) {
    return util
        .getJSON('/hypergraph/' + hypergraphID + '/hyperlink')
        .then(function (response) {
          return _(response)
              .uniq(function(datum) { return datum.id; })
              .map(LinkDAO.parseJSON)
              .value();
        });
  };

  return LinkDAO;
});
