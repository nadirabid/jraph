/*
	General global stuff
*/

var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var E_MINUS_1 = Math.E - 1;
var MOUSE_LEFT_BUTTON = 0;

document.mouse = { state: 'initial', data: { } };

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
};

var DisabledNodeState = extendClass( StateEventHandlers );

var InitialNodeState = extendClass(StateEventHandlers, function( ctx ) {
	//show menu
	this.mouseover = function( e ) {
		if ( e.mousedownFlag )
			return;

		ctx.px = ctx.x;
		ctx.py = ctx.y;
		ctx.fixed = true;
		ctx.menu = true;

		//move node to front to make sure menu is not 
		//hidden by overlapping elements
		var nodes = ctx.$parent.nodes;

		if ( ctx.$index < ( nodes.length - 1 ) )
			nodes.push( nodes.$remove( ctx.$index ) );
	};

	//hide menu
	this.mouseout = function( e ) {
		if ( e.mousedownFlag )
			return;

		ctx.fixed = false;
		ctx.menu = false;
	};

	// shift viewport to center node
	this.click = function() {
		var parent = ctx.$parent;

		var width = ctx.$parent.width;
				height = ctx.$parent.height;

		var minX = ctx.$parent.minX,
				minY = ctx.$parent.minY;

		var p = transformPointToEl( width / 2, height / 2, ctx.$el );

		var dx = p.x - ctx.x,
				dy = p.y - ctx.y;

		var iX = d3.interpolateRound( minX, minX - dx ),
				iY = d3.interpolateRound( minY, minY - dy );

		var animDuration = 250;
		var ease = d3.ease( 'quad' );

		d3.timer(function( elapsed ) {
			var t = elapsed / animDuration;
			var easedT = ease( t );
			
			ctx.$parent.minX = iX( easedT );
			ctx.$parent.minY = iY( easedT );

			return t > 1;
		});

		ctx.menu = false;
		ctx.radius += 12;
		ctx.labelDistance += 12;

		document.mouse.state = 'disabled';

		ctx._forceResume();
		
		ctx.$dispatch( 'showNodeData', ctx.$data );

		Mousetrap.bind('esc', function() {
			document.mouse.state = 'initial';

			ctx.fixed = false;
			ctx.radius -= 12;
			ctx.labelDistance -= 12;

			Mousetrap.unbind( 'esc' );

			ctx.$dispatch( 'hideNodeData' );
		});
	};

	//drag node
	this.drag = function( dx, dy, x, y, e ) {
  	var p = transformPointToEl( x, y, ctx.$el );

		ctx.px = ctx.x = p.x;
		ctx.py = ctx.y = p.y;

		ctx._forceResume();
	};

  this.dragstart = function( dx, dy, x, y, e ) {
  	var p = transformPointToEl( x, y, ctx.$el );

		ctx.px = ctx.x = p.x;
		ctx.py = ctx.y = p.y;

		ctx.menu = false;
		ctx.fixed = true;
	};

	this.dragend = function( e ) {
		ctx.menu = true;
	};
});

var LinkingNodeState = extendClass(InitialNodeState, function( ctx ) {
	//select node target
	this.mouseover = function( e ) {
		if ( e.mousedownFlag  || ctx.id == document.mouse.data.source.id  )
			return;

		ctx.$el.querySelector( '.node-circle' ).classList.add( 'node-linking-target', 'hover' );
		ctx.px = ctx.x;
		ctx.py = ctx.y;
		ctx.fixed = true;
	};

	//unselect node target
	this.mouseout = function( e ) {
		if ( e.mousedownFlag  || ctx.id == document.mouse.data.source.id )
			return;

		ctx.$el.querySelector( '.node-circle' ).classList.remove( 'node-linking-target', 'hover' );
		ctx.fixed = false;
	};

	//set link target
	this.click = function() {
		var source = document.mouse.data.source;

		if ( source.id != ctx.id ) {
			ctx.$parent
					.createLink( { source: source, target: ctx } )
					.then(function() {
						ctx._forceResume();
					});
		}
		else {
			ctx._forceResume();
		}

		document.mouse.state = 'initial';
		document.mouse.data.source = null;
		ctx.$el.querySelector( '.node-circle' ).classList.remove( 'node-linking-source' );
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

		updateLable: function() {
			var self = this;
			var labelDistance = self.radius + self.labelDistance;
			var bBox = self._textElement.getBBox();

			var dx = self.x - ( self.$parent.width  / 2 ),
					dy = self.y - ( self.$parent.height / 2 );

			var theta = Math.atan( dy / dx );
			var ratio = E_MINUS_1 * ( 1 - Math.abs( ( theta % HALF_PI ) / HALF_PI ) );
			
			var shiftX = bBox.width * Math.log( ratio + 1 ) * ( ( dx > 0 ) ? 0.5 : -0.5 ),
					shiftY = bBox.y * -0.5;

			var tX = labelDistance * Math.cos( theta ),
				  tY = labelDistance * Math.sin( theta );

			if ( dx < 0 ) {
				tX *= -1;
				tY *= -1;
			}

			self.labelX = tX + shiftX;
			self.labelY = tY + shiftY;
		},

		setLinkSource: function( e ) {
			this.$el.querySelector( '.node-circle' ).classList.add( 'node-linking-source' );

			this.menu = false;
			this.fixed = true;
			document.mouse.state = 'linking';
			document.mouse.data.source = this;

			e.stopPropagation();
		},

		getState: function() {
			return this._states[ document.mouse.state ];
		},

		mouseover: function() {
			var state = this.getState();
			return state.mouseover.apply( state, arguments );
		},

		mouseout: function() {
			var state = this.getState();
			return state.mouseout.apply( state, arguments );
		},

		click: function( e ) {
			var state = this.getState();
			return state.click.apply( state, arguments );
		},

		drag: function() {
			var state = this.getState();
			return state.drag.apply( state, arguments );
		},

		dragstart: function() {
			var state = this.getState();
			return state.dragstart.apply( state, arguments );
		},

		dragend: function() {
			var state = this.getState();
			return state.dragend.apply( state, arguments );
		}

	},

	created: function() {
		this._forceResume = this.$parent._forceResume;

		this._states = {

			initial: new InitialNodeState( this ),

			linking: new LinkingNodeState( this ),

			disabled: new DisabledNodeState( this )

		};
	},

	ready: function() {
		var self = this;

		//can we get by with not watching y
		this.$watch( 'x', this.updateLable.bind( this ) );
		this.$watch( 'labelDistance', this.updateLable.bind( this ) );
		this.$watch( 'radius', this.updateLable.bind( this ) );

		this._textElement = this.$el.querySelector( '.node-label' );
	},

	beforeDestroy: function() {
		this.menu = false;
		this.fixed = false;
	}

});

