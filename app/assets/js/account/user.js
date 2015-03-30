require([
  'vue',
  'util'
],
function(Vue, util) {

  var navBar = new Vue({

    el: '#navbar',

    data: {
      profilePictureDropdown: false
    },

    methods: {

      toggleProfilePictureDropdown: function (e) {
        if (this.profilePictureDropdown)
          return;

        e.stopPropagation();

        this.profilePictureDropdown = true;

        var self = this;

        util.addEventListenerOnce(window, 'click', function () {
          self.profilePictureDropdown = false;
        });
      }

    }

  });

});