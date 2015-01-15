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

  var DisabledNodeState = util.extendClass(StateEventHandlers);

  var InitialNodeState = util.extendClass(StateEventHandlers, function (ctx) {
    var dragFlag = false;

    this.click = function() {
      if (dragFlag) {
        dragFlag = false;
        return;
      }

      var nodePanel = new NodePanel({
        data: {
          isNew: false,
          node: ctx.$data
        }
      });

      panelBar.setPanel(nodePanel);
    };

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

      dragFlag = true;

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
        Link.create(hypergraphID, { sourceId: sourceCtx.id, targetId: ctx.id, data: {} })
            .done(function(link) {
              //todo: add to linksAry
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
        name: 'Name',
        menu: false,
        nameDistance: 15,
        radius: 1.5,
        nameX: 0,
        nameY: 0,
        nameTranslate: 'translate(0, 0)',
        nodeTranslate: 'translate(0, 0)',
        fixed: false //d3.force doesn't pick it up if not explicitly linked
      };
    },

    computed: {

      nodeTranslate: function() {
        return 'translate(' + this.x + ',' + this.y + ')';
      },

      nameTranslate: function() {
        return 'translate(' + this.nameX + ',' + this.nameY + ')';
      }

    },

    methods: {

      delete: function() {
        var self = this;

        Node.delete(hypergraphID, this)
            .done(function() {
              nodesAry.$remove(self.$index);
            });
      },

      nodeContextMenu: function(e) {
        if (e.target != this.$$.nodeCircle) return;

        e.stopPropagation();
        e.preventDefault();

        nodeContextMenu.show(e.clientX, e.clientY, this);

        var closeContextMenu = function () {
          nodeContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

      updateNameTranslation: function () {
        var nameDistance = (this.radius * 12) + this.nameDistance;
        var bBox = this.$$.nodeName.getBBox();

        var dx = this.x - (this.$parent.width / 2),
            dy = this.y - (this.$parent.height / 2);

        var theta = Math.atan(dy / dx);
        var ratio = E_MINUS_1 * (1 - Math.abs(( theta % HALF_PI ) / HALF_PI));

        var shiftX = bBox.width * Math.log(ratio + 1) * (( dx > 0 ) ? 0.5 : -0.5),
            shiftY = bBox.y * -0.5;

        var tX = nameDistance * Math.cos(theta),
            tY = nameDistance * Math.sin(theta);

        if (dx < 0) {
          tX *= -1;
          tY *= -1;
        }

        this.nameX = tX + shiftX;
        this.nameY = tY + shiftY;
      },

      setLinkSource: function () {
        var self = this;

        util.animationFrame(function() {
          self.$el.querySelector('.node-circle')
              .classList
              .add('node-linking-source');
        });

        this.menu = false;
        this.fixed = true;

        state.nodeState = 'linking';
        mouse.data.source = this;

        var ghostLink = this.$.ghostLink =
            new GhostLinkComponent({ data: { linkSource: this } }).$mount();

        ghostLink.$appendTo(this.$parent.$$.dynamicContent);
      },

      getState: function () {
        return this.$states[ state.nodeState ];
      },

      mouseover: function () {
        return this.getState().mouseover.apply(state, arguments);
      },

      mouseout: function () {
        return this.getState().mouseout.apply(state, arguments);
      },

      click: function (e) {
        return this.getState().click.apply(state, arguments);
      },

      drag: function () {
        return this.getState().drag.apply(state, arguments);
      },

      dragstart: function () {
        return this.getState().dragstart.apply(state, arguments);
      },

      dragend: function () {
        return this.getState().dragend.apply(state, arguments);
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

        this.$watch('x', this.updateNameTranslation.bind(this));
        this.$watch('y', this.updateNameTranslation.bind(this));
        this.$watch('nameDistance', this.updateNameTranslation.bind(this));
        this.$watch('radius', this.updateNameTranslation.bind(this));
      },

      'hook:ready': function () {
        var $nodeGroup = util(this.$$.nodeCircle);

        $nodeGroup.on('click', this.click.bind(this));
        $nodeGroup.on('mouseover', this.mouseover.bind(this));
        $nodeGroup.on('mouseout', this.mouseout.bind(this));
        $nodeGroup.on('dragstart', this.dragstart.bind(this));
        $nodeGroup.on('drag', this.drag.bind(this));
        $nodeGroup.on('dragend', this.dragend.bind(this));

        this.updateNameTranslation();
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
                  isNew: true,
                  node: {
                    x: p.x,
                    y: p.y,
                    fixed: false
                  }
                }
              });

              panelBar.setPanel(nodePanel);
            },
            saveGraph: function() {
              Node.update(hypergraphID, nodesAry);
            }
          }
        });

        this.$.contextMenu.$mount('#graphContextMenu');

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
        hasChanges: false,
        editingName: false,
        nameCache: '',
        node: {
          data: {
            name: 'Name',
            properties: []
          }
        }
      };
    },

    computed: {

      propertyGroups: function() {
        return _.groupBy(this.node.data.properties, function(prop) {
          return prop.type;
        });
      }

    },

    methods: {

      closeNodePanel: function() {
        panelBar.removePanel();
      },

      validateInputChange: function() {
        var self = this;

        util.animationFrame(function() {
          var $addDropdownBtnEl = self.$$.addDropdownBtn;
          var propertyValue = self.$$.propertyValue.value;

          if (!propertyValue) {
            $addDropdownBtnEl.classList.add('disabled');
          }
          else {
            $addDropdownBtnEl.classList.remove('disabled');
          }
        });
      },

      addProp: function(propertyType) {
        var $propertyValueEl = this.$$.propertyValue;

        this.node.data.properties.push({
          value: $propertyValueEl.value,
          type: propertyType
        });

        $propertyValueEl.value = '';
        this.validateInputChange();
        this.hasChanges = true;
      },

      removeProp: function(propVm) {
        var propIndex = _.indexOf(this.node.data.properties, propVm.prop);

        if (propIndex < 0) {
          throw "Trying to remove property that apparently doesn't exist.";
        }

        this.node.data.properties.$remove(0);
        this.hasChanges = true;
      },

      createNode: function() {
        var self = this;

        Node.create(hypergraphID, this.node)
            .done(function(node) {
              self.hasChanges = false;
              self.isNew = false;
              nodesAry.push(node);
            });
      },

      saveNode: function() {
        var self = this;

        Node.update(hypergraphID, [ this.node ])
            .done(function(node) {
              self.hasChanges = false;
              //TODO: replace node in nodesAry??
            });
      },

      editName: function() {
        this.editingName = true;
        this.nameCache = this.node.data.name;

        var $nameInput = this.$$.nameInput;
        util.animationFrame(function() {
          $nameInput.focus();
        });
      },

      updateName: function() {
        if (!this.editingName) return; //blur is called redundantly after 'enter' and 'esc' action

        if (!this.node.name) {
          this.node.name = this.nameCache;
        }
        else {
          this.hasChanges = true;
        }

        this.editingName = false;
      },

      cancelNameUpdate: function() {
        this.editingName = false;
        this.node.data.name = this.nameCache;
      }

    },

    events: {

      'hook:created': function() {
        var node = this.node;

        if (!node.data) {
          this.$add('node.data', { properties: [] });
        }

        if (!node.data.properties) {
          this.$add('node.data.properties', []);
        }
      }

    }

  });

  var PanelBar = Vue.extend({

    methods: {

      removePanel: function() {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          //delete this.$.currentPanel;
        }
      },

      setPanel: function(panel) {
        if (this.$.currentPanel) {
          this.$.currentPanel.$destroy(true);
          delete this.$.currentPanel;
        }

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
        if (this.beforeShow) {
          this.beforeShow.apply(this, arguments);
        }

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

        if (this.afterHide) {
          this.afterHide.apply(this, arguments);
        }
      }

    }

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
        this.target = util.transformPointFromClientToEl(e.clientX, e.clientY, this.$el);
      }

    },

    events: {

      'hook:ready': function () {
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

  /*
   Main application code
   */

  var nodeContextMenu = new ContextMenu({

    methods: {

      /*
        Called with the arguements passed to show
        before the menu is actually shown.
       */
      beforeShow: function(x, y, node) {
        this.$.node = node;
      },

      afterHide: function() {
        this.$.node = null;
      },

      delete: function() {
        this.$.node.delete();
      },

      link: function() {
        this.$.node.setLinkSource();
      }

    },

    events: {

      'hook:created': function() {
        this.$.node = null;
      }

    }

  });

  nodeContextMenu.$mount('#nodeContextMenu');

  var graphComponent = new GraphComponent({ data: { state: state } });
  graphComponent.$mount('#graph');

  var navbarComponent = new NavbarComponent({ data: { state: state } });
  navbarComponent.$mount('#navbar');

  var panelBar = new PanelBar();
  panelBar.$mount('#panelBar');

  util.when(Node.fetchAll(hypergraphID), Link.fetchAll(hypergraphID))
      .done(function (nodes, links) {
        var toPrint = _.map(nodes, function(n) {
          return _.clone(n.data);
        });

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