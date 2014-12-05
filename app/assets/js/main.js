(function(requirejs) {
  'use strict';

  requirejs.config({
    baseUrl: '/assets/js',
    paths: {
      d3: 'dependencies/d3',
      jquery: 'dependencies/jquery-2.1.1',
      lodash: 'dependencies/lodash',
      mousetrap: 'dependencies/mousetrap',
      q: 'dependencies/q',
      snap: 'dependencies/snap.svg',
      vue: 'dependencies/vue',
      bootstrap: 'dependencies/bootstrap'
    }
  });

  require(['hypergraph', 'jquery'], function(app) {
    require(['bootstrap'], function() {
      document.app = app;
    });
  });
})(requirejs);



