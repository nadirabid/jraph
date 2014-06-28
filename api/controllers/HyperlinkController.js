var _ = require('lodash');
var request = require('request');
var uuid = require('node-uuid');
var moment = require('moment');

var HyperlinkController = {

	create: function( req, res ) {
		var sourceId = req.body.sourceId;
		var targetId = req.body.targetId;
		var now = moment.utc();

		var hyperlink = {
			id: uuid.v4(),
			createdAt: now.toISOString(),
			updatedAt: now.toISOString(),
			sourceId: sourceId,
			targetId: targetId,
			data: JSON.stringify( req.body.data )
		};

		if ( !_.isString( sourceId )  || !_.isString( targetId ) ) {
			res.json( 'You must specify valid IDs for source and target nodes douch.' );
		}

		var options = {
			'url': 'http://localhost:7474/db/data/cypher',
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				'query': 'MATCH (source:Hypernode { id: {sourceId} }), (target:Hypernode { id: {targetId} }) '
							 + 'CREATE UNIQUE (source)-[hyperlink:HYPERLINK {hyperlink}]->(target) '
							 + 'RETURN hyperlink;',
				'params': {
					'hyperlink': hyperlink,
					'sourceId': sourceId,
					'targetId': targetId
				}
			}
		};

		request.post(options, function( e, r ) {
			res.json( r.body );
		});
	},

	read: function( req, res ) {
  	var userId = '71e721da-222b-407a-b30e-f76db499d4c0';
  	//var userId = req.user.id;
		var hyperlinkId = req.param( 'id' );

		var options = {
			'url': 'http://localhost:7474/db/data/cypher',
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8'
		};

		if ( _.isString( hyperlinkId ) ) {
			options.json = {
				'query': 'MATCH (:Hypernode)-[hyperlink:HYPERLINK { id:  {hyperlinkId} }]->(:Hypernode) '
							 + 'RETURN hyperlink;',
				'params': {
					'hyperlinkId': hyperlinkId
				}
			};
		}
		else {
			options.json = {
				'query': 'MATCH (u:User { id: {userId} }), (u)-[:OWNS]->(hypernode:Hypernode),  '
							 + 'OPTIONAL MATCH (hypernode)-[hyperlink:HYPERLINK]->(:Hypernode) '
							 + 'RETURN hyperlink;',
				'params': {
					'userId': userId
				}
			}
		}

		request.post(options, function( e, r ) {
			res.json( r.body );
		});
	},

	update: function( req, res ) {
		var hyperlinkId = req.param( 'id' );
		var data = JSON.stringify( req.body.data );

		if ( !_.isString( hyperlinkId ) ) {
			res.json( 'You must specify valid link ID douch. You specified:', hyperlinkId );
		}

  	var options = {
  		'url': 'http://localhost:7474/db/data/cypher',
  		'Content-Type': 'application/json',
  		'Accept': 'application/json; charset=UTF-8',
  		'json': {
  			'query': 'MATCH (:Hypernode)-[hyperlink:HYPERLINK { id: {hyperlinkId} }]->(:Hypernode) '
  						 + 'SET hyperlink.data = {data}, hyperlink.updatedAt = {updatedAt} '
  						 + 'RETURN hyperlink;',
				'params': {
					'hyperlinkId': hyperlinkId,
					'updatedAt': moment.utc().toISOString(),
					'data': data
				}
  		}
  	};

  	request.post(options, function( e, r ) {
  		res.json( r.body );
  	});
	},

	delete: function( req, res ) {
		var hyperlinkId = req.param( 'id' );

		if ( !_.isString( hyperlinkId ) ) {
			res.json( 'You must specify valid link ID douch. You specified:', hyperlinkId );
		}

		var options = {
			'url': 'http://localhost:7474/db/data/cypher',
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				'query': 'MATCH (:Hypernode)-[hyperlink:HYPERLINK { id: {hyperlinkId} }]-(:Hypernode) '
							 + 'DELETE hyperlink;',
				'params': {
			 		'hyperlinkId': hyperlinkId
				}
			}
		};

		request.post(options, function ( e, r ) {
			res.json( r.body );
		});
	}

};

module.exports = HyperlinkController;