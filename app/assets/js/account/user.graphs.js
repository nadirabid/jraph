require([
    'lodash',
    'jquery',
    'vue',
    'shared/daos/HypergraphDAO',
    'shared/daos/NodeDAO',
    'shared/daos/EdgeDAO',
    'account/user'
], function(_, $, Vue, HypergraphDAO, NodeDAO, EdgeDAO){
  'use strict';

  var graphsData = _.map(_graphsData, function(graphData) {
    graphData.nodes = graphData.nodes.map(function(node) {
      return NodeDAO.parseJSON(node);
    });

    graphData.edges = graphData.edges.map(function(edge) {
      return EdgeDAO.parseJSON(edge);
    });

    graphData.nodes.forEach(function(node) {
      graphData.edges.forEach(function(edge) {
        if (edge.sourceId == node.id) edge.source = node;
        if (edge.targetId == node.id) edge.target = node;
      });

      return node;
    });

    return graphData;
  });

  function calculateViewBoundsToFitAllNodes(nodes) {
    if (nodes.length === 0) {
      return { xMin: 0, xMax: 1280, yMin: 0, yMax: 675 };
    }

    var bounds = {
      xMin: Number.POSITIVE_INFINITY,
      xMax: Number.NEGATIVE_INFINITY,
      yMin: Number.POSITIVE_INFINITY,
      yMax: Number.NEGATIVE_INFINITY
    };

    bounds = _.reduce(nodes, function(bounds, n) {
      if (n.x < bounds.xMin) bounds.xMin = n.x;
      if (n.x > bounds.xMax) bounds.xMax = n.x;
      if (n.y < bounds.yMin) bounds.yMin = n.y;
      if (n.y > bounds.yMax) bounds.yMax = n.y;

      return bounds;
    }, bounds);

    return bounds;
  }

  var EdgeThumbnailComponent = Vue.extend({

    template: document.getElementById('edge.thumbnail').innerHTML,

    replace: true,

    data: function() {
      return {
        targetClipX: 0,
        targetClipY: 0
      };
    },

    computed: {
      sourceX: function() {
        return this.source.x;
      },
      sourceY: function() {
        return this.source.y;
      },
      targetX: function() {
        return this.target.x;
      },
      targetY: function() {
        return this.target.y;
      }
    }

  });

  Vue.component('x-edge-thumbnail', EdgeThumbnailComponent);

  var NodeThumbnailComponent = Vue.extend({

    template: document.getElementById('node.thumbnail').innerHTML,

    replace: true,

    data: function() {
      return {
        x : 0,
        y : 0,
        leftEdge : 0,
        rightEdge : 0,
        bottomEdge : 0,
        topEdge : 0,
        nameX : 0,
        nameY : 0,
        width : 0,
        height : 0,
        data: {
          name: ''
        }
      };
    },

    computed: {

      nodeTranslate: function() {
        return 'translate(' + this.x + ',' + this.y + ')';
      },

      rectTranslate: function() {
        return 'translate(' + (-this.width/2) + ',' + (-(this.height + 10)/2) + ')';
      }

    },

    methods: {

      updateDimensionsOfNodeRect: function() {
        var bBox = this.$$.nodeName.getBBox();

        var minWidth = Math.max(bBox.width, 50);
        var minHeight = Math.max(bBox.height, 18);

        this.width = minWidth + 24;
        this.height = minHeight + 12;
      }

    },

    ready: function() {
      this.updateDimensionsOfNodeRect();
    }

  });

  Vue.component('x-node-thumbnail', NodeThumbnailComponent);

  var GraphThumbnailComponent = Vue.extend({

    template: '#graph.thumbnail',

    replace: true,

    data: function() {
      return {
        edges: [],
        nodes: [],
        width: 400,
        height: 220,
        bounds: {
          xMin: 0,
          xMax: 1280,
          yMin: 0,
          yMax: 675
        }
      };
    },

    computed: {

      viewBox: function() {
        var b = this.bounds;

        var xPadding = 20;
        var yPadding = 10;

        var xMin = b.xMin - xPadding;
        var xMax = b.xMax + xPadding;
        var yMin = ((this.height/this.width) * xMin) - yPadding;
        var yMax = ((this.height/this.width) * xMax) + yPadding;

        return xMin + ' ' + yMin + ' ' + (xMax - xMin) + ' ' + (yMax - yMin);
        //return b.xMin + ' ' + b.yMin + ' ' + (b.xMax - b.xMin) + ' ' + (b.yMax - b.yMin);
      }

    },

    methods: {

      deleteGraph: function(e) {
        e.preventDefault();

        var self = this;
        var hypergraphID = this.graph.id;

        HypergraphDAO
            .delete(hypergraphID)
            .then(function() {
              var indexOfDeletedHypergraph = _.findIndex(self.$parent.hypergraphs, function(hypergraph) {
                return hypergraph.graph.id == hypergraphID;
              });

              self.$parent.hypergraphs.splice(indexOfDeletedHypergraph, 1);
            });
      }

    },

    ready: function() {
      this.bounds = calculateViewBoundsToFitAllNodes(this.nodes);
    }

  });

  Vue.component('x-graph-thumbnail', GraphThumbnailComponent);

  var colors = [ '2e6d8c', '8c261b', 'e74c3c', '4694c6', 'dd6580', '626264' ];
  var counter = 0;

  var graphThumbnailsList = new Vue({

    el: '#userGraphs',

    data: {
      pageYOffset: 0,
      sortedBy: 'modified',
      sortMenu: false,
      hypergraphs: [ ]
    },

    computed: {

      sortedHypergraphs: function() {
        var hypergraphs = this.hypergraphs;

        switch(this.sortedBy) {
          case 'title':
            hypergraphs = _.sortBy(hypergraphs, function(hypergraph) {
              return hypergraph.graph.data.name;
            });
            break;
          case 'modified':
            hypergraphs = _.sortBy(hypergraphs, function(hypergraph) {
              return hypergraph.graph.updatedAt;
            });
            break;
          default:
            hypergraphs = _.sortBy(hypergraphs, function(hypergraph) {
              return hypergraph.graph.createdAt;
            });
            break;
        }

        return hypergraphs;
      }

    },

    methods: {

      createNewGraph: function() {
        HypergraphDAO
            .create({
              data: { name: 'Graph Name' }
            })
            .done(function(hypergraph) {
              window.location.href = '/graph/' + hypergraph.id;
            });
      },

      toggleSortMenu: function(e) {
        if (this.sortMenu)
          return;

        e.stopPropagation();

        this.sortMenu = true;

        var self = this;

        var closeMenu = function() {
          self.sortMenu = false;
          window.removeEventListener('click', closeMenu);
        };

        window.addEventListener('click', closeMenu);
      }

    },

    attached: function() {
      var self = this;

      self.hypergraphs = graphsData;

      window.addEventListener('scroll', function() {
        self.pageYOffset = window.pageYOffset;
      });
    }

  });

  return graphThumbnailsList;
});