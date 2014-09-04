/*
	General global stuff
*/

var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var E_MINUS_1 = Math.E - 1;
var MOUSE_LEFT_BUTTON = 0;


// Utils 

function noop() {

}

function setCTM(element, matrix) {
	var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + ","
										+ matrix.d + "," + matrix.e + "," + matrix.f + ")";

	element.setAttributeNS( null, "transform", s );
}

function extendClass( parentClass, childClass ) {
	function childClassWrapper() {
		parentClass.apply( this, arguments );
		return childClass.apply( this, arguments );
	}

	childClassWrapper.prototype = Object.create( parentClass.prototype );
	childClassWrapper.prototype.constructor = childClassWrapper;
	childClassWrapper.prototype.parent = parentClass.prototype;

	return childClassWrapper;
}

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

// Setup

document.mouse = {

	state: 'initial',

	data: { }

};

Vue.config({ silent: true });

//Definitions

(function() {

var mousedownFlag = false;

document.documentElement.addEventListener('mousedown', function() { mousedownFlag = true; }, true);
document.documentElement.addEventListener('mouseup', function() { mousedownFlag = false; }, true);

Vue.directive('xon', {

	isFn: true,

	initializeEvents: function() {
		var self = this;
		var ctx = this.context;
		var el = this.el;
		var $$el = this.$$el = Snap( this.el );
		var dragFlag = false;
		var mouseoverFlag = false;

		this._drag = function( dx, dy, x, y, e ) {
			dragFlag = true;
			ctx.$emit( 'x-drag', dx, dy, x, y, e );
		};

		this._dragStart = function( x, y, e ) {
			ctx.$emit( 'x-dragstart', x, y, e );
		};

		this._dragEnd = function( e ) {
			if ( !mouseoverFlag )
				dragFlag = false;

			e.mousedownFlag = mousedownFlag;
			ctx.$emit( 'x-dragend', e );
		};

		this._mouseover = function( e ) {
			mouseoverFlag = true;

			if ( dragFlag )
				return;

			e.mousedownFlag = mousedownFlag;
			ctx.$emit( 'x-mouseover', e );
		};

		this._mouseout = function( e ) {
			mouseoverFlag = false;

			if ( dragFlag )
				return;

			e.mousedownFlag = mousedownFlag;
			ctx.$emit( 'x-mouseout', e );
		};

		this._click = function( e ) {
			if ( dragFlag )
				return dragFlag = false;

			ctx.$emit( 'x-click', e );
		};

		$$el.drag( this._drag, this._dragStart, this._dragEnd );
		$$el.mouseover( this._mouseover );
		$$el.mouseout( this._mouseout );
		$$el.click( this._click );
	},

	bind: function() {
		var ctx = this.context = this.binding.isExp	? this.vm :
																									this.binding.compiler.vm;

		if ( ctx._xon ) return;

		this.initializeEvents();
		ctx._xon = true;
	},

	update: function( handler ) {
		var ctx = this.context;

		if ( this.currHandler )
			ctx.$off( this.arg, this.currHandler )

		this.currHandler = handler.bind( ctx );
		ctx.$on( this.arg, this.currHandler );
	},

	unbind: function() {
		var $$el = this.$$el;
		var ctx = this.context;

		$$el.undrag();
		$$el.unmouseover( this._mouseover );
		$$el.unmouseout( this._mouseout );
		$$el.unclick( this._click );

		ctx.$off( this.arg, this.currHandler )
	}

});

})();

/*
	Graph view
*/

