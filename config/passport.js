var request = require( 'request' );
var passport = require( 'passport' );
var LocalStrategy = require( 'passport-local' ).Strategy;
var bcrypt = require( 'bcrypt' );

passport.serializeUser(function( user, done ) {
	done( null, user.id );
});

passport.deserializeUser(function( userId, done ) {

	var options = {
		'url': 'http://localhost:7474/db/data/cypher',
		'Content-Type': 'application/json',
		'Accept': 'application/json; charset=UTF-8',
		'json': {
			'query': 'MATCH (user:User { id: {userId} } ) RETURN user;',
			'params': {
				'userId': userId
			} 
		}
	};

	request.post(options, function( e, r ) {
		done( e, r.body.data[0][0].data );
	});
});

passport.use(new LocalStrategy(
	function( email, password, done ) {
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

		request.post(options, function ( e, r ) {
			if ( r.body.data.length == 0 ) {
				done( null, false, { message: 'User does not exist' }); 
			}
			else {
				var user = r.body.data[0][0].data;

				bcrypt.compare(password, user.password, function( e2, r2 ) {
					if ( !r2 ) {
						done( null, false, { message: 'Invalid password' });
					}
					else {
						done( null, user)
					}
				});
			}
		});
	}
));

module.exports = {
	http: {
	  customMiddleware: function( app ) {
	    app.use( passport.initialize() );
	    app.use( passport.session() );
	  }
	}
};