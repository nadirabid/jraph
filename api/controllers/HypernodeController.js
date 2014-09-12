var _ = require('lodash');
var request = require('request');
var uuid = require('node-uuid');
var moment = require('moment');

var mockUserId = 'c53303e1-0287-4e5a-8020-1026493c6e37';
var dbUrl = 'http://localhost:7474/db/data/transaction/commit';

var HypernodeController = {

	create: function( req, res ) {
		var userId = mockUserId || req.user.id;

		if ( !_.isString( userId ) ) {
			res.json( { error: 'You must specify a valid userId douch. You specified: ' + userId } );
		}

		var now = moment.utc();

		var hypernode = {
			id: uuid.v4(),
			createdAt: now.toISOString(),
			updatedAt: now.toISOString(),
			data: JSON.stringify( req.body.data )
		};

		var options = {
			'url': dbUrl,
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				statements: [{
					'statement': 'MATCH (user:User { id: {userId} }) '
										 + 'CREATE (hypernode:Hypernode {hypernode}), (user)-[owns:OWNS]->(hypernode) '
										 + 'RETURN hypernode;',
					'parameters': {
						'userId': userId,
						'hypernode': hypernode
					}
				}]
			}
		};

		request.post(options, function( e, r ) {
			res.json( r.body );
		});
	},

  read: function( req, res ) {
  	var hypernodeId = req.param( 'id' );
  	var userId = mockUserId || req.user.id;

  	if ( !_.isString( userId ) ) {
  		res.json( { error: 'You must specify a valid userId douch. You specified: ' + userId } );
  	}

  	var options = {
  		'url': dbUrl,
  		'Content-Type': 'application/json',
  		'Accept': 'application/json; charset=UTF-8',
  	};

  	if ( _.isString( hypernodeId ) ) {
  		options.json = {
  			'statements': [{
  				'statement': 'MATCH (hypernode:Hypernode { id: {hypernodeId} }) '
  						 			 + 'RETURN hypernode;',
		 			'parameters': {
		 				'hypernodeId': hypernodeId
		 			}
  			}]
  		};
  	}
  	else {
  		options.json = {
  			'statements': [{
  				'statement': 'MATCH (user:User { id: {userId} }), (user)-[:OWNS]->(hypernode:Hypernode) '
  				     			 + 'RETURN hypernode;',
     			'parameters': {
     				'userId': userId
     			}
  			}]
  		};
  	}

  	request.post(options, function ( e, r ) {
  		res.json( r.body );
  	});
  },

	update: function( req, res ) {
		var hypernodeId = req.param( 'id' );
		var data = JSON.stringify( req.body.data );

		if ( !_.isString( hypernodeId ) ) {
			res.json( { error: 'You must specify a valid hypernodeId douch. You specified: ' + hypernodeId } );
		}

		var options = {
  		'url': dbUrl,
  		'Content-Type': 'application/json',
  		'Accept': 'application/json; charset=UTF-8',
  		'json': {
  			'statements': [{
  				'statement': 'MATCH (hypernode:Hypernode { id: {hypernodeId} }) '
  						 + 'SET hypernode.data = {data}, hypernode.updatedAt = {updatedAt} '
  						 + 'RETURN hypernode;',
					'parameters': {
						'hypernodeId': hypernodeId,
						'updatedAt': moment.utc().toISOString(),
						'data': data
					}
  			}]
  		}
		};

  	request.post(options, function ( e, r ) {
  		res.json( r.body );
  	});
	},

	delete: function( req, res ) {
		var hypernodeId = req.param( 'id' );
		var userId = mockUserId || req.user.id;

		if ( !_.isString( userId ) || !_.isString( hypernodeId ) ) {
			res.json( { error: 'You must specify a valid userId and hypernodeId douch.' } );
		}

		var options = {
			'url': dbUrl,
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				'statements': [{
					'statement': 'MATCH (hypernode:Hypernode { id: {hypernodeId} })-[rels]-() '
								 		 + 'MATCH (user:User { id: {userId} })-[owns:OWNS]->(hypernode) '
								 		 + 'DELETE owns, rels, hypernode;',
				  'parameters': {
				  	'userId': userId,
				  	'hypernodeId': hypernodeId
				  }
				}]
			}
		};

		request.post(options, function( e, r ) {
			res.json( r.body );
		});
	}

};

module.exports = HypernodeController;
