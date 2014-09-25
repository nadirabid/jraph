(function(root) {
'use strict';

var nodesAry = [];
var linksAry = [];

/*
 Graph view
 */

function StateEventHandlers() {
  this.click = noop;
  this.mouseover = noop;
  this.mouseout = noop;
  this.drag = noop;
  this.dragstart = noop;
  this.dragend = noop;
}

var DisabledNodeState = extendClass(StateEventHandlers);

var InitialNodeState = extendClass(StateEventHandlers, function (ctx) {
  //show menu
  this.mouseover = function (e) {
    if (e.mousedownFlag)
      return;

    ctx.px = ctx.x;
    ctx.py = ctx.y;
    ctx.fixed = true;
    ctx.menu = true;

    //move node to front to make sure menu is not
    //hidden by overlapping elements
    var nodes = ctx.$parent.nodes;

    if (ctx.$index < ( nodes.length - 1 ))
      nodes.push(nodes.$remove(ctx.$index));
  };

  //hide menu
  this.mouseout = function (e) {
    if (e.mousedownFlag)
      return;

    ctx.fixed = false;
    ctx.menu = false;
  };

  // shift viewport to center node
  this.click = function () {
    var xgraph = ctx.$parent;

    var minX = xgraph.minX,
        minY = xgraph.minY;

    var p = transformPointToEl(xgraph.width / 2, xgraph.height / 2, ctx.$el);

    var dx = p.x - ctx.x,
        dy = p.y - ctx.y;

    var iX = d3.interpolateRound(minX, minX - dx),
        iY = d3.interpolateRound(minY, minY - dy);

    var animDuration = 250;
    var ease = d3.ease('quad');

    d3.timer(function (elapsed) {
      var t = elapsed / animDuration;
      var easedT = ease(t);

      xgraph.minX = iX(easedT);
      xgraph.minY = iY(easedT);

      return t > 1;
    });

    ctx.menu = false;
    ctx.radius += 12;
    ctx.labelDistance += 12;

    document.mouse.state = 'disabled';

    ctx.forceResume();

    ctx.$dispatch('showNodeData', ctx.$data);

    Mousetrap.bind('esc', function () {
      document.mouse.state = 'initial';

      ctx.fixed = false;
      ctx.radius -= 12;
      ctx.labelDistance -= 12;

      Mousetrap.unbind('esc');

      ctx.$dispatch('hideNodeData');
    });
  };

  //drag node
  this.drag = function (dx, dy, x, y, e) {
    var p = transformPointToEl(x, y, ctx.$el);

    ctx.px = ctx.x = p.x;
    ctx.py = ctx.y = p.y;

    ctx.forceResume();
  };

  this.dragstart = function (dx, dy, x, y, e) {
    var p = transformPointToEl(x, y, ctx.$el);

    ctx.px = ctx.x = p.x;
    ctx.py = ctx.y = p.y;

    ctx.menu = false;
    ctx.fixed = true;
  };

  this.dragend = function (e) {
    ctx.menu = true;
  };
});

var LinkingNodeState = extendClass(InitialNodeState, function (ctx) {
  //select node target
  this.mouseover = function (e) {
    if (e.mousedownFlag || ctx.id == document.mouse.data.source.id)
      return;

    ctx.$el.querySelector('.node-circle').classList.add('node-linking-target', 'hover');
    ctx.px = ctx.x;
    ctx.py = ctx.y;
    ctx.fixed = true;
  };

  //unselect node target
  this.mouseout = function (e) {
    if (e.mousedownFlag || ctx.id == document.mouse.data.source.id)
      return;

    ctx.$el.querySelector('.node-circle').classList.remove('node-linking-target', 'hover');
    ctx.fixed = false;
  };

  //set link target
  this.click = function () {
    var sourceCtx = document.mouse.data.source;

    if (sourceCtx.id != ctx.id) {
      ctx.$parent
          .createLink({ source: sourceCtx, target: ctx })
          .then(function () {
            ctx.forceResume();
          });
    }
    else {
      ctx.forceResume();
    }

    ctx.$el.querySelector('.node-circle').classList.remove('node-linking-target', 'hover');
    sourceCtx.$el.querySelector('.node-circle').classList.remove('node-linking-source');

    sourceCtx.fixed = false;

    document.mouse.state = 'initial';
    document.mouse.data.source = null;
  };
});

Vue.component('x-node', {

  data: {

    menu: false,

    labelDistance: 15,

    radius: 20,

    x: 0,

    y: 0,

    labelX: 0,

    labelY: 0,

    fixed: false //d3.force doesn't pick it up if not explicity linked

  },

  methods: {

    updateLable: function () {
      var labelDistance = this.radius + this.labelDistance;
      var bBox = this._textElement.getBBox();

      var dx = this.x - ( this.$parent.width / 2 ),
          dy = this.y - ( this.$parent.height / 2 );

      var theta = Math.atan(dy / dx);
      var ratio = E_MINUS_1 * ( 1 - Math.abs(( theta % HALF_PI ) / HALF_PI) );

      var shiftX = bBox.width * Math.log(ratio + 1) * ( ( dx > 0 ) ? 0.5 : -0.5 ),
          shiftY = bBox.y * -0.5;

      var tX = labelDistance * Math.cos(theta),
          tY = labelDistance * Math.sin(theta);

      if (dx < 0) {
        tX *= -1;
        tY *= -1;
      }

      this.labelX = tX + shiftX;
      this.labelY = tY + shiftY;
    },

    setLinkSource: function (e) {
      e.stopPropagation();

      this.$el.querySelector('.node-circle').classList.add('node-linking-source');

      this.menu = false;
      this.fixed = true;

      document.mouse.state = 'linking';
      document.mouse.data.source = this;
    },

    forceResume: function () {
      this.$parent.forceResume();
    },

    getState: function () {
      return this._states[ document.mouse.state ];
    },

    mouseover: function () {
      var state = this.getState();
      return state.mouseover.apply(state, arguments);
    },

    mouseout: function () {
      var state = this.getState();
      return state.mouseout.apply(state, arguments);
    },

    click: function (e) {
      var state = this.getState();
      return state.click.apply(state, arguments);
    },

    drag: function () {
      var state = this.getState();
      return state.drag.apply(state, arguments);
    },

    dragstart: function () {
      var state = this.getState();
      return state.dragstart.apply(state, arguments);
    },

    dragend: function () {
      var state = this.getState();
      return state.dragend.apply(state, arguments);
    }

  },

  created: function () {
    this._states = {
      initial: new InitialNodeState(this),
      linking: new LinkingNodeState(this),
      disabled: new DisabledNodeState(this)
    };

    this.$watch('x', this.updateLable.bind(this));
    this.$watch('labelDistance', this.updateLable.bind(this));
    this.$watch('radius', this.updateLable.bind(this));
  },

  ready: function () {
    this._textElement = this.$el.querySelector('.node-label');
  },

  beforeDestroy: function () {
    this.menu = false;
    this.fixed = false;
  }

});

Vue.component('x-link', {

  methods: {

    freezePosition: function (e) {
      if (e.mousedownFlag || document.mouse.state != 'initial')
        return;

      var source = this.source,
          target = this.target;

      source.px = source.x;
      source.py = source.y;
      source.fixed = true;

      target.px = target.x;
      target.py = target.y;
      target.fixed = true;

      this.$el.classList.add('hover');
    },

    releasePosition: function (e) {
      if (e.mousedownFlag || document.mouse.state != 'initial')
        return;

      this.source.fixed = false;
      this.target.fixed = false;

      this.$el.classList.remove('hover');
    },

    dragstart: function (dx, dy, x, y, e) {
      if (document.mouse.state != 'initial')
        return;

      var source = this.source,
          target = this.target;

      source.menu = false;
      source.fixed = true;

      target.menu = false;
      target.fixed = true;

      var v = transformVectorToEl(dx, dy, this.$el);

      this.source_x = source.px = source.x = source.x + v.x;
      this.source_y = source.py = source.y = source.y + v.y;

      this.target_x = target.px = target.x = target.x + v.x;
      this.target_y = target.py = target.y = target.y + v.y;
    },

    drag: function (dx, dy, x, y, e) {
      if (document.mouse.state != 'initial')
        return;

      var source = this.source,
          target = this.target;

      var v = transformVectorToEl(dx, dy, this.$el);

      source.px = source.x = this.source_x + v.x;
      source.py = source.y = this.source_y + v.y;

      target.px = target.x = this.target_x + v.x;
      target.py = target.y = this.target_y + v.y;

      this.forceResume();
    },

    forceResume: function () {
      this.$parent.forceResume();
    }

  }

});

Vue.component('x-graph', {

  data: {

    nodes: [ ],

    links: [ ],

    width: 0,

    height: 0,

    minX: 0,

    minY: 0,

    cmX: 0,

    cmY: 0,

    displayContextMenu: false,

    enableForceLayout: true

  },

  computed: {

    viewBox: function () {
      return this.minX + ' ' + this.minY + ' ' + this.width + ' ' + this.height;
    }

  },

  methods: {

    toggleForce: function () {
      if (this.enableForceLayout) {
        this.enableForceLayout = false;
        this._force.stop();
      }
      else {
        this.enableForceLayout = true;
        this._force.resume();
      }
    },

    resize: function () {
      var newWidth = $(this.$el).width(),
          newHeight = $(this.$el).height();

      if (this.width == newWidth && this.height == newHeight)
        return;

      this._force.size([ newWidth, newHeight ]);
      this.forceResume();

      this.width = newWidth;
      this.height = newHeight;
    },

    panStart: function () {
      this.pMinX = this.minX;
      this.pMinY = this.minY;
    },

    pan: function (dx, dy) {
      this.minX = this.pMinX - dx;
      this.minY = this.pMinY - dy;
    },

    createLink: function (link) {
      var self = this;

      var linkJson = {
        sourceId: link.source.id,
        targetId: link.target.id
      };

      return $.ajax({
        url: '/hyperlink/',
        type: 'POST',
        contentType: 'application/json; charset=utf-8',
        data: JSON.stringify(linkJson),
        success: function (response) {
          var createdLink = response.results[0].data[0].row[0];

          self.nodes.forEach(function (n) {
            if (n.id == createdLink.sourceId) createdLink.source = n;
            if (n.id == createdLink.targetId) createdLink.target = n;
          });

          self.links.push(createdLink);
        }
      });
    },

    deleteNode: function (e, nodeId) {
      var self = this;

      e.stopPropagation();

      $.ajax({
        url: '/hypernode/?id=' + nodeId,
        type: 'DELETE',
        contentType: 'application/json; charset=utf-8',
        success: function (response) {
          self.links = self.links.filter(function (l) {
            return l.sourceId != nodeId && l.targetId != nodeId;
          });

          self.nodes = self.nodes.filter(function (n) {
            return n.id != nodeId;
          });
        }
      });
    },

    forceStart: function () {
      if (!this.enableForceLayout)
        return;

      if (!this._forceStart)
        this._forceStart = _.throttle(this._force.start.bind(this._force), 1200);

      this._forceStart();
    },

    forceResume: function () {
      if (!this.enableForceLayout)
        return;

      if (!this._forceResume)
        this._forceResume = _.throttle(this._force.resume.bind(this._force), 1200);

      this._forceResume();
    },

    contextMenu: function (e) {
      var self = this;

      if (e.target != this.$el)
        return;

      e.preventDefault();

      this.displayContextMenu = true;

      var p = transformPointToEl(e.x, e.y, this.$el);

      this.cmX = p.x;
      this.cmY = p.y;

      var closeContextMenu = function () {
        self.displayContextMenu = false;
        window.removeEventListener('click', closeContextMenu);
      };

      window.addEventListener('click', closeContextMenu);
    }

  },

  created: function () {
    var self = this;

    var force = this._force = d3.layout.force()
        .theta(0.1)
        .friction(0.5)
        .gravity(0.5)
        .charge(-6000)
        .linkDistance(50);

    force.on('end', function () {
      self.$parent.saveNodes();
    });

    this.$on('data', function (nodes, links) {
      self.nodes = nodes;
      self.links = links;

      force
          .nodes(self.nodes)
          .links(self.links)
          .start();
    });

    var observer = this.$compiler.observer;

    observer.on('change:nodes', function (value, mutation) {
      if (!mutation)
        return;

      force.nodes(value);
      self.forceStart();
    });

    observer.on('change:links', function (value, mutation) {
      if (!mutation)
        return;

      force.links(value);
      self.forceStart();
    });

    this.resize();

    window.addEventListener('resize', this.resize.bind(this));
    window.addEventListener('contextmenu', this.contextMenu.bind(this));
  }

});

/*
 Info view
 */

Vue.component('x-node-data', {

  data: {

    nodeData: { },

    key: '',

    value: '',

    valueHasError: false,

    keyHasError: false

  },

  computed: {

    nodeDataList: function () {
      return _.map(this.nodeData, function (v, k) {
        return { key: k, value: v };
      });
    }

  },

  methods: {

    savePropertyHandler: function () {
      var self = this;

      if (!self.key || self.key) {
        self.keyHasError = !self.key;
        self.valueHasError = !self.value;
        return;
      }

      if (!self.nodeData.data)
        self.nodeData.data = { };

      self.nodeData.data[ self.key ] = self.value;
      self.addProperty = false;

      $.ajax({
        url: '/hypernode/' + self.nodeData.id,
        type: 'PUT',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ data: self.nodeData.data }),
        success: function (response) {
          var data = JSON.parse(response.data[0][0].data.data);
          self.nodeData.data = data;
        }
      });
    }

  },

  created: function () {
    this.nodeData = this.$parent.nodeData;
  }

});

