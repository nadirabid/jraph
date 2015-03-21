require([
  'lodash',
  'jquery',
  'vue'
],
function(_, $, Vue){

  var UpdateUserProfileComponent = Vue.extend({

    data: {
      hasUpdates: false,
      firstName: 'Test',
      lastName: '',
      email: ''
    }

  });

  var updateUserProfile = new UpdateUserProfileComponent().$mount('#updateUserProfile');

});