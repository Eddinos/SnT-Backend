var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var projectSchema = new Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  title: {
        type: String,
        unique: false,
        required: true
    },
  media: {
        type: String,
        unique: false,
        required: true
  },
  shortDescription: {
        type: String,
        required: true
  },
  technos: {
    type: Array,
    unique: false,
    required: false
  }
});

module.exports = mongoose.model('Project', projectSchema);
