define([
  'lodash',
  'mousetrap',
  'd3',
  'vue',
  'util',
  'globals',
  'components'
], function (_, Mousetrap, d3, Vue, util, glob) {
  'use strict';

  var HALF_PI = glob.HALF_PI;
  var E_MINUS_1 = glob.E_MINUS_1;
  var FORCE_THROTTLE_TIME = 500;

  var mouse = glob.mouse;
  var nodesAry = [];
  var linksAry = [];

  /*
   Graph view
   */

  function StateEventHandlers() {
    this.click = util.noop;
    this.mouseover = util.noop;
    this.mouseout = util.noop;
    this.drag = util.noop;
    this.dragstart = util.noop;
    this.dragend = util.noop;
  }

  var DisabledNodeState = util.extendClass(StateEventHandlers);

  var InitialNodeState = util.extendClass(StateEventHandlers, function (ctx) {
    //show menu
    this.mouseover = function (e) {
      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
      ctx.menu = true;

      //move node to front to make sure menu is not
      //hidden by overlapping elements
      var nodes = ctx.$parent.nodes;

      if (ctx.$index < ( nodes.length - 1 )) {
        nodes.push(nodes.$remove(ctx.$index));
      }
    };

    //hide menu
    this.mouseout = function () {
      ctx.fixed = false;
      ctx.menu = false;
    };

    // shift viewport to center node
    this.click = function () {
      var xgraph = ctx.$parent;

      var minX = xgraph.minX,
          minY = xgraph.minY;

      var p = util.transformPointToEl(
              xgraph.width / 2,
              xgraph.height / 2,
              ctx.$el);

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
      ctx.radius += 0.5;
      ctx.labelDistance += 12;

      mouse.state = 'disabled';

      ctx.forceResume();

      ctx.$dispatch('showNodeData', ctx.$data);

      Mousetrap.bind('esc', function () {
        mouse.state = 'initial';

        ctx.fixed = false;
        ctx.radius -= 0.5;
        ctx.labelDistance -= 12;

        Mousetrap.unbind('esc');

        ctx.$dispatch('hideNodeData');
      });
    };

    //drag node
    this.drag = function (e) {
      var p = util.transformPointToEl(e.x, e.y, ctx.$el);

      ctx.px = ctx.x = p.x;
      ctx.py = ctx.y = p.y;
      ctx.menu = false;

      ctx.forceResume();
    };

    this.dragstart = function (e) {
      e.stopPropagation();

      ctx.px = ctx.x;
      ctx.py = ctx.y;

      ctx.fixed = true;
    };

    this.dragend = function () {
      ctx.menu = true;
    };
  });

  var LinkingNodeState = util.extendClass(InitialNodeState, function (ctx) {
    //select node target
    this.mouseover = function (e) {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      ctx.$el.querySelector('.node-circle')
          .classList
          .add('node-linking-target', 'hover');

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
    };

    //unselect node target
    this.mouseout = function (e) {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      ctx.$el.querySelector('.node-circle')
          .classList
          .remove('node-linking-target', 'hover');

      ctx.fixed = false;
    };

    //set link target
    this.click = function () {
      var sourceCtx = mouse.data.source;

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

      ctx.$el.querySelector('.node-circle')
          .classList
          .remove('node-linking-target', 'hover');

      sourceCtx._ghostLink.$destroy(true);
      sourceCtx._ghostLink = null;

      sourceCtx.$el.querySelector('.node-circle')
          .classList
          .remove('node-linking-source');

      sourceCtx.fixed = false;

      mouse.state = 'initial';
      mouse.data.source = null;
    };
  });

  var GhostLinkComponent = Vue.extend({

    replace: true,

    template: document.getElementById('graph.ghostLink').innerHTML,

    data: function () {
      return {
        source: { x: 0, y: 0 },
        target: { x: 0, y: 0 }
      };
    },

    methods: {

      mousemove: function (e) {
        this.target = util.transformPointToEl(e.x, e.y, this.$el);
      }

    },

    events: {

      'hook:attached': function () {
        this.source = util.transformPointToEl(
            this.linkSource.x,
            this.linkSource.y,
            this.$el);

        this.target = util.transformPointToEl(
            mouse.x,
            mouse.y,
            this.$el);

        this._mousemove = this.mousemove.bind(this);
        util.on('mousemove', this._mousemove);
      },

      'hook:beforeDestroy': function () {
        util.off('mousemove', this._mousemove);
      }

    }

  });

  Vue.component('x-node', {

    data: function () {
      return {
        menu: false,
        labelDistance: 15,
        radius: 1.5,
        x: 0,
        y: 0,
        labelX: 0,
        labelY: 0,
        fixed: false //d3.force doesn't pick it up if not explicitly linked
      };
    },

    methods: {

      updateLable: function () {
        var labelDistance = (this.radius * 12) + this.labelDistance;
        var bBox = this.$$.nodeLabel.getBBox();

        var dx = this.x - (this.$parent.width / 2),
            dy = this.y - (this.$parent.height / 2);

        var theta = Math.atan(dy / dx);
        var ratio = E_MINUS_1 * (1 - Math.abs(( theta % HALF_PI ) / HALF_PI));

        var shiftX = bBox.width * Math.log(ratio + 1) * (( dx > 0 ) ? 0.5 : -0.5),
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

        this.$el.querySelector('.node-circle')
            .classList
            .add('node-linking-source');

        this.menu = false;
        this.fixed = true;

        mouse.state = 'linking';
        mouse.data.source = this;

        var ghostLink = this._ghostLink = new GhostLinkComponent({
          data: {
            linkSource: this
          }
        }).$mount();

        var dynamicContentEl = this.$parent.$el
            .querySelector('.dynamic-content');

        ghostLink.$appendTo(dynamicContentEl);
      },

      forceResume: function () {
        this.$parent.forceResume();
      },

      getState: function () {
        return this._states[ mouse.state ];
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

    events: {

      'hook:created': function () {
        this._states = {
          initial: new InitialNodeState(this),
          linking: new LinkingNodeState(this),
          disabled: new DisabledNodeState(this)
        };

        this.$watch('x', this.updateLable.bind(this));
        this.$watch('labelDistance', this.updateLable.bind(this));
        this.$watch('radius', this.updateLable.bind(this));
      },

      'hook:ready': function () {
        this.$$.nodeLabel = this.$el.querySelector('.node-label');

        var $nodeGroup = util(this.$el.querySelector('.node-group'));

        $nodeGroup.on('click', this.click.bind(this));
        $nodeGroup.on('mouseover', this.mouseover.bind(this));
        $nodeGroup.on('mouseout', this.mouseout.bind(this));
        $nodeGroup.on('dragstart', this.dragstart.bind(this));
        $nodeGroup.on('drag', this.drag.bind(this));
        $nodeGroup.on('dragend', this.dragend.bind(this));

        this.updateLable();
      },

      'hook:beforeDestroyed': function () {
        this.menu = false;
        this.fixed = false;
      }

    }

  });

  Vue.component('x-link', {

    methods: {

      freezePosition: function () {
        if (mouse.state != 'initial') {
          return;
        }

        var source = this.source,
            target = this.target;

        source.px = source.x;
        source.py = source.y;
        source.fixed = true;

        target.px = target.x;
        target.py = target.y;
        target.fixed = true;

        this.$el.querySelector('.link')
            .classList
            .add('hover');
      },

      releasePosition: function (e) {
        if (mouse.state != 'initial') {
          return;
        }

        this.source.fixed = false;
        this.target.fixed = false;

        this.$el.querySelector('.link')
            .classList
            .remove('hover');
      },

      dragstart: function (e) {
        if (mouse.state != 'initial') {
          return;
        }

        e.stopPropagation();

        var source = this.source,
            target = this.target;

        source.menu = false;
        source.fixed = true;

        target.menu = false;
        target.fixed = true;

        this.source_x = source.px = source.x;
        this.source_y = source.py = source.y;

        this.target_x = target.px = target.x;
        this.target_y = target.py = target.y;
      },

      drag: function (e) {
        if (mouse.state != 'initial') {
          return;
        }

        var source = this.source,
            target = this.target;

        var v = util.transformVectorToEl(e.dx, e.dy, this.$el);

        source.px = source.x = this.source_x + v.x;
        source.py = source.y = this.source_y + v.y;

        target.px = target.x = this.target_x + v.x;
        target.py = target.y = this.target_y + v.y;

        this.forceResume();
      },

      forceResume: function () {
        this.$parent.forceResume();
      }

    },

    events: {

      'hook:compiled': function () {
        var $g = util(this.$el);
        $g.on('mouseover', this.freezePosition.bind(this));
        $g.on('mouseout', this.releasePosition.bind(this));
        $g.on('dragstart', this.dragstart.bind(this));
        $g.on('drag', this.drag.bind(this));
      }

    }

  });

  Vue.component('x-graph', {

    data: function () {
      return {
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
      };
    },

    computed: {

      nodes: {
        get: function () {
          return this.$parent.nodes;
        },
        set: function (value) {
          this.$parent.nodes = value;
        }
      },

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
        var newWidth = util.width(this.$el),
            newHeight = util.height(this.$el);

        if (this.width == newWidth && this.height == newHeight) {
          return;
        }

        this._force.size([ newWidth, newHeight ]);
        this.forceResume();

        this.width = newWidth;
        this.height = newHeight;
      },

      panStart: function () {
        this._pMinX = this.minX;
        this._pMinY = this.minY;
      },

      pan: function (e) {
        this.minX = this._pMinX - e.dx;
        this.minY = this._pMinY - e.dy;
      },

      createLink: function (link) {
        var self = this;

        var linkJson = {
          sourceId: link.source.id,
          targetId: link.target.id
        };

        return util.ajax({
          url: '/hyperlink',
          type: 'POST',
          contentType: 'application/json; charset=utf-8',
          data: JSON.stringify(linkJson),
          success: function (response) {
            var createdLink = response.results[0].data[0].row[0];

            self.nodes.forEach(function (n) {
              if (n.id == createdLink.sourceId) {
                createdLink.source = n;
              }
              if (n.id == createdLink.targetId) {
                createdLink.target = n;
              }
            });

            self.links.push(createdLink);
          }
        });
      },

      deleteNode: function (e, nodeId) {
        var self = this;

        e.stopPropagation();

        util.ajax({
          url: '/hypernode/' + nodeId,
          type: 'DELETE',
          success: function (response) {
            //test: make sure events bound to arrays are still active

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
        if (!this.enableForceLayout) {
          return;
        }

        if (!this._forceStart) {
          var forceStart = this._force.start.bind(this._force);
          this._forceStart = _.throttle(forceStart, FORCE_THROTTLE_TIME);
        }

        this._forceStart();
      },

      forceResume: function () {
        if (!this.enableForceLayout) {
          return;
        }

        if (!this._forceResume) {
          var forceResume = this._force.resume.bind(this._force);
          this._forceResume = _.throttle(forceResume, FORCE_THROTTLE_TIME);
        }

        this._forceResume();
      },

      contextMenu: function (e) {
        var self = this;

        if (e.target != this.$el) {
          return;
        }

        e.preventDefault();

        this.displayContextMenu = true;

        var p = util.transformPointToEl(e.x, e.y, this.$el);

        this.cmX = p.x;
        this.cmY = p.y;

        var closeContextMenu = function () {
          self.displayContextMenu = false;
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      }

    },

    events: {

      'hook:created': function () {
        var self = this;

        var force = this._force = d3.layout.force()
            .theta(0.1)
            .friction(0.5)
            .gravity(0.5)
            .charge(-6000)
            .linkDistance(50);

        force.on('end', function () {
          _.defer(function () {
            self.$parent.saveNodes();
          });
        });

        this.$on('data', function (nodes, links) {
          self.links = links;

          force
              .nodes(self.nodes)
              .links(self.links)
              .start();
        });

        // todo: unwatch when component is destroyed
        this.$parent.$watch('nodes', function (value, mutation) {
          if (!mutation) {
            return;
          }

          force.nodes(value);
          self.forceStart();
        }, false, true);

        this.$parent.$watch('links', function (value, mutation) {
          if (!mutation) {
            return;
          }

          force.links(value);
          self.forceStart();
        });

        window.addEventListener('resize', this.resize.bind(this));
        window.addEventListener('contextmenu', this.contextMenu.bind(this));
      },

      'hook:compiled': function () {
        var $svg = util(this.$el);
        $svg.on('dragstart', this.panStart.bind(this));
        $svg.on('drag', this.pan.bind(this));
      },

      'hook:ready': function () {
        this.resize();
      }

    }

  });

  /*
   Info view
   */

  Vue.component('x-node-data', {

    data: function () {
      return {
        nodeData: { },
        key: '',
        value: '',
        valueHasError: false,
        keyHasError: false,
        addProperty: false
      };
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

        if (!self.key || !self.value) {
          self.keyHasError = !self.key;
          self.valueHasError = !self.value;
          return;
        }

        if (!self.nodeData.data) {
          self.nodeData.data = { };
        }

        self.nodeData.data[ self.key ] = self.value;
        self.addProperty = false;

        util.ajax({
          url: '/hypernode/' + self.nodeData.id,
          type: 'PUT',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: self.nodeData.data }),
          success: function (response) {
            var row = response.results[0].data[0].row[0];
            row.data = JSON.parse(row.data || null);

            self.nodeData.data = row.data;
          }
        });
      }

    },

    events: {

      'hook:created': function () {
        this.nodeData = this.$parent.nodeData;
      }

    }

  });

  Vue.component('x-node-create', {

    data: function () {
      return {
        key: "",
        value: "",
        valueHasError: false,
        keyHasError: false,
        data: null
      };
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

        util.ajax({
          url: '/hypernode',
          type: 'POST',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: self.data }),
          success: function (response) {
            var node = Node.parseJSON(response.results[0].data[0]);
            self.$parent.nodes.push(node);

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

  //todo: something to do with this

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
    row.x = clientDisplay ? (clientDisplay.x || 0) : 0;
    row.y = clientDisplay ? (clientDisplay.y || 0) : 0;
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

          nodesAry = _.map(response.results[0].data, Node.parseJSON);
          return nodesAry;
        });

    return xhr;
  };

  /*
   Main application code
   */

  var app = new Vue({

    el: function () {
      return '#application';
    },

    data: function () {
      return {
        nodes: [ ],
        links: [ ],
        displayNodeCreate: false,
        displayNodeData: false
      };
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

        util.ajax({
          url: '/hypernode',
          type: 'PUT',
          contentType: "application/json; charset=utf-8",
          data: JSON.stringify({ data: nodesJson }),
          success: function (response) {
            //console.log('response', response);
          }
        });
      }

    },

    events: {

      'hook:created': function () {
        var self = this;

        util.when(Node.fetchAll(), Link.fetchAll())
            .done(function (nodes, links) {
              nodes.forEach(function (n) {
                links.forEach(function (l) {
                  if (l.sourceId == n.id) {
                    l.source = n;
                  }
                  if (l.targetId == n.id) {
                    l.target = n;
                  }
                });
              });

              self.nodes = nodes;
              self.links = links;

              self.$broadcast('data', nodes, links);
            });

        this.$on('showNodeData', this.showNodeData.bind(this));

        this.$watch('displayNodeCreate', function (value) {
          if (!value) {
            return;
          }

          Mousetrap.bind('esc', function () {
            self.displayNodeCreate = false;
            Mousetrap.unbind('esc');
          });
        });
      }

    }

  });

  return app;
});