Vue.component('x-link', {

	methods: {

		freezePosition: function( e ) {
			if ( e.mousedownFlag || document.mouse.state != 'initial' )
				return;

			var source = this.source,
					target = this.target;

			source.px = source.x;
			source.py = source.y;
			source.fixed = true;

			target.px = target.x;
			target.py = target.y;
			target.fixed = true;

			this.$el.classList.add( 'hover' );
		},

		releasePosition: function( e ) {
			if ( e.mousedownFlag || document.mouse.state != 'initial' )
				return;

			this.source.fixed = false;
			this.target.fixed = false;

			this.$el.classList.remove( 'hover' );
		},

		dragstart: function( dx, dy, x, y, e ) {
			if ( document.mouse.state != 'initial' )
				return;

			var source = this.source,
					target = this.target;

			source.menu = false;
			source.fixed = true;

			target.menu = false;
			target.fixed = true;

			var v = transformVectorToEl( dx, dy, this.$el );

			this.source_x = source.px = source.x = source.x + v.x;
			this.source_y = source.py = source.y = source.y + v.y;

			this.target_x = target.px = target.x = target.x + v.x;
			this.target_y = target.py = target.y = target.y + v.y;
		},

		drag: function( dx, dy, x, y, e ) {
			if ( document.mouse.state != 'initial' )
				return;

			var source = this.source,
					target = this.target;

			var v = transformVectorToEl( dx, dy, this.$el );

			source.px = source.x = this.source_x + v.x;
			source.py = source.y = this.source_y + v.y;

			target.px = target.x = this.target_x + v.x;
			target.py = target.y = this.target_y + v.y;

			this._forceResume();
		}

	},

	created: function() {
		this._forceResume  = this.$parent._forceResume;
	}

});

var currentEvent = null;

