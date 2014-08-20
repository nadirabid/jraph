var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var E_MINUS_1 = Math.E - 1;
var MOUSE_LEFT_BUTTON = 0;

StateEnum = Object.freeze({

	DEFAULT: 1 << 0,

	LINK_SOURCE: 1 << 1,

	LINK_TARGET: 1 << 2,

	PINNED: 1 << 3,

	ALL: ( 1 << 30 ) - 1

});

// Using this approach untill we can use
// Vue.filters( ... ) in the next release
Vue.options.filters.state = function( handler, state ) {
	if ( !handler || !state )
		return handler;

	state = state.toUpperCase();

	return function() {
		if ( this.state & StateEnum[ state ] )
			return handler.apply( this, arguments );
	};
};

// click:state(false)=pin
Vue.directive('bind', {

	update: function() {
		var self = this;
		var toks = this.expression.match( /^(\w+)?\s*\[\s*(\w+)?\s*=\s*(\w+)?\s*\]\s*:\s*(\w+)/ );
		var eventName = toks[1];
		var variable = toks[2];
		var watchValue = toks[3];
		var handler = this.vm[ toks[4] ];

		if ( this.handler ) {
			this.vm.$unwatch( this.variable, this.watcher );
			this.el.removeEventListener( this.eventName, this.handler );
			delete this.handler;
		}

		if ( typeof handler !== 'function' ) {
			console.warn( 'Directive expects a function for event handler.');
			return;
		}

		handler = handler.bind( this.vm );

		this.variable = variable;
		this.eventName = eventName;

		this.watcher = function( val ) {
			if ( !self.handler && val == watchValue ) {
				self.el.addEventListener( eventName, handler );
				self.handler = handler;
			}
			else if ( self.handler ) {
				self.el.removeEventListener( eventName, handler );
				delete self.handler;
			}
		};

		this.vm.$watch( variable, this.watcher );


		if ( this.vm[ variable ] == watchValue ) {
			this.el.addEventListener( eventName, handler );
			this.handler = handler;
		}
	},

	unbind: function() {
		this.vm.$unwatch( this.variable, this.watcher );
		if ( this.handler ) {
			this.el.removeEventListener( this.eventName, this.handler );
			delete this.handler;
		}
	}

});

