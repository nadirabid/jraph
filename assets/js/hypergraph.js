var HALF_PI = Math.PI / 2;
var TWO_PI = Math.PI * 2;
var E_MINUS_1 = Math.E - 1;

Vue.component('x-radial-button', {

	template: '#template-radial-button',

	replace: true,

	data: {

		startAngle: 0,

		endAngle: 0,

		innerRadius: 45,

		outerRadius: 90,

		highlightThickness: 6,

		highlightDistance: 2,

		x: 0,

		dy: 0

	},

	computed: {

		backgroundPath: function() {
			var arc = d3.svg.arc()
					.innerRadius( this.innerRadius )
					.outerRadius( this.outerRadius )
					.startAngle( this.startAngle + HALF_PI )
					.endAngle( this.endAngle + HALF_PI );

			return arc();
		},

		highlightPath: function() {
			var arc = d3.svg.arc()
					.innerRadius( this.innerRadius - this.highlightDistance )
					.outerRadius( this.innerRadius - this.highlightDistance - this.highlightThickness )
					.startAngle( this.startAngle + HALF_PI )
					.endAngle( this.endAngle + HALF_PI );

			return arc();
		},

		textPath: function() {
			var innerRadius = this.innerRadius,
					outerRadius = this.outerRadius,
					startAngle	= this.startAngle,
					endAngle    = this.endAngle;

			var midRadius = innerRadius + ( ( outerRadius - innerRadius ) / 2 );
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

	attached: function() {
		this.$parent.$emit( 'radialMenu' );
		this._textElement = this.$el.querySelector( '.node-menu-item-label' );
		
		this.updateY();
		this.updateX();
	},

	detached: function() {
		this.$parent.$emit( 'radialMenu' );
	},

	methods: {

		updateX: function() {
			var endAngle 		= this.endAngle,
					startAngle 	= this.startAngle,
					innerRadius = this.innerRadius,
					outerRadius = this.outerRadius;
			
			this.x = ( ( endAngle - startAngle ) / 2 ) * ( innerRadius + ( ( outerRadius - innerRadius ) / 2 ) );
		},

		updateY: function() {
		  var fontSize = window.getComputedStyle( this._textElement )
		  										 .getPropertyValue( 'font-size' );

			this.dy = _.parseInt( fontSize ) / 3;
		}

	}

});

Vue.component('x-radial-menu', {

	template: '#template-radial-menu',

	replace: true,

	data: {

		buttons: [ ]

	},

	ready: function() {
		this.calculateMenuItemAngles();
	},

	methods: {

		calculateMenuItemAngles: function() {
			var totalLetters = this.buttons.reduce(function( sum, item ) { 
				return sum + item.label.length; 
			}, 0);

			this.buttons.forEach(function( item, index, buttons ) {
				item.startAngle = index ? buttons[ index - 1 ].endAngle : 0;
				item.endAngle = item.startAngle + ( item.label.length / totalLetters ) * TWO_PI;
			});
		}

	}

});

Vue.component('x-node', {

	data: {

		shared: {

			activeNode: false

		},

		nodeMenu: false,

		nodeMenu2: true,

		labelDistance: 15,

		radius: 20,

		x: 0,

		y: 0,

		labelX: 0,

		labelY: 0,

		fixed: false, //doesn't work if not explicitly set

		menu: [
			{ label: 'add link' },
			{ label: 'delete' },
			{ label: 'dependencies'}
		]

	},



	ready: function() {
		//can we get by with not watching y
		this.$watch( 'x', _.bind( this.updateLable, this ) );
		this.$watch( 'labelDistance', _.bind( this.updateLable, this ) );
		this.$watch( 'radius', _.bind( this.updateLable, this ) );

		this._textElement = this.$el.querySelector( '.node-label' );
	},

	methods: {

		calculateMenuItemAngles: function() {
			var totalLetters = this.menu.reduce(function( sum, item ) { 
				return sum + item.label.length; 
			}, 0);

			this.menu.forEach(function( item, index, menu ) {
				item.startAngle = index ? menu[ index - 1 ].endAngle : 0;
				item.endAngle = item.startAngle + ( item.label.length / totalLetters ) * TWO_PI;
			});
		},

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

		showNodeMenu: function( e, index ) {
			// check shared.activeNode to make sure that we aren't 
			// already displaying a menu on another node
			if ( this._dragged || ( this.shared.activeNode && this.shared.activeNode != this.id ) )
				return;
			
			this.shared.activeNode = this.id;
			this.nodeMenu = true;
			this.fixed = true;
			this.px = this.x;
			this.py = this.y;

			//move node to front to make sure menu is not 
			//hidden by overlapping elements
			var node = this.$parent.nodes.$remove( index );
			this.$parent.nodes.push( node );
		},

		hideNodeMenu: function() {
			if ( this._dragged || ( this.shared.activeNode && this.shared.activeNode != this.id ) )
				return;

			this.shared.activeNode = false;
			this.nodeMenu = false;
			this.fixed = this.pinned || false;
		},

		dragStart: function( e ) {
			if ( e.button != 0 )
				return;

			this._drag = _.bind( this.drag, this );
			this._dragEnd = _.bind( this.dragEnd, this );
			document.addEventListener( 'mouseup', this._dragEnd );
			document.addEventListener( 'mousemove', this._drag );

			this.nodeMenu = false;
			this.fixed = true;
		},

		drag: function( e ) {
			this._dragged = true;
			this.x = this.px = e.x;
			this.y = this.py = e.y;
			this.$parent.force.resume();
		},

		dragEnd: function( e ) {
			if ( !this._drag || e.button != 0 )
				return;

			e.preventDefault();

			document.removeEventListener( 'mouseup', this._dragEnd );
			document.removeEventListener( 'mousemove', this._drag );
			delete this._drag;
			delete this._dragEnd;
			
			this.nodeMenu = true;
			this.fixed = true;

			// when the mouse is positioned outside the viewPort
			// the 'mouseleave' and 'clicked' events are not registered
			if ( e.clientX < 0 || e.clientY < 0 ) {
				this._dragged = false;
				this.hideNodeMenu();
			}
		},

		pin: function( e ) {
			if ( this._dragged ) {
				this._dragged = false;
				return;
			}

			// mouseleave is not registered when the element 
			// is progmatically moved out underneath the mouse
			this.hideNodeMenu();

			var self = this;
			var $node = d3.select( self.$el );
			var transitionDuration = 400;

			self.$parent.force.resume();

			self.radius += 12;
			self.labelDistance += 12;
			self.ignore = true;

			var nx = ( self.$parent.width / 2 ) + 10,
					ny = self.$parent.height / 2 - 10;
			var iX = d3.interpolateRound( self.x, nx ),
					iY = d3.interpolateRound( self.y, ny );

			$node
					.transition()
					.duration( transitionDuration )
					.attrTween('transform' , function() {
						return function( t ) {
							var x = self.x = self.px = iX( t ),
									y = self.y = self.py = iY( t );

							_.defer(function() {
								self.$parent.force.resume();	
							});
							
							return 'translate(' + x + ',' + y + ')';
						};
					})
					.each('end', function() {	
						if ( self.pinned )			
							self.fixed = true;
					});

			self.$dispatch( 'showNodeData', self.$data );
			self.$parent.force.resume();
			self.pinned = true;

			Mousetrap.bind('esc', function() {
				self.fixed = false;
				self.ignore = false;
				self.pinned = false;
				self.radius -= 12;
				self.labelDistance -= 12;

				Mousetrap.unbind( 'esc' );
				self.$dispatch( 'hideNodeData' );
			});
		}

	}

});

Vue.component('x-nodeData', {

	data: {

		nodeData: { },

		key: "",

		value: "",

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

	created: function() {
		this.nodeData = this.$parent.nodeData;
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

	}

});

Vue.component('x-nodeCreate', {

	data: {

		key: "",

		value: "",

		valueHasError: false,

		keyHasError: false,

		data: null

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

	}

});

Vue.component('x-graph', {

	data: {

		nodes: [ ], 

		links: [ ]

	},

	created: function() {
		var self = this;

		self.width = $( window ).innerWidth();
		self.height = $( window ).innerHeight();
		
		self.force = d3.layout.force()
				.size( [ self.width , self.height ] )
				.theta( .1 )
				.friction( .5 )
				.gravity( .6 )
				.charge( -6000 )
				.linkDistance( 30 )
				.chargeDistance( 600 );

		window.addEventListener('resize', _.bind( this.resize, this ));

		this.$on('data', function( nodes, links ) {
			self.nodes = nodes;
			self.links = links;

			self.force
					.nodes( self.nodes )
					.links( self.links )
					.start();
		});

		this.$watch('nodes', function( value, mutation ) {
			if ( mutation ) {
				self.force.nodes( self.nodes ).resume();
			}
		});

		this.$watch('links', function( value, mutation ) {
			if ( mutation ) {
				self.force.links( self.links ).resume();
			}
		});
	},

	methods: {

		resize: function() {
			this.$data.width = $( window ).innerWidth();
			this.$data.height = $( window ).innerHeight();

			this.force.size( [ this.width, this.height ] );
			this.force.start();
		}

	}

});

var app = new Vue({

	el: '#application',

	data: {

		nodes: [ ],
		
		links: [ ]
	
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

		self.$on( 'showNodeData', _.bind( self.showNodeData, self ) );
	},

	methods: {

		showNodeData: function( data ) {
			var self = this;
			self.displayNodeData = true;
			self.nodeData = data;

			self.$on( 'hideNodeData', function() {
				Mousetrap.unbind( 'esc' );
				self.hideNodeData();
			});
		},

		hideNodeData: function() {
			this.displayNodeData = false;
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

	}

});