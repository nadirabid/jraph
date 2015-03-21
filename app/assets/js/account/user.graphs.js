require([
      'lodash',
      'jquery',
      'vue',
      'models'
],
function(_, $, Vue, models){

  var Node = models.Node;
  var Link = models.Link;

  var graphsData = _.map(_graphsData, function(graphData) {
    graphData.nodes = graphData.nodes.map(function(n) {
      return Node.parseJSON(n);
    });

    graphData.nodes.forEach(function(n) {
      graphData.links.forEach(function(l) {
        if (l.sourceId == n.id) l.source = n;
        if (l.targetId == n.id) l.target = n;
      });

      return n;
    });

    return graphData;
  });

  function liangBarsky(edgeLeft, edgeRight, edgeBottom, edgeTop,
                       x0src, y0src, x1src, y1src) {
    var t0 = 0.0, t1 = 1.0;
    var xdelta = x1src-x0src;
    var ydelta = y1src-y0src;
    var p,q,r;

    for(var edge=0; edge<4; edge++) {   // Traverse through left, right, bottom, top edges.
      if (edge === 0) {
        p = -xdelta;
        q = -(edgeLeft - x0src);
      }
      else if (edge === 1) {
        p = xdelta;
        q =  (edgeRight - x0src);
      }
      else if (edge === 2) {
        p = -ydelta;
        q = -(edgeBottom - y0src);
      }
      else if (edge === 3) {
        p = ydelta;
        q = (edgeTop - y0src);
      }

      r = q/p;

      if (p === 0 && q < 0) {     // Don't draw line at all. (parallel line outside)
        return false;
      }

      if (p < 0) {
        if (r > t1) return false; // Don't draw line at all.
        else if (r > t0) t0=r;    // Line is clipped!
      }
      else if (p > 0) {
        if (r < t0) return false; // Don't draw line at all.
        else if (r<t1) t1=r;      // Line is clipped!
      }
    }

    return {
      x0Clip: x0src + (t0 * xdelta), // x0clip
      y0Clip: y0src + (t0 * ydelta), // y0clip
      x1Clip: x0src + (t1 * xdelta), // x1clip
      y1Clip: y0src + (t1 * ydelta)  // y1clip
    };
  }

  function viewBoundsToFitAllNodes(nodes) {
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

  var LinkThumbnailComponent = Vue.extend({

    template: document.getElementById('link.thumbnail').innerHTML,

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
    },

    events: {

      'hook:ready': function() {
        this.liangBarsky();
      }

    },

    methods: {

      liangBarsky: function () {
        //TODO: bug with translate transforms

        var source = this.source;
        var target = this.target;

        console.log(JSON.parse(JSON.stringify(target)));

        var clippings = liangBarsky(
            target.leftEdge,
            target.rightEdge,
            target.topEdge,
            target.bottomEdge,
            source.x,
            source.y,
            target.x,
            target.y
        );

        console.log(clippings);

        this.targetClipX = clippings.x0Clip;
        this.targetClipY = clippings.y0Clip;
      }

    }

  });

  Vue.component('x-link-thumbnail', LinkThumbnailComponent);

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

      nameTranslate: function() {
        return 'translate(' + this.nameX + ',' + this.nameY + ')';
      },

      rectTranslate: function() {
        return 'translate(' + (-this.width/2) + ',' + (-(this.height + 12)/2) + ')';
      }

    },

    events: {

      'hook:ready': function() {
        this.updateDimensionsOfNodeRect();
        this.calculateRectBoundingEdges();
      }

    },

    methods: {

      calculateRectBoundingEdges: function() {
        // we get the transform to nodesAndLinksGroup element
        // because, in calculating the bounding edges, we only
        // want the transforms applied to the node element itself
        // while disregarding the transforms to nodesAndLinksGroup
        var ttm = this.$$.nodeRect.getTransformToElement(this.$parent.$$.nodesAndLinksGroup);
        var bBox = this.$$.nodeRect.getBBox();
        var point = this.$parent.$$.svg.createSVGPoint();
        var dimensions = this.$parent.$$.svg.createSVGPoint();

        point.x = bBox.x;
        point.y = bBox.y;

        point = point.matrixTransform(ttm);

        ttm.e = ttm.f = 0; // next we multiply bBox.width/height as vectors

        dimensions.x = bBox.width;
        dimensions.y = bBox.height;

        dimensions = dimensions.matrixTransform(ttm);

        this.leftEdge = point.x;
        this.rightEdge = point.x + dimensions.x;
        this.topEdge = point.y;
        this.bottomEdge = point.y + dimensions.y;
      },

      updateDimensionsOfNodeRect: function() {
        var bBox = this.$$.nodeName.getBBox();

        this.width = bBox.width + 24;
        this.height = bBox.height + 12;
      }

    }

  });

  Vue.component('x-node-thumbnail', NodeThumbnailComponent);

  var GraphThumbnailComponent = Vue.extend({

    template: '#graph.thumbnail',

    replace: true,

    data: function() {
      return {
        links: [],
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

    events: {

      'hook:ready': function() {
        this.bounds = viewBoundsToFitAllNodes(this.nodes);
      }

    }

  });

  Vue.component('x-graph-thumbnail', GraphThumbnailComponent);

  var letters = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N' ];
  var colors = [ '2e6d8c', '8c261b', 'e74c3c', '4694c6', 'dd6580', '626264' ];
  var counter = 0;

  var GraphThumbnailsListComponent = Vue.extend({

    data: function() {
      return {
        pageYOffset: 0,
        sortedBy: 'modified',
        sortMenu: false,
        hypergraphs: [ ]
      };
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

    events: {

      'hook:attached': function() {
        var self = this;

        self.hypergraphs = _.map(_.range(14), function() {
          var hypergraph = _.cloneDeep(graphsData[0]);
          hypergraph.graph.data.background = colors[counter % colors.length];
          hypergraph.graph.data.name = letters[counter % letters.length];
          hypergraph.graph.createdAt += counter + Math.floor(Math.random()*100);
          hypergraph.graph.updatedAt -= counter + Math.floor(Math.random()*100);

          counter++;
          return hypergraph;
        });

        window.addEventListener('scroll', function() {
          self.pageYOffset = window.pageYOffset;
        });
      }

    },

    methods: {

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

    }

  });

  // init code
  var graphThumbnailsList = new GraphThumbnailsListComponent().$mount(document.body);

  return graphThumbnailsList;
});