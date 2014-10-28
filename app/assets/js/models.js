define([
    'util'
], function(util) {
  // Link Model

  var Link = {};

  Link.parseJSON = function (datum) {
    var row = datum.row[0];
    row.data = JSON.parse(row.data || null);

    return row;
  };

  Link.fetchAll = function () {
    var xhr = util.getJSON('/hyperlink')
        .then(function (response) {
          var links = _(response.results[0].data)
              .uniq(function (datum) {
                return datum.row[0].id;
              })
              .map(Link.parseJSON)
              .value();

          return links;
        });

    return xhr;
  };

  // Node Model

  var Node = {};

  Node.parseJSON = function (datum) {
    var row = datum.row[0];
    row.data = JSON.parse(row.data || null);

    var clientDisplay = row.data.clientDisplay;

    row.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    row.y = clientDisplay ? (clientDisplay.y || 0) : 0;

    // need to specify px for d3 to play happy
    // for reasons still unknown
    row.px = row.x;
    row.py = row.y;

    row.fixed = clientDisplay ? (clientDisplay.fixed || false) : false;

    return row;
  };

  Node.toJSON = function (node) {
    var json = { id: node.id };
    json.data = _.clone(node.data);
    json.data.clientDisplay = {
      x: node.x,
      y: node.y,
      fixed: node.fixed
    };

    return json;
  };

  Node.fetchAll = function () {
    var xhr = util.getJSON('/hypernode')
        .then(function (response) {
          if (response.errors.length) {
            throw 'Unable to fetchNodes: ' + JSON.stringify(response.errors);
          }

          return _.map(response.results[0].data, Node.parseJSON);
        });

    return xhr;
  };

  Node.update = function(nodes) {
    var nodesJson = _.map(nodes, function (node) {
      return Node.toJSON(node);
    });

    return util
        .ajax({
          url: '/hypernode',
          type: 'PUT',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: nodesJson })
        })
        .then(function(response) {
          return Node.parseJSON(response.results[0].data[0]);
        });
  };

  Node.create = function(data) {
    return util
        .ajax({
          url: '/hypernode',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify({ data: data })
        })
        .then(function(response) {
          return Node.parseJSON(response.results[0].data[0]);
        });
  };

  return {
    Node: Node,
    Link: Link
  };
});