Vue.component('x-node-create', {

  data: {

    key: "",

    value: "",

    valueHasError: false,

    keyHasError: false,

    data: null

  },

  methods: {

    addPropertyHandler: function () {
      var self = this;

      if (!self.key || !self.value) {
        self.keyHasError = !self.key;
        self.valueHasError = !self.value;
        return;
      }

      var data = self.data || { };
      data[ self.key ] = self.value;
      self.data = data;
    },

    createNodeHandler: function () {
      var self = this;

      $.ajax({
        url: '/hypernode/',
        type: 'POST',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ data: self.data }),
        success: function (response) {
          var row = response.results[0].data[0].row[0];
          row.data = JSON.parse(row.data || null);

          self.$parent.nodes.push(row);

          self.key = "";
          self.value = "";
          self.data = null;
          self.keyHasError = false;
          self.valueHasError = false;
          self.$parent.displayNodeCreate = false;
        }
      });
    }

  }

});

/*
 Models
 */

var Link = {};

Link.parseJSON = function (datum) {
  var row = datum.row[0];
  row.data = JSON.parse(row.data || null);

  return row;
};

Link.fetchAll = function () {
  var xhr = $.getJSON('/hyperlink')
      .then(function (response) {
        var links = _(response.results[0].data)
            .uniq(function (datum) {
              return datum.row[0].id;
            })
            .map(Link.parseJSON)
            .value();

        linksAry = links;
        return links;
      });

  return xhr;
};

