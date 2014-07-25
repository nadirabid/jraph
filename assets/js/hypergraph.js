var HALF_PI = Math.PI / 2;
var E_MINUS_1 = Math.E - 1;

Vue.component('cmp-arc', {

	data: {

		innerRadius: 20,

		outerRadius: 60,

		_arc: d3.svg.arc()

	},

	computed: {

		path: function() {
			this._arc
					.innerRadius( this.innerRadius )
					.outerRadius( this.outerRadius )
					.startAngle( this.startAngle )
					.endAngle( this.endAngle );

			return this._arc();
		}

	}

});

Vue.component('cmp-node', {

	data: {

		labelDistance: 15,

		radius: 15,

		x: 0,

		y: 0,

		labelX: 0,

		labelY: 0,

		fixed: false, //doesn't work if not explicitly set

		menu: [
			{ fill: "#bdc3c7", startAngle: 0, endAngle: 2 },
			{ fill: "#7f8c8d", startAngle: 2, endAngle: 5 },
			{ fill: "#95a5a6", startAngle: 5, endAngle: Math.PI*2 }
		]

	},

	ready: function() {
		//can we get by with not watching y
		this.$watch( 'x', _.bind( this.updateLable, this ) );
		this.$watch( 'labelDistance', _.bind( this.updateLable, this ) );
		this.$watch( 'radius', _.bind( this.updateLable, this ) );

		this._textElement = this.$el.querySelector( 'text' );
	},

	methods: {

		updateLable: function() {
			var self = this;
			var labelDistance = self.radius + self.labelDistance;
			var bBox = self._textElement.getBBox();

			var dx = self.x - ( self.$parent.width  / 2 ),
					dy = self.y - ( self.$parent.height  / 2 );

			var theta = Math.atan( dy / dx );

			var shiftX = bBox.width * -0.5;
					shiftY = bBox.y * -0.5;

			var ratio = E_MINUS_1 * ( 1 - Math.abs( theta % HALF_PI / HALF_PI ) );
			shiftX += bBox.width * Math.log( ratio + 1 ) * ( ( dx > 0 ) ? 0.5 : -0.5 );

			var tX = labelDistance * Math.cos( theta ),
				  tY = labelDistance * Math.sin( theta );

			if ( dx < 0 ) {
				tX *= -1;
				tY *= -1;
			}

			self.labelX = tX + shiftX;
			self.labelY = tY + shiftY;
		},

		mouseenterHandler: function() {
			this.displayNodeMenu = true;
		},

		mouseleaveHandler: function() {
			if ( this._mousemoveHandler )
				return;

			this.displayNodeMenu = false;
		},

		mousedownHandler: function( e ) {
			if ( e.button != 0 )
				return;

			this._mousemoveHandler = _.bind( this.mousemoveHandler, this );
			this._mouseupHandler = _.bind( this.mouseupHandler, this );
			document.addEventListener( 'mousemove', this._mousemoveHandler );
			document.addEventListener( 'mouseup', this._mouseupHandler );

			this.displayNodeMenu = true;
			this.fixed = true;
		},

		mousemoveHandler: function( e ) {
			this._mousemoved = true;
			this.x = this.px = e.x;
			this.y = this.py = e.y;
			this.$parent.force.resume();
		},

		mouseupHandler: function( e ) {
			if ( !this._mousemoveHandler || e.button != 0 )
				return;

			e.preventDefault();

			document.removeEventListener( 'mousemove', this._mousemoveHandler );
			document.removeEventListener( 'mouseup', this._mouseupHandler );
			delete this._mousemoveHandler;
			delete this._mouseupHandler;

			this.displayNodeMenu = false;
			this.fixed = false;
		},

		pin: function( e ) {
			if ( this._mousemoved ) {
				this._mousemoved = false;
				return;
			}

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
						//BUG: don't set fixed flag if we cancel before the transition ends				
						self.fixed = true;
					});

			self.$dispatch( 'showNodeData', self.$data );
			self.$parent.force.resume();
			self.pinned = !self.pinned;

			Mousetrap.bind('esc', function() {
				self.fixed = false;
				self.radius -= 12;
				self.labelDistance -= 12;
				self.ignore = false;

				Mousetrap.unbind( 'esc' );
				self.$dispatch( 'hideNodeData' );
			});
		}

	}

});

Vue.component('cmp-nodeData', {

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

Vue.component('cmp-nodeCreate', {

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

Vue.component('cmp-graph', {

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
				self.force.nodes( self.nodes ).start();
			}
		});

		this.$watch('links', function( value, mutation ) {
			if ( mutation ) {
				self.force.links( self.links ).start();
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