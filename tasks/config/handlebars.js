// tasks/config/handlebars.js
// --------------------------------
// handlebar task configuration.

module.exports = function( grunt ) {

  // We use the grunt.config api's set method to configure an
  // object to the defined string. In this case the task
  // 'handlebars' will be configured based on the object below.
  grunt.config.set('handlebars', {

    dev: {
      // We will define which template files to inject
      // in tasks/pipeline.js,
      options: { 
        namespace: 'JST',
        processName: function(filePath) {
            return filePath.replace(/^assets\/templates\//, '').replace(/\.hbs$/, '');
        }
      },
      files: {
        '.tmp/public/js/jst.js': require( '../pipeline' ).templateFilesToInject
      }
    }

  });

  // load npm module for handlebars.
  grunt.loadNpmTasks( 'grunt-contrib-handlebars' );
};