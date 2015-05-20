require([
    'lodash',
    'jquery',
    'vue',
    'util',
    'account/user'
],
function(_, $, Vue, util){
  'use strict';

  var updateUserProfile = new Vue({

    el: '#updateUserInfo',

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

  var changeUserPassword = new Vue({

    el: '#changeUserPassword',

    computed: {

      hasChanges: function() {
        console.log(this.currentPassword, this.newPassword, this.passwordConfirmation);
        return  this.currentPassword !== '' &&
                this.newPassword !== '' &&
                this.newPassword !== this.currentPassword &&
                this.newPassword === this.passwordConfirmation;
      }

    },

    data: {
      currentPassword: '',
      newPassword: '',
      passwordConfirmation: '',
      validated: {
        newPassword: true,
        passwordConfirmation: true
      }
    },

    methods: {

      validateNewPassword: function(blurFlag) {
        if (blurFlag === true || !this.validated.newPassword) {
          this.validated.newPassword =  this.newPassword === '' ||
                                        this.newPassword !== this.currentPassword;
        }
      },

      validateNewPasswordConfirmation: function(blurFlag) {
        if (blurFlag === true || !this.validated.passwordConfirmation) {
          this.validated.passwordConfirmation = this.passwordConfirmation === '' ||
                                                this.newPassword === this.passwordConfirmation;
        }
      }

    }

  });

});