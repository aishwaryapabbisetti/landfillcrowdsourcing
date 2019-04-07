var mongoose = require('mongoose');
var user = require('./userModel');
var image = require('./imageModel');

var campaignModel = mongoose.model('campaigns', new mongoose.Schema({
    campaignName: String,
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: user
    },
    selectionWorkers:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: user
    }],
    selectionThreshold:Number,
    annotationWorkers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: user
    }],
    annotationSize: Number,
    images:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: image
    }],
    status: {
        type: String,
        enum: ['Created', 'Selection in Progess', 'Annotation in Progress', 'Done'],
        default: 'Created'
    }
}), 'campaigns');

module.exports = campaignModel;