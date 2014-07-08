//
// Models
//

var Hypernode = Backbone.Model.extend({

	initialize: function() {
		Object.defineProperties(this, {
			index: {
				get: function() { return this.get( 'index' ); },
				set: function( val ) { this.set( 'index', val ); }
			},
			x: {
				get: function() { return this.get( 'x' ); },
				set: function( val ) { this.set( 'x', val ); }
			},
			y: {
				get: function() { return this.get( 'y' ); },
				set: function( val ) { this.set( 'y', val ); }
			},
			px: {
				get: function() { return this.get( 'px' ); },
				set: function( val ) { this.set( 'px', val ); }
			},
			py: {
				get: function() { return this.get( 'py' ); },
				set: function( val ) { this.set( 'py', val ); }
			},
			fixed: {
				get: function() { return this.get( 'fixed' ); },
				set: function( val ) { this.set( 'fixed', val ); }
			},
			weight: {
				get: function() { return this.get( 'weight' ); },
				set: function( val ) { this.set( 'weight', val ); }
			}
		});
	}

});

var Hyperlink = Backbone.Model.extend({

	initialize: function(attr, options) {
		var nodes = this.collection.nodes;

		Object.defineProperties(this, {
			source: {
				get: function() { return nodes.get( this.get( 'sourceId' ) ); }
			},
			target: {
				get: function() { return nodes.get( this.get( 'targetId' ) ); }
			}
		});
	}

});

//
// Collections
//

var HypergraphNodes = Backbone.Collection.extend({
	
	url: '/hypernode/',
	
	model: Hypernode,

	parse: function( response ) {
		var nodes = _( response.data )
			.filter(function( datum ) {
				return datum[0] != null;
			})
			.map(function( datum ) {
				var ret = datum[0].data;
				ret.data = JSON.parse( ret.data );
				return ret;
			})
			.value();

		return nodes;
	}

});

var HypergraphLinks = Backbone.Collection.extend({
	
	url: '/hyperlink/',
	
	model: Hyperlink,

	initialize: function(links, options) {
		var self = this;

		self.nodes = options.nodes;
	},

	parse: function( response ) {
		var links = _( response.data )
			.filter(function( datum ) {
				return datum[0] != null;
			})
			.map(function( datum ) {
				var ret = datum[0].data;
				ret.data = JSON.parse( ret.data );
				return ret;
			})
			.value();

		return links;
	}

});

//
// Views
//

var SVGView = Backbone.View.extend({

	tagName: 'g',
  
  nameSpace: "http://www.w3.org/2000/svg",
  
  _ensureElement: function() {
     if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = $(window.document.createElementNS(_.result(this, 'nameSpace'), _.result(this, 'tagName'))).attr(attrs);
        this.setElement($el, false);
     } else {
        this.setElement(_.result(this, 'el'), false);
     }
  }

});

var NodeDataView = Backbone.View.extend({

	template: JST['node-info'],

	className: 'info-card panel panel-default',

	render: function() {
		var self = this;

		var attributes = _.map(self.model.attributes, function( v, k ) {
			return { key: k, value: v };
		});

		var compiledTemplate = self.template({ 
			attributes: attributes
		});

		self.$el.html( compiledTemplate );
		$( '#container-overlay' ).append( self.$el );

		return self;
	}

});

var NodeView = SVGView.extend({

	template: JST['node'],

	events: {
		'click .node': 'click'
	},

	initialize: function( options ) {
		var self = this;
		self.force = options.force;
		self.parent = options.parent;
		self.radius = 15;
		self.labelDistance = 35;
	},

	click: function( e ) {
		var self = this;

		if ( e.isDefaultPrevented() )
			return;

		self.pin( ( self.parent.width / 2 ) - 5, ( self.parent.height / 2 ) - 5 )
			.then(function() { 
				self.dataView(); 
			});
	},

	tick: function() {
		var self = this;
		var model = self.model;
		var $d3 = self.$d3;
		
		var labelDistance = self.labelDistance;
	
		var width = self.parent.width,
			  height = self.parent.height;
		var x0 = width / 2,
			  y0 = height / 2;
		var x1 = model.x,
				y1 = model.y;
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

		var bBox = $d3.select( 'text' ).node().getBBox();

		var shiftY = -4 + ( 18 * ( y2 / height ) ),
				shiftX = bBox.width *  ( ( x2 - x1 ) - labelDistance ) / ( 2 * labelDistance );

		shiftX = Math.max( -bBox.width, Math.min( shiftX, 0 ) );

		_.defer(function() {
				
			$d3.select( 'text ' ).attr( 'transform', 'translate(' + ( x2 + shiftX ) + ',' + ( y2 + shiftY ) + ')' );

			if ( !self.ignore )
				$d3.select( 'circle' ).attr( 'transform', 'translate(' + model.x + ',' + model.y + ')' );

		});
	},

	pin: function( nx, ny ) {
		var self = this;
		var deferred = Q.defer();
		var $circle = self.$d3.select( 'circle' );
		var transitionDuration = 300;

		self.force.resume();

		if ( self.pinned ) {
			self.model.fixed = false;
			self.radius -= 8;
			self.labelDistance -= 12;
			self.ignore = false;

			$circle
				.transition()
				.duration( transitionDuration )
				.attr( 'r', self.radius )
				.each('end', function() {
					deferred.resolve();
				})
		}
		else {
			self.radius += 8;
			self.labelDistance += 12;
			self.ignore = true;

			$circle
				.transition()
				.duration( transitionDuration )
				.attr( 'r', self.radius )
				.attrTween('transform' , function() {
					var iX = d3.interpolateRound( self.model.x, nx );
					var iY = d3.interpolateRound( self.model.y, ny );
					
					nx = nx || self.model.x;
					ny = ny || self.model.y;
						
					return function( t ) {
						var x = self.model.x = self.model.px = iX( t );
						var y = self.model.y = self.model.py = iY( t );

						self.tick();
						self.force.resume();

						return 'translate(' + x + ',' + y + ')';
					};
				})
				.each('end', function() {						
					self.model.fixed = true;
					deferred.resolve();
				});
		}

		self.force.resume();
		self.pinned = !self.pinned;

		return deferred.promise;
	},

	dataView: function() {
		var self = this;

		//todo: define behavior for what happends when dataView is called multiple times
		var dataView = new NodeDataView({ model: self.model });

		dataView.render();

		var overlay = $( '<div class="overlay"></div>' )
			.click(function() {
				Mousetrap.trigger( 'esc' ); 
			})
			.appendTo( 'body' );
    
		Mousetrap.bind('esc', function() {
			Mousetrap.unbind( 'esc' );
			self.pin();
			dataView.remove();
			overlay.remove();
		});
	},

	render: function() {
		var self = this;

		var compiledTemplate = self.template( self.model.attributes );
		self.el.appendChild( $.parseXML( compiledTemplate ).documentElement );

		var $d3 = self.$d3 = self.parent.svg
			.append( function() { return self.el; } )
			.data( [ self.model ] );

		$d3.select( 'circle' ).attr( 'r', self.radius );

		$d3.call( self.force.drag );

		return self;
	}

});

