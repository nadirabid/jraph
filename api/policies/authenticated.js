/**
 * Authenticated
 *
 * @module      :: Policy
 * @docs        :: http://sailsjs.org/#!documentation/policies
 *
 */
module.exports = function( req, res, next ) {
  if ( req.isAuthenticated() ) {
    return next();
  }

  res.redirect( '/account/signin' );
};
