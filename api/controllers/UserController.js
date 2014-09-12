var _ = require('lodash');
var request = require('request');
var uuid = require('node-uuid');
var bcrypt = require('bcrypt');
var moment = require('moment');

var dbUrl = 'http://localhost:7474/db/data/transaction/commit';

var UserController = {
	
	create: function( req, res ) {
		var email = req.param( 'email' );
		var password = req.param( 'password' );
		
		if ( !_.isString( email ) || !_.isString( password ) ) {
			res.json({ error: 'You must specify email/username and password.' });
		}

		//TODO: make sure username is not already chosen

		var now = moment.utc();
		
		var statement = {
			statement: 'CREATE (user:User { id: {userId}, email: {email}, password: {password}, createdAt: {createdAt}, updatedAt: {updatedAt} }) '
							 + 'RETURN user;',
			parameters: {
				'userId': uuid.v4(),
				'email': email,
				'password': null,
				'createdAt': now.toISOString(),
				'updatedAt': now.toISOString()
			}
		};

		var options = {
			'url': dbUrl,
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				statements: [ statement ]
			}
		};

		bcrypt.genSalt(10, function( e, salt ) {
			bcrypt.hash(password, salt, function( e, hash ) {
				statement.parameters.password = hash;

				request.post(options, function( e, r ) {
					res.json( r.body );
				});
			});
		});
	},

	find: function( req, res ) {
		var email = req.param( 'email' );
		
		if ( !_.isString( email ) ) {
			res.json({ error: 'You must specify a valid string for username.' });
		}

		var options = {
			'url': 'http://localhost:7474/db/data/cypher',
			'Content-Type': 'application/json',
			'Accept': 'application/json; charset=UTF-8',
			'json': {
				'query': 'MATCH (user:User { email: {email} } ) RETURN user;',
				'params': {
					'email': email
				} 
			}
		};

		request.post(options, function( e, r ) {
			res.json( r.body );
		});
	}

};

module.exports = UserController;