Vue.directive('svg-events', {

	isEmpty: true,

	bind: function() {
		var X_MOUSEENTER = 'x-mouseenter';
		var X_MOUSELEAVE = 'x-mouseleave';
		var X_CLICK = 'x-click';
		var X_DRAG = 'x-drag';
		var X_DRAGSTART = 'x-dragstart';
		var X_DRAGEND = 'x-dragend';

		var el = this.el;
		var mdElX, mdElY = 0;
		var elX, elY = 0;
		var dragFlag = false;

		function extractEventDetail( e ) {
			var detail = {
				x: e.x,
				y: e.y,
				button: e.button
			};

			return { detail: detail };
		}

		function mousemove( e ) {
			if ( !dragFlag ) {
				var dX = Math.abs( mdElX - e.x );
				var dY = Math.abs( mdElY - e.y );
				var distSqrd = dX*dX + dY*dY;

				if ( distSqrd > 3 ) {
					var xDragStartEvent = new CustomEvent( X_DRAGSTART, extractEventDetail( e ) );
					el.dispatchEvent( xDragStartEvent );
					dragFlag = true;
				}
			}
			else {
				var xEvent = new CustomEvent( X_DRAG, extractEventDetail( e ) );
				el.dispatchEvent( xEvent );
			}
		}

		function mouseup( e ) {
			document.removeEventListener( 'mousemove', mousemove );
			document.removeEventListener( 'mouseup', mouseup );

			if ( !dragFlag )
				return;

			elX = e.x;
			elY = e.y;

			if ( elX < 0 || elY < 0 || elX > window.innerWidth || elY > window.innerHeight ) {
				dragFlag = false;

				var xEvent = new CustomEvent( X_MOUSELEAVE, extractEventDetail( e ) );
				el.dispatchEvent( xEvent );
			}

			var xEvent = new CustomEvent( X_DRAGEND, extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		}

		this._mouseenter = function( e ) {
			if ( dragFlag )
				return;

			var xEvent = new CustomEvent( X_MOUSEENTER, extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		};

		this._mouseleave = function( e ) {
			if ( dragFlag )
				return;

			var xEvent = new CustomEvent( X_MOUSELEAVE, extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		};

		this._mousedown = function( e ) {
			if ( e.button != MOUSE_LEFT_BUTTON )
				return;

			mdElX = elX = e.x;
			mdElY = elY = e.y;

			document.addEventListener( 'mousemove', mousemove );
			document.addEventListener( 'mouseup', mouseup );
		};

		this._click = function( e ) {
			if ( dragFlag ) {
				dragFlag = false;
			}
			else {
				var xEvent = new CustomEvent( X_CLICK, extractEventDetail( e ) );
				el.dispatchEvent( xEvent );
			}
		};

		el.addEventListener( 'mouseenter', this._mouseenter );
		el.addEventListener( 'mouseleave', this._mouseleave );
		el.addEventListener( 'mousedown', this._mousedown );
		el.addEventListener( 'click', this._click );
	},

	unbind: function() {
		var el = this.el;
		el.removeEventListener( 'mouseenter', this._mouseenter );
		el.removeEventListener( 'mouseleave', this._mouseleave );
		el.removeEventListener( 'mousedown', this._mousedown );
		el.removeEventListener( 'click', this._click );
	}

});

Vue.component('x-radial-button', {

	template: '#template-radial-button',

	replace: true,

	data: {

		x: 0,

		dy: 0,

		highlightDistance: 2,

		highlightThickness: 4,

		radiusInner: 40,

		radiusOuter: 80,

		startAngle: 0,

		endAngle: 0

	},

	computed: {

		backgroundPath: function() {
			var arc = d3.svg.arc()
					.innerRadius( this.radiusInner )
					.outerRadius( this.radiusOuter )
					.startAngle( this.startAngle + HALF_PI )
					.endAngle( this.endAngle + HALF_PI );

			return arc();
		},

		highlightPath: function() {
			var arc = d3.svg.arc()
					.innerRadius( this.radiusInner - this.highlightDistance )
					.outerRadius( this.radiusInner - this.highlightDistance - this.highlightThickness )
					.startAngle( this.startAngle + HALF_PI )
					.endAngle( this.endAngle + HALF_PI );

			return arc();
		},

		textPath: function() {
			var radiusInner = this.radiusInner,
					radiusOuter = this.radiusOuter,
					startAngle	= this.startAngle,
					endAngle    = this.endAngle;

			var midRadius = radiusInner + ( ( radiusOuter - radiusInner ) / 2 );
			var midAngle = startAngle + ( ( endAngle - startAngle ) / 2 );

			var reverse = midAngle > 0 && midAngle < Math.PI;
			
			var arcData = {
				x0		: midRadius * Math.cos( reverse ? endAngle : startAngle ),
				y0		: midRadius * Math.sin( reverse ? endAngle : startAngle ),
				r 		: midRadius,
				large : ( endAngle - startAngle > Math.PI ) ? 1 : 0,
				sweep : reverse ? 0 : 1,
				x1 		: midRadius * Math.cos( reverse ? startAngle : endAngle ),
				y1 		: midRadius * Math.sin( reverse ? startAngle : endAngle )
			};

			var arcPath = "M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}";
			return _.template( arcPath, arcData );
		}

	},

	directives: {

		//val is considered to be in pixels
		'radius-inner': function( val ) {
			val = Number.isInteger( val ) ? val : parseInt( this.expression, 10 );

			if ( Number.isNaN( val ) || val < 0 )
				throw "v-inner-radius need to specify a valid positive integer";

			this.vm.radiusInner = val;
		},

		//val is considered to be in pixels
		'radius-outer': function( val ) {
			val = Number.isInteger( val ) ? val : parseInt( this.expression, 10 );

			if ( Number.isNaN( val ) || val < 0 )
				throw "v-outer-radius need to specify a valid positive integer";

			this.vm.radiusOuter = val;
		},

		'highlight-thickness': function( val ) {
			val = Number.isInteger( val ) ? val : parseInt( this.expression, 10 );

			if ( Number.isNaN( val ) || val < 0 )
				throw "v-highlight-thickness need to specify a valid positive integer";

			this.vm.highlightThickness = val;
		},

		'highlight-distance': function( val ) {
			val = Number.isInteger( val ) ? val : parseInt( this.expression, 10 );

			if ( Number.isNaN( val ) || val < 0 )
				throw "v-highlight-distance need to specify a valid positive integer";

			this.vm.highlightDistance = val;
		}

	},

	methods: {

		updateX: function() {
			var endAngle 		= this.endAngle,
					startAngle 	= this.startAngle,
					radiusInner = this.radiusInner,
					radiusOuter = this.radiusOuter;
			
			this.x = ( ( endAngle - startAngle ) / 2 ) * ( radiusInner + ( ( radiusOuter - radiusInner ) / 2 ) );
		},

		updateY: function() {
		  var fontSize = window.getComputedStyle( this._textElement )
		  										 .getPropertyValue( 'font-size' );

			this.dy = parseInt( fontSize, 10 ) / 3;
		}

	},

	created: function() {
		this.id = _.uniqueId( 'radial_button_' );
	},

	ready: function() {
		this._textElement = this.$el.querySelector( '.node-menu-item-label' );
		this.label = this._textElement.textContent.trim();

		this.$parent.buttonVms.push( this );
	},

	attached: function() {
		this.updateY();
		this.updateX();
	}

});

Vue.component('x-radial-menu', {

	template: '#template-radial-menu',

	replace: true,

	methods: {

		calcButtonAngles: function() {
			var totalLetters = this.buttonVms.reduce(function( sum, vm ) {
				return sum + vm.label.length;
			}, 0);

			this.buttonVms.forEach(function( vm, index, buttonVms ) {
				vm.startAngle = index ? buttonVms[ index - 1 ].endAngle : 0;
				vm.endAngle = vm.startAngle + ( vm.label.length / totalLetters ) * TWO_PI;
			});
		}

	},

	created: function() {
		this.buttonVms = [ ];
	},

	ready: function() {
		this.calcButtonAngles();
	}

});

Vue.component('x-node', {

	data: {

		shared: {

			activeNode: false,

			state: StateEnum.DEFAULT

		},

		state: StateEnum.DEFAULT,

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
			var ratio = E_MINUS_1 * ( 1 - Math.abs( theta % HALF_PI / HALF_PI ) );
			
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

		holdNode: function() {
			this.px = this.x;
			this.py = this.y;
			this.fixed = true;
		},

		releaseNode: function() {
			this.fixed = false;
		},

		setLinkSource: function() {
			var id = this.id;

			this.menu = false;
			this.fixed = true;
			this.shared.activeNode = this.id;
			this.state = StateEnum.LINK_SOURCE;
			this.shared.link = { source: this };

			this.$parent.$.nodeVms.forEach(function( vm ) {
				if ( id == vm.id ) {
					vm.$el.classList.add( 'node-circle-link-source' );
				}
				else {
					vm.state = StateEnum.LINK_TARGET;
					vm.$el.classList.add( 'node-circle-link-hover' );
				}
			});
		},

		setLinkTarget: function() {
			var link = this.shared.link;
			var linkFromId = this.shared.activeNode;

			link.target = this;

			this.$parent.$.nodeVms.forEach(function( vm ) {
				if ( linkFromId == vm.id ) {
					vm.$el.classList.remove( 'node-circle-link-source' );
					vm.fixed = false;
					vm.shared.activeNode = false;
					vm.shared.link = null;
				}
				else {
					vm.$el.classList.remove( 'node-circle-link-hover' );
				}

				vm.state = StateEnum.DEFAULT;
			});

			this.$parent.createLink( link );
		},

		showMenu: function() {
			// check shared.activeNode to make sure that we aren't 
			// already displaying a menu on another node
			if ( this.shared.activeNode && this.shared.activeNode != this.id )
				return;
			
			this.px = this.x;
			this.py = this.y;
			this.fixed = true;
			this.menu = true;
			this.shared.activeNode = this.id;

			//move node to front to make sure menu is not 
			//hidden by overlapping elements
			var nodes = this.$parent.nodes;

			if ( this.$index < ( nodes.length - 1 ) )
				nodes.push( nodes.$remove( this.$index ) );
		},

		hideMenu: function() {
			if ( this.shared.activeNode && this.shared.activeNode != this.id )
				return;

			this.fixed = false;
			this.menu = false;
			this.shared.activeNode = false;
		},

		dragStart: function( e ) {
			this.menu = false;
			this.fixed = true;
		},

		drag: function( e ) {
			this.x = this.px = e.detail.x;
			this.y = this.py = e.detail.y;

			this._forceResume();
		},

		dragEnd: function( e ) {
			this.menu = true;
		},

		deleteNode: function() {
			this.$parent.deleteNode( this.id );
		},

		pin: function( e ) {
			var self = this;
			var $node = d3.select( self.$el );
			var transitionDuration = 400;

			this.state = StateEnum.PINNED;
			this.menu = false;
			this.radius += 12;
			this.labelDistance += 12;

			var nx = ( this.$parent.width / 2 ) + 10,
					ny = this.$parent.height / 2 - 10;
			var iX = d3.interpolateRound( this.x, nx ),
					iY = d3.interpolateRound( this.y, ny );

			$node
					.transition()
					.duration( transitionDuration )
					.attrTween('transform' , function() {
						return function( t ) {
							var x = self.x = self.px = iX( t ),
									y = self.y = self.py = iY( t );

							self._forceResume();
							return 'translate(' + x + ',' + y + ')';
						};
					});

			this.$dispatch( 'showNodeData', this.$data );
			this._forceResume();

			Mousetrap.bind('esc', function() {
				self.shared.activeNode = false;
				self.state = StateEnum.DEFAULT;
				self.fixed = false;
				self.radius -= 12;
				self.labelDistance -= 12;

				Mousetrap.unbind( 'esc' );
				self.$dispatch( 'hideNodeData' );
			});
		}

	},

	ready: function() {
		var self = this;

		//can we get by with not watching y
		this.$watch( 'x', this.updateLable.bind( this ) );
		this.$watch( 'labelDistance', this.updateLable.bind( this ) );
		this.$watch( 'radius', this.updateLable.bind( this ) );

		this._textElement = this.$el.querySelector( '.node-label' );
		this._forceResume  = this.$parent._forceResume;
	},

	beforeDestroy: function() {
		this.menu = false;
		this.fixed = false;
		this.state = StateEnum.DEFAULT;
		this.shared.state = StateEnum.DEFAULT;
		this.shared.activeNode = false;
	}

});

Vue.component('x-link', {

	data: {

		state: 'some_state'

	},

	methods: {

		testHandler: function() {
			this.state = 'some_other_state';
			console.log( 'testHandler', this.state );
		}

	}

});

Vue.component('x-graph', {

	data: {

		nodes: [ ], 

		links: [ ]

	},

	methods: {

		resize: function() {
			this.$data.width = $( window ).innerWidth();
			this.$data.height = $( window ).innerHeight();

			this._force.size( [ this.width, this.height ] );
			this._forceResume();
		},

		createLink: function( link ) {
			var self = this;

			var linkJson = {
				sourceId: link.source.id,
				targetId: link.target.id
			};

			$.ajax({
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
				data: JSON.stringify( ),
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

		self.width = $( window ).innerWidth();
		self.height = $( window ).innerHeight();
		
		self._force = d3.layout.force()
				.size( [ self.width , self.height ] )
				.theta( .1 )
				.friction( .5 )
				.gravity( .6 )
				.charge( -6000 )
				.linkDistance( 100 )
				.chargeDistance( 700 );

		var forceStart = self._force.start.bind( this._force );
		self._forceStart = _.throttle( forceStart, 1200 );

		var forceResume = self._force.resume.bind( this._force );
		self._forceResume  = _.throttle( forceResume, 1200 );

		window.addEventListener( 'resize', this.resize.bind( this ) );

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
	}

});

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
					self.displayNodeCreate = false;
				}
			});
		}

	},

	created: function() {
		var self = this;
		
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

var app = new Vue({

	el: '#application',

	data: {

		nodes: [ ],
		
		links: [ ]
	
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
		var nodesPromise = self.fetchNodes();
		var linksPromise = self.fetchLinks();

		$.when( nodesPromise, linksPromise ).done(function( nodes, links ) {
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

		self.$on( 'showNodeData', self.showNodeData.bind( this ) );
	}

});