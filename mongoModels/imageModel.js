var mongoose = require('mongoose');

var imageModel = mongoose.model('images', new mongoose.Schema({
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'images'
    },
    children: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'images'
    }],
    url: {
      type: String
    },
    selectionCount: {
      type: Number,
      default: 0
    }
  }), 'images');

module.exports = imageModel;