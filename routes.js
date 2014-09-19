var _ = require('underscore'),
    async = require('async');
var db = require('./db');


/* GET home page. */
exports.index = function(req, res){
  var result = {};
  var limit = 10;
  async.series([
    // count
    function(callback) {
      db.count(null, null, null, function(error, count){
        if(error) {
          callback(true, 'read count error.');
        } else {
          result.total = count;
          callback();
        }
      });
    },
    // most starred
    function(callback) {
      db.query(null, null, {sort: {starred: -1}, limit: limit}, function(error, docs){
        if(error) {
          callback(true, 'read most starred error.');
        } else {
          result.starredList = docs;
          callback();
        }
      });
    },
    // Recently Updated
    function(callback) {
      db.query(null, null, {sort: {date: -1}, limit: limit}, function(error, docs){
        if(error) {
          callback(true, 'read recently updated error.');
        } else {
          result.updatedList = docs;
          callback();
        }
      });
    }
  ],
  function(error, name) {
    if(error) {
      res.render('error');
    } else {
      res.render('index', { title: 'Cocoapods', result: result});
    }
  });
};

function object2queryString (obj) {
  var stack = [];
  _.each(obj, function(value, key){
    stack.push(key + '=' + encodeURIComponent(value));
  });

  return stack.join('&');
}

exports.search = function(req, res) {
  var offset = 10,
      options = {
        query: req.param('query') || '',
        platform: req.param('platform') || '',
        sort: req.param('sort') || 'starred',
        page: req.param('page') || 1
      },
      conditions = {name: new RegExp(options.query, 'i'), platforms: new RegExp(options.platform, 'i')},
      sortObject = {};

  var result = _.clone(options);
  async.series([
    // count
    function (callback) {
      db.count(conditions, null, null, function(error, count){
        if(error) {
          callback(true, 'read count error.');
        } else {
          result.total = count;
          result.totalPage = Math.ceil(count/offset);
          var object;
          if(options.page > 1) {
            object = _.clone(options);
            object.page = parseInt(object.page, 10) - 1;
            result.prev = req.path + '?' + object2queryString(object);
          }
          if(options.page < result.totalPage) {
            object = _.clone(options);
            object.page = parseInt(object.page, 10) + 1;
            result.next = req.path + '?' + object2queryString(object);
          }
          callback();
        }
      });
    },
    // page
    function (callback) {
      sortObject[options.sort] = -1;
      db.query(conditions, null,{sort: sortObject, skip: offset*(options.page-1), limit: offset}, function(error, docs){
        if(error) {
          callback(true, 'read page error.');
        } else {
          result.data = docs;
          console.log(result);
          callback();
        }
      });
    }
  ], function(error, name) {
    if(error) {
      res.render('error');
    } else {
      res.render('search', { title: 'Cocoapods', result: result});
    }
  });
};