var Node = {};

Node.parseJSON = function (datum) {
  var row = datum.row[0];
  row.data = JSON.parse(row.data || null);

  var clientDisplay = row.data.clientDisplay;
  row.x = clientDisplay ? ( clientDisplay.x || 0 ) : 0;
  row.y = clientDisplay ? ( clientDisplay.y || 0 ) : 0;
  row.fixed = clientDisplay ? ( clientDisplay.fixed || false ) : false;

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
  var xhr = $.getJSON('/hypernode')
      .then(function (response) {
        if (response.errors.length)
          throw 'Unable to fetchNodes: ' + JSON.stringify(response.errors);

        nodesAry = _.map(response.results[0].data, Node.parseJSON);
        return nodesAry;
      });

  return xhr;
};

/*
 Main application code
 */

var app = new Vue({

  el: '#application',

  data: {

    nodes: [ ],

    links: [ ],

    displayNodeCreate: false,

    displayNodeData: false

  },

  methods: {

    toggleForce: function () {
      this.$.graph.toggleForce();
    },

    showNodeData: function (data) {
      this.nodeData = data;
      this.displayNodeData = true;

      this.$on('hideNodeData', function () {
        Mousetrap.unbind('esc');
        this.displayNodeData = false;
      });
    },

    saveNodes: function () {
      var nodesJson = _.map(nodesAry, function (node) {
        return Node.toJSON(node);
      });

      $.ajax({
        url: '/hypernode/',
        type: 'PUT',
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ data: nodesJson }),
        success: function (response) {
          //console.log( 'response', response );
        }
      });
    }

  },

  created: function () {
    var self = this;

    $.when(Node.fetchAll(), Link.fetchAll())
        .done(function (nodes, links) {
          nodes.forEach(function (n) {
            links.forEach(function (l) {
              if (l.sourceId == n.id) l.source = n;
              if (l.targetId == n.id) l.target = n;
            });
          });

          self.nodes = nodes;
          self.links = links;

          self.$broadcast('data', nodes, links);
        });

    this.$on('showNodeData', this.showNodeData.bind(this));

    this.$watch('displayNodeCreate', function (value) {
      if (!value)
        return;

      Mousetrap.bind('esc', function () {
        self.displayNodeCreate = false;
        Mousetrap.unbind('esc');
      });
    });
  }

});

root.app = app;

})( window );