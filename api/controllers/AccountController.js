var passport = require( 'passport' );

var AccountController = {
	
	signin: function( req, res ) {
		res.view();
	},

	signup: function( req, res ) {
		res.view();
	},

	verify: function( req, res ) {

		passport.authenticate('local', function( err, user, info ){
      if ( err || !user ) {
      	res.json( {'error': err, 'user': user, 'info': info} );
        return;
      }
      
      req.logIn(user, function( err ){
        if ( err ) {
        	res.redirect( '/account/login' );
        }

        return res.redirect( '/' );
      });

    })( req, res );

	},

	logout: function( req, res ) {
		req.logout();
		res.redirect( '/account/login' );
	}
	
};

module.exports = AccountController;