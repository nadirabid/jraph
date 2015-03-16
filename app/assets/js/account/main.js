(function(requirejs) {
  'use strict';

  require.config({
    baseUrl: '/assets/js',
    paths: {
      d3: 'dependencies/d3',
      jquery: 'dependencies/jquery-2.1.1',
      lodash: 'dependencies/lodash',
      mousetrap: 'dependencies/mousetrap',
      vue: 'dependencies/vue',
      bootstrap: 'dependencies/bootstrap'
    }
  });

  require(['account/user.graphs', 'jquery'], function(app) {
    require(['bootstrap'], function() {
      document.app = app;
    });
  });
})(requirejs);
