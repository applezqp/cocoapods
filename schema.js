
var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Pod = new Schema({
  name: {
    'type': String,
    'required': true,
    'unique': true
  },
  version: {
    'type': String,
    'required': true
  },
  summary: {
    'type': String,
    'required': true
  },
  homepage: {
    'type': String,
    'required': true
  },
  source: {
    'type': String,
    'required': true
  },
  user: {
    'type': String,
    'required': false
  },
  type: {
    'type': String,
    'required': true
  },
  platforms: {
    'type': String,
    'required': true
  },
  starred: {
    'type': Number,
    'required': false
  },
  fork: {
    'type': Number,
    'required': false 
  },
  date: {
    'type': Date,
    'required': false
  },
  // 本地数据更新时间
  updated: {
    'type': Date,
    'required': false
  }
});

exports.Pod = Pod;