Vue.component('x-radial-button', {

	template: '#template-radial-button',

	replace: true,

	data: {

		x: 0,

		dy: 0,

		highlightDistance: 2,

		highlightThickness: 3,

		radiusInner: 35,

		radiusOuter: 75,

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

function StateEventHandlers() {
	this.click = noop;
	this.mouseover = noop;
	this.mouseout = noop;
	this.drag = noop;
	this.dragstart = noop;
	this.dragend = noop;
};

var DisabledNodeState = extendClass(StateEventHandlers, function() { });

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

	//pin node
	this.click = function() {
		var $node = d3.select( ctx.$el );
		var transitionDuration = 200;

		ctx.menu = false;
		ctx.radius += 12;
		ctx.labelDistance += 12;

		var nx = ( ctx.$parent.width / 2 ) + 10,
				ny = ctx.$parent.height / 2 - 10;
		var iX = d3.interpolateRound( ctx.x, nx ),
				iY = d3.interpolateRound( ctx.y, ny );

		$node
				.transition()
				.duration( transitionDuration )
				.attrTween('transform' , function() {
					return function( t ) {
						var x = ctx.x = ctx.px = iX( t ),
								y = ctx.y = ctx.py = iY( t );

						ctx._forceResume();
						return 'translate(' + x + ',' + y + ')';
					};
				});

		document.mouse.state = 'disabled';

		ctx.$dispatch( 'showNodeData', ctx.$data );
		ctx._forceResume();

		Mousetrap.bind('esc', function() {
			ctx.fixed = false;
			ctx.radius -= 12;
			ctx.labelDistance -= 12;
			document.mouse.state = 'initial';

			Mousetrap.unbind( 'esc' );
			ctx.$dispatch( 'hideNodeData' );
		});
	};

	//drag node
	this.drag = function( dx, dy, x, y, e ) {
		e.stopPropagation();

		ctx.px = ctx.x = x;
		ctx.py = ctx.y = y;

		ctx._forceResume();
	};

  this.dragstart = function( x, y, e ) {
		e.stopPropagation();

		ctx.px = ctx.x = x;
		ctx.py = ctx.y = y;

		ctx.menu = false;
		ctx.fixed = true;
	};

	this.dragend = function( e ) {
		e.stopPropagation();

		ctx.menu = true;
	};
});

var LinkingNodeState = extendClass(InitialNodeState, function( ctx ) {
	//select node target
	this.mouseover = function( e ) {
		if ( e.mousedownFlag )
			return;

		ctx.px = ctx.x;
		ctx.py = ctx.y;
		ctx.fixed = true;
	};

	//unselect node target
	this.mouseout = function( e ) {
		if ( e.mousedownFlag )
			return;

		ctx.fixed = false;
	};

	//set link target
	this.click = function() {
		var source = document.mouse.data.source;
		if ( source.id == ctx.id )
			return;

		var sourceId = source.id;

		ctx.$parent.$.nodeVms.forEach(function( vm ) {
			if ( sourceId == vm.id ) {
				vm.$el.classList.remove( 'node-circle-link-source' );
				vm.fixed = false;
			}
			else {
				vm.$el.classList.remove( 'node-circle-link-hover' );
			}
		});

		ctx.$parent
				.createLink( { source: source, target: ctx } )
				.then(function() {
					ctx._forceResume();
				});

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

		setLinkSource: function() {
			var self = this;
			var id = this.id;

			this.menu = false;
			this.fixed = true;
			document.mouse.state = 'linking';
			document.mouse.data.source = this;

			this.$parent.$.nodeVms.forEach(function( vm ) {
				if ( id == vm.id ) {
					vm.$el.classList.add( 'node-circle-link-source' );
				}
				else {
					vm.$el.classList.add( 'node-circle-link-hover' );
				}
			});
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

		click: function() {
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

		var $snapped = Snap( this.$el );

		$snapped.drag( this.drag.bind( this ), this.dragstart.bind( this ), this.dragend.bind( this ) );
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
			if ( e.mousedownFlag )
				return;

			var source = this.source,
					target = this.target;

			source.px = source.x;
			source.py = source.y;
			source.fixed = true;

			target.px = target.x;
			target.py = target.y;
			target.fixed = true;
		},

		releasePosition: function( e ) {
			if ( e.mousedownFlag )
				return;

			this.source.fixed = false;
			this.target.fixed = false;
		},

		dragstart: function( x, y, e ) {
			var source = this.source,
					target = this.target;

			source.menu = false;
			source.fixed = true;

			target.menu = false;
			target.fixed = true;

			this.source_x = source.x;
			this.source_y = source.y;
			this.target_x = target.x;
			this.target_y = target.y;
		},

		drag: function( dx, dy, x, y, e ) {
			var source = this.source,
					target = this.target;

			source.px = source.x = this.source_x + dx;
			source.py = source.y = this.source_y + dy;

			target.px = target.x = this.target_x + dx;
			target.py = target.y = this.target_y + dy;

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

		originX: 0,

		originY: 0

	},

	methods: {

		resize: function() {
			var newWidth = $( this.$el ).width(),
					newHeight = $( this.$el ).height();

			if ( this.width == newWidth && this.height == newHeight ) 
				return;

			this.width = newWidth
			this.height = newHeight

			this._force.size( [ newWidth, newHeight ] );
			this._forceResume();
		},

		panStart: function( x, y, e ) {
			this.pOriginX = this.originX;
			this.pOriginY = this.originY;
		},

		pan: function( dx, dy, x, y, e ) {
			this.originX = this.pOriginX - dx;
			this.originY = this.pOriginY - dy;
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

		var $snapped = Snap( this.$el );

		//$snapped.drag( this.pan.bind( this ), this.panStart.bind( this ) );
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