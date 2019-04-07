var mongoose = require('mongoose');

var userModel = mongoose.model('users', new mongoose.Schema({
    username: String,
    fullname: String,
    password: String,
    userType: {
      type: String,
      enum : ['Manager','Worker'],
      default: 'Manager'
  }
  }), 'users');

module.exports = userModel;