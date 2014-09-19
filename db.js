var mongoose = require('mongoose'),
    _ = require('underscore'),
    config = require('./config'),
    podSchema = require('./schema').Pod,
    db = 'cocoapods',
    collection = 'pods';


var connection = mongoose.createConnection(config.mongodb + db);
//var connection = mongoose.createConnection('mongodb://localhost/' + db);

function save(doc, callback) {
  var Mod = connection.model(collection, podSchema),
      mod = new Mod(doc);

  mod.save(function(err, doc){
    callback(err, doc);
  });
}

function query(query, fields, options, callback) {
  var Mod = connection.model(collection, podSchema);

  Mod.find(query, fields, options, function(err, docs){
    callback(err, docs);
  });
}

function count(query, fields, options, callback) {
  var Mod = connection.model(collection, podSchema);

  Mod.find(query, fields, options).count(function(err, count){
    callback(err, count);
  });
}

function update(query, doc, callback) {
  var Mod = connection.model(collection, podSchema);

  Mod.update(query, doc, function(err, numAffected){
    callback(err, numAffected);
  });
}

exports.save = save;
exports.query = query;
exports.update = update;
exports.count = count;
