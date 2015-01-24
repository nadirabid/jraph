define([
    'lodash',
    'mousetrap',
    'vue',
    'util',
    'globals',
    'models',
    'state',
    'navbar'
], function (
    _,
    Mousetrap,
    Vue,
    util,
    glob,
    models,
    State,
    NavbarComponent
) {
  'use strict';

  var HALF_PI = glob.HALF_PI;
  var E_MINUS_1 = glob.E_MINUS_1;

  var Node = models.Node;
  var Link = models.Link;

  var state = new State();
  var mouse = util.mouse;

  var hypergraphID = window.location.pathname.split('/')[2];

  function StateEventHandlers() {
    this.click = util.noop;
    this.dblclick = util.noop;
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

    this.dblclick = function() {
      var graphCmp = ctx.$parent;

      var minX = graphCmp.minX;
      var minY = graphCmp.minY;

      var width = graphCmp.width;
      var height = graphCmp.height;

      var p = util.transformPointFromViewportToEl(
          (width / 2),
          (height / 2),
          ctx.$el);

      var dx = p.x - ctx.x,
          dy = p.y - ctx.y;

      var iX = d3.interpolateRound(minX, minX - dx),
          iY = d3.interpolateRound(minY, minY - dy);

      var coff = Math.sqrt(dx*dx + dy*dy) / Math.sqrt(width*width + height*height);
      var animDuration = 1000 * Math.max(0.15, coff);

      var ease = d3.ease('sin');

      d3.timer(function (elapsed) {
        var t = elapsed / animDuration;
        var easedT = ease(t);

        graphCmp.minX = iX(easedT);
        graphCmp.minY = iY(easedT);

        return t > 1;
      });
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
      var ctm = ctx.$parent.$$.nodesAndLinksGroup.getScreenCTM();
      var p = ctx.$parent.$el.createSVGPoint();

      p.x = e.clientX;
      p.y = e.clientY;
      p = p.matrixTransform(ctm.inverse());

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
              graphComponent.nodes.forEach(function(n) {
                if (link.sourceId == n.id) link.source = n;
                if (link.targetId == n.id) link.target = n;
              });

              graphComponent.links.push(link);
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
              graphComponent.links = graphComponent.links.filter(function(l) {
                return l.sourceId != self.id && l.targetId != self.id;
              });

              graphComponent.nodes.$remove(self.$index);
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

      click: function () {
        return this.getState().click.apply(state, arguments);
      },

      dblclick: function() {
        return this.getState().dblclick.apply(state, arguments);
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
        var $nodeCircle = util(this.$$.nodeCircle);

        $nodeCircle.on('click', this.click.bind(this));
        $nodeCircle.on('mouseover', this.mouseover.bind(this));
        $nodeCircle.on('mouseout', this.mouseout.bind(this));
        $nodeCircle.on('dragstart', this.dragstart.bind(this));
        $nodeCircle.on('drag', this.drag.bind(this));
        $nodeCircle.on('dragend', this.dragend.bind(this));

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

      delete: function() {
        var self = this;

        Link.delete(hypergraphID, this)
            .done(function() {
              graphComponent.links.$remove(self.$index);
            });
      },

      linkContextMenu: function(e) {
        if (e.target != this.$$.arrowMarkerLine) return;

        e.stopPropagation();
        e.preventDefault();

        linkContextMenu.show(e.clientX, e.clientY, this);

        var closeContextMenu = function () {
          linkContextMenu.hide();
          window.removeEventListener('click', closeContextMenu);
        };

        window.addEventListener('click', closeContextMenu);
      },

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
        cmY: 0,
        zoomScale: 1
      };
    },

    methods: {

      zoomUpdate: function(e) {
        var nodesAndLinksGroupEl = this.$$.nodesAndLinksGroup;
        var zoomScale = Math.min(Math.max(0.5, this.zoomScale - (e.wheelDeltaY / 2200)), 1.5);

        if (zoomScale == this.zoomScale) {
          return;
        }

        this.zoomScale = zoomScale;

        var p = this.$el.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;

        p = p.matrixTransform(this.$el.getCTM().inverse());

        var k = this.$el.createSVGMatrix().translate(p.x, p.y).scale(zoomScale).translate(-p.x, -p.y);

        util.setCTM(nodesAndLinksGroupEl, k);
      },

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

        this._ctm = this.$$.nodesAndLinksGroup.getCTM();

        util.animationFrame(function() {
          self.$el.style.setProperty('cursor', 'move');
        });
      },

      pan: function (e) {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        util.setCTM(this.$$.nodesAndLinksGroup, this._ctm.translate(e.dx, e.dy));
      },

      panEnd: function() {
        if (this.state.nodeState === 'disabled') {
          return;
        }

        var self = this;

        this._ctm = null;

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

        this.resize();

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
              Node.update(hypergraphID, self.nodes);
            }
          }
        });

        this.$.contextMenu.$mount('#graphContextMenu');
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
        var $propertyInputGroupEl = this.$$.propertyInputGroup;
        var $propertyValueEl = this.$$.propertyValue;

        var validPropertyType = false;

        switch(propertyType) {
          case 'email':
            validPropertyType = util.validateEmail($propertyValueEl.value);
            break;
          case 'phone':
            validPropertyType = util.validatePhoneNumber($propertyValueEl.value);
            break;
          case 'link':
            validPropertyType = util.validateLink($propertyValueEl.value);
            break;
          default:
            validPropertyType = true; //case text
        }

        if (validPropertyType) {
          this.node.data.properties.push({
            value: $propertyValueEl.value,
            type: propertyType
          });

          this.validateInputChange();
          this.hasChanges = true;

          util.animationFrame(function() {
            $propertyValueEl.value = '';
            $propertyInputGroupEl.classList.remove('has-error');
          });
        }
        else {
          util.animationFrame(function() {
            $propertyInputGroupEl.classList.add('has-error');
          });
        }

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
              graphComponent.nodes.push(node);
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
          $nameInput.setSelectionRange(0, $nameInput.value.length);
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

      'hook:ready': function() {
        var node = this.node;

        if (!node.data) {
          this.$add('node.data', { properties: [] });
        }

        if (!node.data.properties) {
          this.$add('node.data.properties', []);
        }

        if (this.isNew) {
          this.editName();
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

  // ready components

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

    }

  });

  nodeContextMenu.$mount('#nodeContextMenu');

  var linkContextMenu = new ContextMenu({

    methods: {

      beforeShow: function(x, y, link) {
        this.$.link = link;
      },

      afterHide: function() {
        this.$.link = null;
      },

      delete: function() {
        this.$.link.delete();
      }

    }

  });

  linkContextMenu.$mount('#linkContextMenu');

  var graphComponent = new GraphComponent({
    data: {
      state: state
    }
  });

  graphComponent.$mount('#graph');

  var navbarComponent = new NavbarComponent({
    data: {
      hypergraphID: hypergraphID,
      state: state
    }
  });
  navbarComponent.$mount('#navbar');

  var panelBar = new PanelBar();
  panelBar.$mount('#panelBar');

  // fetch data

  util.when(Node.fetchAll(hypergraphID), Link.fetchAll(hypergraphID))
      .done(function (nodes, links) {
        nodes.forEach(function (n) {
          links.forEach(function (l) {
            if (l.sourceId == n.id) l.source = n;
            if (l.targetId == n.id) l.target = n;
          });
        });

        graphComponent.$add('nodes', nodes);
        graphComponent.$add('links', links);
        graphComponent.$emit('data', nodes, links);
      });
});