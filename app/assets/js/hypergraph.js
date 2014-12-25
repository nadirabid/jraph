define([
    'lodash',
    'mousetrap',
    'page',
    'vue',
    'util',
    'globals',
    'models',
    'state',
    'navbar'
], function (
    _,
    Mousetrap,
    page,
    Vue,
    util,
    glob,
    models,
    State,
    NavbarComponent) {
  'use strict';

  Vue.config.debug = true;

  var HALF_PI = glob.HALF_PI;
  var E_MINUS_1 = glob.E_MINUS_1;

  var Node = models.Node;
  var Link = models.Link;

  var state = new State();
  var mouse = util.mouse;

  var nodesAry = [];
  var linksAry = [];

  var hypergraphID = window.location.pathname.split('/')[2];

  function StateEventHandlers() {
    this.click = util.noop;
    this.mouseover = util.noop;
    this.mouseout = util.noop;
    this.drag = util.noop;
    this.dragstart = util.noop;
    this.dragend = util.noop;
  }

  /*
   Graph view
   */

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
        this.target = util.transformPointFromClientToEl(e.clientX, e.clientY, this.$el);
      }

    },

    events: {

      'hook:attached': function () {
        this.source = this.linkSource;
        this.target = util.transformPointFromClientToEl(mouse.x, mouse.y, this.$el);

        this._mousemove = this.mousemove.bind(this);
        util.on('mousemove', this._mousemove);
      },

      'hook:beforeDestroy': function () {
        util.off('mousemove', this._mousemove);
      }

    }

  });

  var DisabledNodeState = util.extendClass(StateEventHandlers);

  var InitialNodeState = util.extendClass(StateEventHandlers, function (ctx) {
    //show menu
    this.mouseover = function () {
      if (mouse.dragState.state !== util.DRAG_STATES.NONE) {
        return;
      }

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;

      //move node to front to make sure menu is not
      //hidden by overlapping elements
      var nodes = ctx.$parent.nodes;

      if (ctx.$index < ( nodes.length - 1 )) {
        nodes.push(nodes.$remove(ctx.$index));
      }
    };

    //hide menu
    this.mouseout = function () {
      if (mouse.dragState.state !== util.DRAG_STATES.NONE) {
        return;
      }

      ctx.fixed = false;
    };

    //drag node
    this.dragstart = function (e) {
      // to stop drag event from propagating to panning handler on svg
      e.stopPropagation();

      if (e.target !== ctx.$$.nodeCircle) {
        return;
      }

      // to stop cursor from default
      e.preventDefault();

      ctx.px = ctx.x;
      ctx.py = ctx.y;

      ctx.menu = false;

      util.animationFrame(function() {
        ctx.$el.nearestViewportElement
            .style.setProperty('cursor', 'move');
      });
    };

    this.drag = function (e) {
      var p = util.transformPointFromClientToEl(
          e.clientX, e.clientY, ctx.$el);

      ctx.px = ctx.x = p.x;
      ctx.py = ctx.y = p.y;

      ctx.state.$layout.resume();
    };

    this.dragend = function () {
      ctx.menu = true;

      util.animationFrame(function() {
        ctx.$el.nearestViewportElement.style.setProperty('cursor', 'auto');
      });
    };
  });

  var LinkingNodeState = util.extendClass(InitialNodeState, function (ctx) {
    //select node target
    this.mouseover = function () {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      util.animationFrame(function() {
        ctx.$el.querySelector('.node-circle')
            .classList
            .add('node-linking-target', 'hover');
      });

      ctx.px = ctx.x;
      ctx.py = ctx.y;
      ctx.fixed = true;
    };

    //unselect node target
    this.mouseout = function (e) {
      if (ctx.id == mouse.data.source.id) {
        return;
      }

      util.animationFrame(function() {
        ctx.$el.querySelector('.node-circle')
            .classList
            .remove('node-linking-target', 'hover');
      });

      ctx.fixed = false;
    };

    //set link target
    this.click = function () {
      var sourceCtx = mouse.data.source;

      if (sourceCtx.id != ctx.id) {
        ctx.$parent
            .createLink({ source: sourceCtx, target: ctx })
            .then(function () {
              ctx.state.$layout.resume();
            });
      }
      else {
        ctx.state.$layout.resume();
      }

      sourceCtx.$.ghostLink.$destroy(true);
      sourceCtx.$.ghostLink = null;

      util.animationFrame(function() {
        ctx.$el.querySelector('.node-circle')
            .classList
            .remove('node-linking-target', 'hover');

        sourceCtx.$el.querySelector('.node-circle')
            .classList
            .remove('node-linking-source');
      });

      sourceCtx.fixed = false;

      state.nodeState = 'initial';
      mouse.data.source = null;
    };
  });

  Vue.component('x-node', {

    inherit: true,

    replace: true,

    template: document.getElementById('graph.node').innerHTML,

    data: function () {
      return {
        label: 'Label',
        menu: false,
        labelDistance: 15,
        radius: 1.5,
        labelX: 0,
        labelY: 0,
        labelTranslate: 'translate(0, 0)',
        nodeTranslate: 'translate(0, 0)',
        fixed: false //d3.force doesn't pick it up if not explicitly linked
      };
    },

    computed: {

      nodeTranslate: function() {
        return 'translate(' + this.x + ',' + this.y + ')';
      },

      labelTranslate: function() {
        return 'translate(' + this.labelX + ',' + this.labelY + ')';
      }

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
        var self = this;

        e.stopPropagation();

        util.animationFrame(function() {
          self.$el.querySelector('.node-circle')
              .classList
              .add('node-linking-source');
        });

        this.menu = false;
        this.fixed = true;

        state.nodeState = 'linking';
        mouse.data.source = this;

        var ghostLink = this.$.ghostLink = new GhostLinkComponent({
          data: { linkSource: this }
        }).$mount();

        var dynamicContent = this.$parent.$$.dynamicContent;

        util.animationFrame(function() {
          ghostLink.$appendTo(dynamicContent);
        });
      },

      getState: function () {
        return this.$states[ state.nodeState ];
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
        this.$states = {
          initial: new InitialNodeState(this),
          linking: new LinkingNodeState(this),
          disabled: new DisabledNodeState(this)
        };

        this.state = this.$parent.state;

        this.$watch('x', this.updateLable.bind(this));
        this.$watch('labelDistance', this.updateLable.bind(this));
        this.$watch('radius', this.updateLable.bind(this));
      },

      'hook:ready': function () {
        var $nodeGroup = util(this.$$.nodeCircle);

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

    replace: true,

    template: document.getElementById('graph.link').innerHTML,

    methods: {

      freezePosition: function () {
        if (state.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        var source = this.source,
            target = this.target;

        source.px = source.x;
        source.py = source.y;
        source.fixed = true;

        target.px = target.x;
        target.py = target.y;
        target.fixed = true;

        util.animationFrame(function() {
          self.$el.querySelector('.link')
              .classList
              .add('hover');
        });
      },

      releasePosition: function () {
        if (state.nodeState !== 'initial' ||
            mouse.dragState.state !== util.DRAG_STATES.NONE) {
          return;
        }

        var self = this;

        this.source.fixed = false;
        this.target.fixed = false;

        util.animationFrame(function() {
          self.$el.querySelector('.link')
              .classList
              .remove('hover');
        });
      },

      dragstart: function (e) {
        if (state.nodeState != 'initial') {
          return;
        }

        e.stopPropagation();
        e.preventDefault(); //to stop browser from turning
                            // the cursor into type selection

        var self = this;

        var source = this.source,
            target = this.target;

        this.source_x = source.px = source.x;
        this.source_y = source.py = source.y;

        this.target_x = target.px = target.x;
        this.target_y = target.py = target.y;

        util.animationFrame(function() {
          self.$el.nearestViewportElement
              .style
              .setProperty('cursor', 'move');
        });
      },

      drag: function (e) {
        if (state.nodeState != 'initial') {
          return;
        }

        var source = this.source,
            target = this.target;

        var v = util.transformVectorFromClientToEl(
            e.dx, e.dy, this.$el);

        source.px = source.x = this.source_x + v.x;
        source.py = source.y = this.source_y + v.y;

        target.px = target.x = this.target_x + v.x;
        target.py = target.y = this.target_y + v.y;

        this.state.$layout.resume();
      },

      dragend: function() {
        var self = this;

        util.animationFrame(function() {
          self.$el.querySelector('.link')
              .classList
              .remove('hover');

          self.$el.nearestViewportElement
              .style
              .setProperty('cursor', 'auto');
        });
      }

    },

    events: {

      'hook:ready': function () {
        this.state = this.$parent.state;

        var $g = util(this.$el);
        $g.on('mouseover', this.freezePosition.bind(this));
        $g.on('mouseout', this.releasePosition.bind(this));
        $g.on('dragstart', this.dragstart.bind(this));
        $g.on('drag', this.drag.bind(this));
        $g.on('dragend', this.dragend.bind(this));
      }

    }

  });

  var GraphComponent = Vue.extend({

    data: function () {
      return {
        nodes: [ ],
        links: [ ],
        width: 0,
        height: 0,
        minX: 0,
        minY: 0,
        cmX: 0,
        cmY: 0
      };
    },

    computed: {

      viewBox: function () {
        return this.minX + ' ' + this.minY + ' ' + this.width + ' ' + this.height;
      }

    },

    methods: {

      toggleForce: function () {
        var layout = this.state.layout;
        layout.enabled = !layout.enabled;
      },

      resize: function () {
        var newWidth = util.width(this.$el),
            newHeight = util.height(this.$el);

        if (this.width == newWidth &&
            this.height == newHeight) {
          return;
        }

        var layout = this.state.$layout;
        layout.size([ newWidth, newHeight ]);
        layout.resume();

        this.width = newWidth;
        this.height = newHeight;
      },

      panStart: function () {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        this._pMinX = this.minX;
        this._pMinY = this.minY;

        util.animationFrame(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        this.minX = this._pMinX - e.dx;
        this.minY = this._pMinY - e.dy;
      },

      panEnd: function() {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        util.animationFrame(function() {
          self.$el.style.setProperty('cursor', 'auto');
        });
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

        e.stopImmediatePropagation();

        util.ajax({
          url: '/hypernode/' + nodeId,
          type: 'DELETE',
          success: function () {
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

      contextMenu: function (e) {
        if (e.target != this.$el) return;

        e.stopPropagation();
        e.preventDefault();

        var contextMenu = this.$.contextMenu;
        contextMenu.show(e.clientX, e.clientY);

        var closeContextMenu = function () {
          contextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      }

    },

    events: {

      'data': function(nodes, links) {
        this.nodes = nodes;
        this.links = links;

        this.state.$layout
            .nodes(nodes)
            .links(links)
            .start();
      },

      'hook:created': function () {
        var layout = this.state.$layout;

        // TODO: unwatch when component is destroyed

        this.$watch('state.nodes', function (value, mutation) {
          if (!mutation) return;

          layout.force.nodes(value);
          layout.start();
        }, false, true);

        this.$watch('state.links', function (value, mutation) {
          if (!mutation) return;

          layout.force.links(value);
          layout.start();
        }, false, true);

        window.addEventListener('resize', this.resize.bind(this));
      },

      'hook:ready': function() {
        var self = this;

        var $svg = util(this.$el);
        $svg.on('dragstart', this.panStart.bind(this));
        $svg.on('drag', this.pan.bind(this));
        $svg.on('dragend', this.panEnd.bind(this));

        this.$.contextMenu = new ContextMenu({
          methods: {
            addNode: function(e) {
              var p = util.transformPointFromClientToEl(e.clientX, e.clientY, self.$el);

              var nodePanel = new NodePanel({
                data: {
                  node: {
                    clientDisplay: {
                      x: p.x,
                      y: p.y
                    }
                  }
                }
              });

              sidebar.setPanel(nodePanel);
            }
          }
        });

        this.$.contextMenu.$mount('#contextMenu');

        this.resize();
      }

    }

  });

  var NodePanel = Vue.extend({

    replace: true,

    template: '#node.panel',

    data: function() {
      return {
        isNew: false,
        editingLabel: false,
        labelCache: '',
        node: {
          label: 'Label'
        }
      };
    },

    methods: {

      save: function() {
        if (this.isNew) {
          var p = util.transformPointFromClientToEl(this.node.x, this.node.y, self.$el);

          Node.create(hypergraphID, { clientDisplay: { x: p.x, y: p.y } })
              .done(function(node) { self.nodes.push(node); });
        }
      },

      editLabel: function() {
        this.editingLabel = true;
        this.labelCache = this.node.label;

        var $labelInput = this.$$.labelInput;
        util.animationFrame(function() {
          $labelInput.focus();
        });
      },

      updateLabel: function() {
        if (!this.editingLabel) return; //blur is called redundantly after 'enter' and 'esc' action

        this.editingLabel = false;
      },

      cancelLabelUpdate: function() {
        this.editingLabel = false;
        this.node.label = this.labelCache;
      },

      addText: function() {},

      addPhone: function() {},

      addEmail: function() {},

      addLink: function() {}

    }

  });

  var Sidebar = Vue.extend({

    methods: {

      setPanel: function(panel) {
        this.$.currentPanel = panel;
        panel.$mount();
        panel.$appendTo(this.$el);
      }

    }

  });

  var ContextMenu = Vue.extend({

    data: function() {
      return { x: 0, y: 0 };
    },

    methods: {
      show: function(x, y) {
        this.x = x;
        this.y = y;

        var $el = this.$el;

        $el.classList.add('show');
        $el.classList.remove('hidden');

        $el.style.left = x + 'px';
        $el.style.top = y + 'px';
        $el.style.position = 'absolute';
      },
      hide: function() {
        var $el = this.$el;

        $el.classList.add('hidden');
        $el.classList.remove('show');
      }
    }

  });

  /*
   Main application code
   */

  var graphComponent = new GraphComponent({ data: { state: state } });
  graphComponent.$mount('#graph');

  var navbarComponent = new NavbarComponent({ data: { state: state } });
  navbarComponent.$mount('#navbar');

  var sidebar = new Sidebar();
  sidebar.$mount('#sidebar');

  util.when(Node.fetchAll(hypergraphID), Link.fetchAll(hypergraphID))
      .done(function (nodes, links) {
        nodes.forEach(function (n) {
          links.forEach(function (l) {
            if (l.sourceId == n.id) l.source = n;
            if (l.targetId == n.id) l.target = n;
          });
        });

        nodesAry = nodes;
        linksAry = links;

        graphComponent.$add('nodes', nodes);
        graphComponent.$add('links', links);
        graphComponent.$emit('data', nodes, links);
      });
});