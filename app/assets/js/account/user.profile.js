require([
    'lodash',
    'jquery',
    'vue',
    'util'
],
function(_, $, Vue, util){

  Vue.config.debug = true;

  var updateUserProfile = new Vue({

    el: '#updateUserProfile',

    computed: {

      hasUpdates: function() {
        return  this.firstName !== this.cache.firstName ||
                this.lastName  !== this.cache.lastName  ||
                (this.email    !== this.cache.email     && util.validateEmail(this.email));
      }

    },

    data: {
      firstName: '',
      lastName: '',
      email: '',
      validated: {
        firstName: true,
        lastName: true,
        email: true
      },
      cache: {
        firstName: '',
        lastName: '',
        email: ''
      }
    },

    methods: {

      isAlphanumeric: function(str) {
        return str === '' || util.validateAlphanumeric(str);
      },

      validateFirstName: function(blurFlag) {
        if (blurFlag === true || !this.validated.firstName) {
          this.validated.firstName = this.firstName === '' || util.validateAlphanumeric(this.firstName);
        }
      },

      validateLastName: function(blurFlag) {
        if (blurFlag === true || !this.validated.lastName) {
          this.validated.lastName = this.lastName === '' || util.validateAlphanumeric(this.lastName);
        }
      },

      validateEmail: function(blurFlag) {
        if (blurFlag === true || !this.validated.email) {
          this.validated.email = util.validateEmail(this.email);
        }
      }
    },

    compiled: function() { //any sooner and it seems the data wont be ready
      this.cache.firstName = this.firstName;
      this.cache.lastName = this.lastName;
      this.cache.email = this.email;

      this.validateFirstName(true);
      this.validateLastName(true);
      this.validateEmail(true);
    }

  });

});