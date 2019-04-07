var mongoose = require('mongoose');
var user = require('./userModel');
var image = require('./imageModel');
var campaign = require('./campaignModel');

var taskModel = mongoose.model('tasks', new mongoose.Schema({
    campaign: {
        type: mongoose.Schema.Types.ObjectId,
        ref: campaign
    },
    
    status: {
        type: String,
        enum : ['Executed','Pending'],
        default: 'Pending'
    },

    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: user
    },

    taskType: {
        type: String,
        enum : ['Selection','Annotation'],
        default: 'Selection'
    },

    imagesSelected:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: image
    }],

    imagesNotSelected:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: image
    }],

    imagesAnnonated:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: image
    }],

  }), 'tasks');

module.exports = taskModel;