Vue.component('x-graph', {

	data: {

		nodes: [ ], 

		links: [ ],

		width: 0,

		height: 0,

		minX: 0,

		minY: 0

	},

	methods: {

		resize: function() {
			var newWidth = $( this.$el ).width(),
					newHeight = $( this.$el ).height();

			if ( this.width == newWidth && this.height == newHeight ) 
				return;

			this._force.size( [ newWidth, newHeight ] );
			this._forceResume();

			this.width = newWidth;
			this.height = newHeight;
		},

		panStart: function( dx, dy, x, y, e ) {
			this.pMinX = this.minX;
			this.pMinY = this.minY;
		},

		pan: function( dx, dy, x, y, e ) {
			this.minX = this.pMinX - dx;
			this.minY = this.pMinY - dy;
		},

		createLink: function( link ) {
			var self = this;

			var linkJson = {
				sourceId: link.source.id,
				targetId: link.target.id
			};
			
			return $.ajax({
				url: '/hyperlink/',
				type: 'POST',
				contentType: 'application/json; charset=utf-8',
				data: JSON.stringify( linkJson ),
				success: function( response ) {
					var createdLink = response.data[0][0].data;

					self.nodes.forEach(function( n ) {
						if ( n.id == createdLink.sourceId ) createdLink.source = n;
						if ( n.id == createdLink.targetId ) createdLink.target = n;
					});

					self.links.push( createdLink );
				}
			});
		},

		deleteNode: function( nodeId ) {
			var self = this;
			
			$.ajax({
				url: '/hypernode/?id=' + nodeId,
				type: 'DELETE',
				contentType: 'application/json; charset=utf-8',
				success: function( response ) {
					self.links = self.links.filter(function( l ) {
						return l.sourceId != nodeId && l.targetId != nodeId;
					});

					self.nodes = self.nodes.filter(function( n ) {
						return n.id != nodeId;
					});
				}
			});
		}

	},

	created: function() {
		var self = this;

		this._force = d3.layout.force()
				.theta( .1 )
				.friction( .5 )
				.gravity( .6 )
				.charge( -8000 )
				.linkDistance( 50 )
				.chargeDistance( 3000 );

		var forceStart = this._force.start.bind( this._force );
		this._forceStart = _.throttle( forceStart, 1200 );

		var forceResume = this._force.resume.bind( this._force );
		this._forceResume  = _.throttle( forceResume, 1200 );

		this.$on('data', function( nodes, links ) {
			self.nodes = nodes;
			self.links = links;

			self._force
					.nodes( self.nodes )
					.links( self.links )
					.start();
		});

		this.$compiler.observer.on('change:nodes', function( value, mutation ) {
			if ( mutation ) {
				self._force.nodes( value );
				self._forceStart();
			}
		});

		this.$compiler.observer.on('change:links', function( value, mutation ) {
			if ( mutation ) {
				self._force.links( value );
				self._forceStart();
			}
		});
	},

	ready: function() {
		this.resize();
		window.addEventListener( 'resize', this.resize.bind( this ) );
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

		nodeDataList: function() {
			return _.map(this.nodeData, function( v, k ) { 
				return { key: k, value: v }; 
			});
		}

	},

	methods: {

		savePropertyHandler: function() {
			var self = this;

			if ( !self.key || self.key ) {
				self.keyHasError = !self.key;
				self.valueHasError = !self.value;
				return;
			}

			if ( !self.nodeData.data )
				self.nodeData.data = { };

			self.nodeData.data[ self.key ] = self.value;
			self.addProperty = false;

			$.ajax({
				url: '/hypernode/'+self.nodeData.id,
				type: 'PUT',
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify( { data: self.nodeData.data } ),
				success: function( response ) {
					var data = JSON.parse( response.data[0][0].data.data );
					self.nodeData.data = data;
				}
			});
		}

	},

	created: function() {
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

		addPropertyHandler: function() {
			var self = this;

			if ( !self.key || !self.value ) {
				self.keyHasError = !self.key;
				self.valueHasError = !self.value;
				return;
			}

			var data = self.data || { };
			data[ self.key ] = self.value;
			self.data = data;
		},

		createNodeHandler: function() {
			var self = this;

			$.ajax({
				url: '/hypernode/',
				type: 'POST',
				contentType: "application/json; charset=utf-8",
				data: JSON.stringify( { data: self.data } ),
				success: function( response ) {
					var data = response.data[0][0].data;
					data.data = JSON.parse( data.data );
					self.$parent.nodes.push( data );

					self.data = null;
					self.key = self.value = "";
					self.keyHasError = self.valueHasError = false;
					self.$parent.displayNodeCreate = false;
				}
			});
		}

	}

});

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

		showNodeData: function( data ) {
			var self = this;
			self.displayNodeData = true;
			self.nodeData = data;

			self.$on( 'hideNodeData', function() {
				Mousetrap.unbind( 'esc' );
				this.displayNodeData = false;
			});
		},

		fetchNodes: function() {
			var self = this;

			var nodesXhr = $.getJSON( '/hypernode' ).then(function( response ) {
				var nodes = _( response.data )
						.filter(function( datum ) {
							return datum[0] != null;
						})
						.map(function( datum ) {
							var data = datum[0].data;
							data.data = JSON.parse( data.data );
							return data;
						})
						.value();

				return nodes;
			});

			return nodesXhr;
		},

		fetchLinks: function() {
			var self = this;

			var linksXhr = $.getJSON( '/hyperlink' ).then(function( response ) {
				var links = _( response.data )
						.filter(function( datum ) {
							return datum[0] != null;
						})
						.uniq(function( datum ) {
							return datum[0].data.id;
						})
						.map(function( datum ) {
							var data = datum[0].data;
							return data;
						})
						.value();

				return links;
			});

			return linksXhr;
		}	

	},

	created: function() {
		var self = this;
		this._nodesPromise = this.fetchNodes();
		this._linksPromise = this.fetchLinks();

		$.when( this._nodesPromise, this._linksPromise ).done(function( nodes, links ) {
			nodes.forEach(function( n ) {
				links.forEach(function( l ) {
					if ( l.sourceId == n.id ) l.source = n;
					if ( l.targetId == n.id ) l.target = n;
				});
			});

			self.nodes = nodes;
			self.links = links;

			self.$broadcast( 'data', nodes, links );
		});

		this.$on( 'showNodeData', this.showNodeData.bind( this ) );

		this.$watch('displayNodeCreate', function( value ) {
			if ( !value )
				return;

			Mousetrap.bind('esc', function() {
				self.displayNodeCreate = false;
				Mousetrap.unbind('esc');
			});
		});
	}

});