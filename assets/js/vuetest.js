if (window.location.pathname == '/') {



function parseNodes( response ) {
	var nodes = _( response.data )
		.filter(function( datum ) {
			return datum[0] != null;
		})
		.map(function( datum ) {
			var data = datum[0].data;
			delete data.data;
			return data;
		})
		.value();

	return nodes;
}

function parseLinks( response ) {
	var links = _( response.data )
		.filter(function( datum ) {
			return datum[0] != null;
		})
		.uniq(function( datum ) {
			return datum[0].data.id;
		})
		.map(function( datum ) {
			var data = datum[0].data;
			delete data.data;
			return data;
		})
		.value();

	return links;
}

Vue.component('hg-link', {

	template: '#link-template'

});

Vue.component('hg-node', {

	template: '#node-template',

	data: {

		labelDistance: 35,

		radius: 15,

		labelX: 0,

		labelY: 0,

		fixed: false

	},

	computed: {

		circleTranslation: function() {
			return 'translate(' + this.x + ',' + this.y + ')';
		},

		labelTranslation: function() {
			var self = this;
			var labelDistance = self.labelDistance;
		
			var width = self.$parent.width,
				  height = self.$parent.height;
			var x0 = width / 2,
				  y0 = height / 2;
			var x1 = self.x,
					y1 = self.y;
			var dy = y1 - y0,
					dx = x1 - x0;
			var m = dy / dx,
					b = y0 - ( m * x0 );

			if (dx == 0)
				throw 'DIVIDE BY ZERO';

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
			var x2 = 0,
					y2 = 0;

			if ( x1 > x0 )
				x2 = ( x2a > x1 ) ? x2a : x2b;
			else
				x2 = ( x2a < x1 ) ? x2a : x2b;

			if ( y1 > y0 )
				y2 = ( y2a > y1 ) ? y2a : y2b;
			else
				y2 = ( y2a < y1 ) ? y2a : y2b;

			var bBox = d3.select( self.$el ).select( 'text' ).node().getBBox();

			var shiftY = -4 + ( 18 * ( y2 / height ) ),
					shiftX = bBox.width *  ( ( x2 - x1 ) - labelDistance ) / ( 2 * labelDistance );

			shiftX = Math.max( -bBox.width, Math.min( shiftX, 0 ) );

			return 'translate(' + ( x2 + shiftX ) + ',' + ( y2 + shiftY ) + ')';
		}

	},

	created: function() {
		//setup drag handler
		d3.select( this.$el )
			.data([ this.$data ])
			.call( this.$parent.force.drag );
	},

	methods: {

		pin: function( e ) {
			if ( e.defaultPrevented )
				return;

			var self = this;
			var deferred = Q.defer();
			var $circle = d3.select( self.$el ).select( 'circle' );
			var transitionDuration = 300;

			self.$parent.force.resume();

			if ( self.pinned ) {
				self.fixed = false;
				self.radius -= 8;
				self.labelDistance -= 12;
				self.ignore = false;

				$circle
					.transition()
					.duration( transitionDuration )
					.attr( 'r', self.radius )
					.each('end', function() {
						deferred.resolve();
					});
			}
			else {
				self.radius += 8;
				self.labelDistance += 12;
				self.ignore = true;

				var nx = ( self.$parent.width / 2 ) - 5;
				var ny = ( self.$parent.height / 2 ) - 5;
				var iX = d3.interpolateRound( self.x, nx );
				var iY = d3.interpolateRound( self.y, ny );

				$circle
					.transition()
					.duration( transitionDuration )
					.attr( 'r', self.radius )
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
						self.$data.fixed = true;
						deferred.resolve();
					});
			}

			self.$parent.force.resume();
			self.pinned = !self.pinned;

			return deferred.promise;
		}

	}

});

var app = new Vue({
	
	el: '#graph-view',

	data: {

		nodes: [ ],

		links: [ ]

	},

	created: function() {
		this.width = $( window ).innerWidth();
		this.height = $( window ).innerHeight();
		
		this.force = d3.layout.force()
				.size( [ this.width , this.height ] )
				.theta( .5 )
				.friction( .7 )
				.gravity( .4 )
				.charge( -15000 )
				.linkDistance( 10 )
				.chargeDistance( 400 );

		window.addEventListener('resize', _.bind( this.resize, this ));

		this.fetchData();
	},

	methods: {

		resize: function() {
			this.$data.width = $( window ).innerWidth();
			this.$data.height = $( window ).innerHeight();

			this.force.size( [ this.width, this.height ] );
			this.force.start();
		},

		fetchData: function() {
			var self = this;

			var nodesXhr = $.getJSON( '/hypernode/' );
			var linksXhr = $.getJSON( '/hyperlink/' );

			$.when( nodesXhr, linksXhr ).done(function( nodes, links ) {
				var nodes = parseNodes( nodes[0] );
				var links = parseLinks( links[0] );

				self.nodes = nodes;
				self.links = links;

				self.nodes.forEach(function( n, i ) {
					self.links.forEach(function( l, i ) {
						if ( l.sourceId == n.id ) {
							l.source = n;
						}
						if ( l.targetId == n.id ) {
							l.target = n;
						}
					});
				});

				self.force
					.nodes( self.nodes )
					.links( self.links )
					.start();
			});
		}

	}

});



}