var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var E_MINUS_1 = Math.E - 1;
var MOUSE_LEFT_BUTTON = 0;

function deepResolveIndex( obj, index ) {
	var resolve = function( o, i ) { return o ? o[i] : o; };
	return index.split( '.' ).reduce( resolve, obj );
}

function chainEvalVm( vm, varName ) {
	if ( !vm.$parent || deepResolveIndex( vm, varName ) )
		return vm;
	else 
		return chainEvalVm( vm.$parent, varName );
}

// click:state(false)=pin
Vue.directive('bind', {

	update: function() {
		var self = this;

		this.reset();

		var reqToks = this.expression.match( /^\s*([\-\w]+)\s*(?=\[|:)(?:[^:]*:\s*)(\w+)/ );
		var optToks = this.expression.match( /\[\s*([.\w]+)(?:\s*=\s*)(\w+)(?:\s*)(?=\])/ );

		var eventName = reqToks[ 1 ];
		var handlerName = reqToks[ 2 ];

		var handlerVm = chainEvalVm( this.vm, handlerName );
		var handler = handlerVm[ handlerName ];

		if ( typeof handler !== 'function' || !reqToks ) {
			console.error( 'Directive expects a function for event handler.', handler );
			return;
		}

		handler = handler.bind( handlerVm );
		this.eventName = eventName;

		if ( !optToks ) {
			this.el.addEventListener( eventName, handler );
			this.handler = handler;
		}
		else {
			var varName = optToks[ 1 ];
			var watchValue = optToks[ 2 ];
			var watchVm = chainEvalVm( this.vm, varName );

			this.watchVm = watchVm;
			this.varName = varName;

			if ( watchVm[ varName ] == watchValue ) {
				this.el.addEventListener( eventName, handler );
				this.handler = handler;
			}

			this.watcher = function( val ) {
				if ( val == watchValue && !self.handler ) {
					self.el.addEventListener( eventName, handler );
					self.handler = handler;
				}
				else if ( val != watchValue && self.handler ) {
					self.el.removeEventListener( eventName, handler );
					delete self.handler;
				}
			};

			watchVm.$watch( varName, this.watcher );
		}

	},

	unbind: function() {
		this.reset();
	},

	reset: function() {
		if ( this.watchVm ) {
			this.watchVm.$unwatch( this.varName, this.watcher );	
			delete this.watcher;
		}
		
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
		var mdx, mdy = 0;
		var px, py = 0;
		var dragFlag = false;
		var mouseOnElFlag = false;

		function _extractEventDetail( e ) {
			var x = e.x,
					y = e.y;

			var detail = {
				x: x,
				y: y,
				dx: x - px,
				dy: y - py,
				button: e.button
			};

			return { detail: detail };
		}

		function _mousemove( e ) {
			if ( !dragFlag ) {
				var dx = Math.abs( e.x - mdx );
				var dy = Math.abs( e.y - mdy );
				var distSqrd = dx*dx + dy*dy;

				if ( distSqrd > 2 ) {
					var xDragStartEvent = new CustomEvent( X_DRAGSTART, _extractEventDetail( e ) );
					el.dispatchEvent( xDragStartEvent );
					dragFlag = true;
				}
			}
			else {
				var xEvent = new CustomEvent( X_DRAG, _extractEventDetail( e ) );
				el.dispatchEvent( xEvent );
			}

			px = e.x;
			py = e.y;
		}

		function _mouseup( e ) {
			document.removeEventListener( 'mousemove', _mousemove );
			document.removeEventListener( 'mouseup', _mouseup );

			if ( !dragFlag )
				return;

			var x = e.x;
			var y = e.y;

			if ( !mouseOnElFlag || x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight ) {
				console.log( 'mouseOnElFlag', mouseOnElFlag );
				dragFlag = false;
				var xEvent = new CustomEvent( X_MOUSELEAVE, _extractEventDetail( e ) );
				el.dispatchEvent( xEvent );
			}

			var xEvent = new CustomEvent( X_DRAGEND, _extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		}

		this._mouseenter = function( e ) {
			mouseOnElFlag = true;
			if ( dragFlag ) 
				return;

			var xEvent = new CustomEvent( X_MOUSEENTER, _extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		};

		this._mouseleave = function( e ) {
			mouseOnElFlag = false;
			if ( dragFlag ) 
				return;

			var xEvent = new CustomEvent( X_MOUSELEAVE, _extractEventDetail( e ) );
			el.dispatchEvent( xEvent );
		};

		this._mousedown = function( e ) {
			if ( e.button != MOUSE_LEFT_BUTTON ) 
				return;

			px = mdx = e.x;
			py = mdy = e.y;

			document.addEventListener( 'mousemove', _mousemove );
			document.addEventListener( 'mouseup', _mouseup );
		};

		this._click = function( e ) {
			if ( dragFlag ) {
				dragFlag = false;
			}
			else {
				var xEvent = new CustomEvent( X_CLICK, _extractEventDetail( e ) );
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

			activeNode: false

		},

		state: 'default',

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

		freezePosition: function() {
			this.px = this.x;
			this.py = this.y;
			this.fixed = true;
		},

		releasePosition: function() {
			this.fixed = false;
		},

		setLinkSource: function() {
			var id = this.id;

			this.menu = false;
			this.fixed = true;
			this.shared.activeNode = this.id;
			this.state = 'link_source';
			this.shared.link = { source: this };

			this.$parent.$.nodeVms.forEach(function( vm ) {
				if ( id == vm.id ) {
					vm.$el.classList.add( 'node-circle-link-source' );
				}
				else {
					vm.state = 'link_target';
					vm.$el.classList.add( 'node-circle-link-hover' );
				}
			});
		},

		setLinkTarget: function() {
			if ( !this.shared.link )
				throw new 'Trying to set link target without setting source';

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

				vm.state = 'default';
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
			this.px = this.x = e.detail.x;
			this.py = this.y = e.detail.y;

			this.menu = false;
			this.fixed = true;
		},

		drag: function( e ) {
			this.px = this.x = e.detail.x;
			this.py = this.y = e.detail.y;

			this._forceResume();
		},

		dragEnd: function() {
			this.menu = true;
		},

		deleteNode: function() {
			this.$parent.deleteNode( this.id );
		},

		pin: function( e ) {
			var self = this;
			var $node = d3.select( self.$el );
			var transitionDuration = 200;

			this.state = 'pinned';
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
				self.state = 'default';
				self.fixed = false;
				self.radius -= 12;
				self.labelDistance -= 12;

				Mousetrap.unbind( 'esc' );
				self.$dispatch( 'hideNodeData' );
			});
		}

	},

	created: function() {
		this._forceResume = this.$parent._forceResume;
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
		this.state = 'default';
		this.shared.activeNode = false;
	}

});

Vue.component('x-link', {

	data: {

		data: 'default'

	},

	methods: {

		freezePosition: function() {
			var source = this.source,
					target = this.target;

			source.px = source.x;
			source.py = source.y;
			source.fixed = true;

			target.px = target.x;
			target.py = target.y;
			target.fixed = true;
		},

		releasePosition: function() {
			this.source.fixed = false;
			this.target.fixed = false;
		},

		dragStart: function( e ) {
			var source = this.source,
					target = this.target;

			source.menu = false;
			source.fixed = true;

			target.menu = false;
			target.fixed = true;

			this.drag( e );
		},

		drag: function( e ) {
			var dx = e.detail.dx,
					dy = e.detail.dy;
			var source = this.source,
					target = this.target;

			source.x += dx;
			source.y += dy;		
			source.px = source.x;
			source.py = source.y;

			target.x += dx;
			target.y += dy;
			target.px = target.x;
			target.py = target.y;

			this._forceResume();
		}

	},

	created: function() {
		this._forceResume  = this.$parent._forceResume;
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

		this.width = $( window ).innerWidth();
		this.height = $( window ).innerHeight();
		
		this._force = d3.layout.force()
				.size( [ this.width , this.height ] )
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
	}

});