var LinkView = SVGView.extend({

	template: JST['link'],

	initialize: function( options ) {
		var self = this;
		self.parent = options.parent;
		self.force = options.force;
	},

	tick: function() {
		var self = this;
		var source = self.model.source;
		var target = self.model.target;
		var $link = self.$d3.select('.link');

		_.defer(function() {

			$link.attr( 'x1', source.x );
			$link.attr( 'y1', source.y );

			$link.attr( 'x2', target.x );
			$link.attr( 'y2', target.y );
		
		});
	},

	render: function() {
		var self = this;

		var compiledTemplate = self.template();
		self.el.appendChild( $.parseXML( compiledTemplate ).documentElement );

		var $d3 = self.$d3 = self.parent
			.append( function() { return self.el; } )
			.data( [ self.model ] );

		return self;
	}

});

var GraphView = SVGView.extend({

	el: '#graph-view',

	initialize: function( options ) {
		var self = this;

		self.nodes = new HypergraphNodes();
		self.links = new HypergraphLinks([], { nodes: self.nodes });
		self.labels = [];
		self.labelLinks = [];
		self.nodeViews = [];
		self.linkViews = [];
		self.width = $( window ).outerWidth();
		self.height = $( window ).outerHeight();
		self.force = d3.layout.force()
			.size( [ self.width, self.height ] )
			.theta( .5 )
			.friction( .7 )
			.gravity( .4 )
			.charge( -15000 )
			.linkDistance( 10 )
			.chargeDistance( 400 );

		// fetch data and init force layout

		var nodesXhr = self.nodes.fetch();
		var linksXhr = self.links.fetch();

		$.when( nodesXhr, linksXhr ).done(function() {
			self.force
				.nodes( self.nodes.models )
				.links( self.links.models )
				.start();

			self.render();
		});
	},

	tick: function() {
		var self = this;

		self.nodeViews.forEach( function( v ) { v.tick(); } );
		self.linkViews.forEach( function( v ) { v.tick(); } );
	},

	resize: function() {
		var self = this;

		self.width = $( window ).outerWidth();
		self.height = $( window ).outerHeight();

		//self.svg.attr( 'width', self.width );
		//self.svg.attr( 'height', self.height );

		$( '#graph-view' ).height( $(window).outerHeight() );
		$( '#graph-view' ).width( $(window).outerWidth() );

		self.force.size( [ self.width, self.height ] );
		self.force.start();
	},

	render: function() {
		var self = this;
		var force = self.force;
		var linkViews = self.linkViews;
		var nodeViews = self.nodeViews;

		var svg = self.svg = d3.select( self.el );

		window.addEventListener( 'resize', _.throttle( _.bind( self.resize, self ), 400 ) );
		self.resize();

    self.links.forEach(function ( link ) {
    	var linkView = new LinkView( { model: link, force: force, parent: svg } );
    	self.linkViews.push( linkView ); //TODO: remove from array "on destroy" 
    	linkView.render();
    });

		self.nodes.forEach(function( node ) {
			var nodeView = new NodeView( { model: node, force: force, parent: self } );
			self.nodeViews.push( nodeView );
			nodeView.render();
		});

		self.force.on( 'tick', _.bind( self.tick, self ) );

		return self;
	}

});

//
// Initialization
//

var graphView = new GraphView();
