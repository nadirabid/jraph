Vue.component('cmp-node', {

	data: {

		labelDistance: 35,

		radius: 15,

		x: 0,

		y: 0,

		labelX: 0,

		labelY: 0,

		fixed: false, //doesn't work if not explicitly set

	},

	created: function() {
		this.$watch( 'x', _.bind( this.updateLable, this ) );
		this.$watch( 'y', _.bind( this.updateLable, this ) );
		
		d3.select( this.$el )
				.data([ this.$data ])
				.call( this.$parent.force.drag );
	},

	methods: {

		updateLable: function() {
			var self = this;
			var labelDistance = self.labelDistance;
		
			var width = self.$parent.width,
				  height = self.$parent.height;
			var x0 = width / 2,
				  y0 = height / 2;
			var x1 = self.x,
					y1 = self.y;
			var x2 = 0,
					y2 = 0;
			var dy = y1 - y0,
					dx = x1 - x0;
			var m = dy / dx,
					b = y0 - ( m * x0 );

			if ( dx == 0 && dy < 5 ) {
				x2 = x1 + ( Math.cos( 225 * ( Math.PI / 180 ) ) * labelDistance );
				y2 = y1 + ( Math.sin( 225 * ( Math.PI / 180 ) ) * labelDistance );
			}
			else if ( dx == 0 ) {
				x2 = x0;

				if ( y1 > y0 ) 
					y2 = y1 + labelDistance;
				else
					y2 = y1 - labelDistance;
			}
			else {
				var nodeDistance = Math.sqrt( Math.pow( dy, 2 ) + Math.pow( dx, 2 ) );

				var qa = Math.pow( m, 2 ) + 1,
						qb = 2 * ( ( m * b ) - ( m * y0 ) - x0 ),
						qc = Math.pow( y0, 2 ) 
							 + Math.pow( x0, 2 )
							 + Math.pow( b, 2 )
							 - Math.pow( labelDistance + nodeDistance, 2 )
							 - ( 2 * y0 * b );

				var x2a = ( -qb + Math.sqrt( Math.pow( qb, 2 ) - ( 4 * qa * qc ) ) ) / ( 2 * qa ),
						x2b = ( -qb - Math.sqrt( Math.pow( qb, 2 ) - ( 4 * qa * qc ) ) ) / ( 2 * qa );
				var y2a = ( m * x2a ) + b,
						y2b = ( m * x2b ) + b;

				if ( x1 > x0 )
					x2 = ( x2a > x1 ) ? x2a : x2b;
				else
					x2 = ( x2a < x1 ) ? x2a : x2b;

				if ( y1 > y0 )
					y2 = ( y2a > y1 ) ? y2a : y2b;
				else
					y2 = ( y2a < y1 ) ? y2a : y2b;
			}

			var bBox = d3.select( self.$el ).select( 'text' ).node().getBBox();

			var shiftY = -4 + ( 18 * ( y2 / height ) ),
					shiftX = bBox.width *  ( ( x2 - x1 ) - labelDistance ) / ( 2 * labelDistance );

			shiftX = Math.max( -bBox.width, Math.min( shiftX, 0 ) );

			self.labelX = x2 + shiftX;
			self.labelY = y2 + shiftY;

			return 'translate(' + ( x2 + shiftX ) + ',' + ( y2 + shiftY ) + ')';
		},

		pin: function( e ) {
			if ( e.defaultPrevented )
				return;

			var self = this;
			var $circle = d3.select( self.$el ).select( 'circle' );
			var transitionDuration = 400;

			self.$parent.force.resume();

			if ( self.pinned ) {
				self.fixed = false;
				self.radius -= 12;
				self.labelDistance -= 12;
				self.ignore = false;

				self.$dispatch( 'hideNodeData' );
			}
			else {
				self.radius += 12;
				self.labelDistance += 12;
				self.ignore = true;

				var nx = self.$parent.width / 2;
				var ny = self.$parent.height / 2;
				var iX = d3.interpolateRound( self.x, nx );
				var iY = d3.interpolateRound( self.y, ny );

				$circle
						.transition()
						.duration( transitionDuration )
						.attrTween('transform' , function() {
							return function( t ) {
								var x = self.x = self.px = iX( t );
								var y = self.y = self.py = iY( t );

								_.defer(function() {
									self.$parent.force.resume();	
								});
								
								return 'translate(' + x + ',' + y + ')';
							};
						})
						.each('end', function() {						
							self.fixed = true;
						});

				Mousetrap.bind('esc', function() {
					self.pin( { defaultPrevented: false } );
					Mousetrap.unbind( 'esc' );
				});

				self.$dispatch( 'showNodeData', self.$data );
			}

			self.$parent.force.resume();
			self.pinned = !self.pinned;
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
				.theta( .5 )
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
			console.log( 'hello');
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