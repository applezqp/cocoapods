var fs = require('fs'),
    http = require('http'),
    https = require('https'),
    _ = require('underscore'),
    async = require('async');

var config = require('./config'),
    db = require('./db');

// 全局变量：
var cocoapodsPath = '/var/www/apps/cocoapods/Specs/Specs';
// var cocoapodsPath = '/Users/zqp/.cocoapods/repos/master/';

var podJson = {
    name: '',
    version: '',
    summary: '',
    homepage: '',
    source: '',
    type: '',
    platforms: '',
    starred: 0,
    fork: 0,
    date: ''
  };
var storeType = '';

var cocoapods = [];

function start(){
  process.send({type: 'start'});
  async.series([
    // update cocoapods
    function(callback){
      updateCocoapods(callback);
    },
    // get cocoapods
    function(callback){
      getCocoapods(callback);
    },
    // each pod
    function(callback){
      eachCocoapods(callback);
    }
  ],
  function(error){
    if(error) {
      process.send({type: 'error', title: 'start error', content: error});
    } else {
      process.send({type: 'end'});
    }
  });
}

function updateCocoapods(callback) {
  var spawn = require('child_process').spawn;
  var command = spawn('git', ['pull'], {cwd: cocoapodsPath});
  command.on('close', function(code){
    if(code !== 0) {
      callback(code);
    } else {
      callback();
    }
  });
}

function getCocoapods(callback) {
  fs.readdir(cocoapodsPath, function(err, podDirs){
    if(err) return;

    _.each(podDirs, function(name, i){
      var path = cocoapodsPath + '/' + name;
      if(!fs.lstatSync(path).isDirectory() || name.indexOf('.') == 0) return;
      cocoapods.push(name);
    });
    callback();
  });
}

function eachCocoapods(callback) {
  async.eachSeries(cocoapods, function(pod, callback){
    updatePod(pod, callback);
  }, function(error){
    if(error) {
      process.send({type: 'error', title: 'eachCocoapods error', content: error});
    } else {
      callback();
    }
  });
}

function updatePod(pod, callback) {
  async.series([
    // check pod
    function(callback){
      db.query({name: pod}, null, null, function(err, docs){
        if(!docs.length) {
          storeType = 'new';
          callback();
        } else {
          storeType = 'update'
          callback();
        }
      })
    },
    // get podspec
    function(callback){
      getPodspec(pod, callback);
    },
    // update git info
    function(callback){
      updateGitInfo(callback);
    },
    // save data to db
    function(callback){
      saveData(callback);
    }
  ],
  function(error){
    if (error == 'skip' || typeof error == 'undefined') {
      callback();
    } else if(error) {
      process.send({type: 'error', title: 'savePod error', content: error});
    }
  });
}

function parsePodspec(content) {
  var pod = JSON.parse(content);
  for(var key in podJson) {
    switch (key) {
      case 'name':
        podJson[key] = pod.name;
        break;
      case 'homepage':
        podJson[key] = pod.homepage;
        break;
      case 'source':
        podJson[key] = getSource(pod.source);
        break;
      case 'type':
        podJson[key] = pod.source.git ? 'git' : 'http';
        break;
      case 'platforms':
        var platforms = [];
        if(pod.platforms && pod.platforms.ios) {
          platforms.push('ios');
        }
        if(pod.platforms && pod.platforms.osx) {
          platforms.push('osx');
        }
        if(platforms.length == 0) {
          podJson[key] = 'ios';
        } else {
          podJson[key] = platforms.join('|');
        }
        break;
      case 'starred':
      case 'fork':
      case 'date':
        break;
      default:
        podJson[key] = pod[key];
    }
  }
}

function getPodspec(name, callback) {
  var path = cocoapodsPath + '/' + name;
  fs.readdir(path, function(error, dirs){
    if (!error) {
      var version = getMaxVersion(dirs, path);
      var content = fs.readFileSync(path + '/' + version + '/' + name + '.podspec.json', 'utf-8');
      parsePodspec(content);
      callback && callback();
    } else {
      process.send({type: 'error', title: 'getPodspec error', content: error});
    }
  });
}

function updateGitInfo(callback) {
  // podspec's name is not equal repo's name
  var r = podJson.source.match(/https?:\/\/(?:www\.)?github.com\/([^\/]+)\/([^\/]+)\.git/);
  if(r && r[1] && r[2] ) {
    getGitInfo(r[1] + '/' + r[2], function(result){
      if(result.name == r[2]) {
        podJson.starred = result['watchers_count'];
        podJson.fork = result['forks_count'];
        podJson.date = new Date(result['pushed_at']);
      }
      callback();
    });
  } else {
    callback();
  }
}

function getGitInfo(repos, callback) {
  var result = '', req = null,
      request_timer = setTimeout(function(){
        req.abort();
        process.send({type: 'timeout', title: 'getGitInfo timeout'});
      }, 5000); 
  req = https.get({
    hostname: 'api.github.com',
    path: '/repos/' + repos + '?client_id=' + config.github.client_id + '&client_secret=' + config.github.client_secret,
    headers: {'User-Agent': 'applezqp'}
  }, function(res){
    clearTimeout(request_timer);
    res.on('data', function(chunk) {
      result += chunk;
    });
    res.on('end', function(){
      result = JSON.parse(result);
      callback && callback(result);
    });
  }).on('error', function(error){
    process.send({type: 'error', title: 'getGitInfo error', content: error});
  });
}

function saveData(callback) {
  podJson.updated = new Date();
  if(storeType == 'new') {
    db.save(podJson, function(error, doc){ 
      if(error) {
        db.update({name: podJson.name}, podJson, function(error){
          if(error) {
            process.send({type: 'error', title: 'update pod error', content: error});
          } else {
            callback();
          }
        });
      } else {
        callback();
      }
    });
  } else {
    db.update({name: podJson.name}, podJson, function(error){
      if(error) {
        process.send({type: 'error', title: 'update pod error', content: error});
      } else {
        callback();
      }
    });
  }
}

// helper
function getTimeByDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getSource(obj) {
  for(var key in obj) {
    if(/^https?:\/\//.test(obj[key])) {
      source = obj[key];
      break;
    }
  }
  return source;
}

function getMaxVersion(dirs, path) {
  var versionDirs = [];
  _.each(dirs, function(d, i){
    if(fs.lstatSync(path + '/' + d).isDirectory()) {
      versionDirs.push(d);
    }
  });
  return versionDirs[versionDirs.length - 1];
}

// start
start();
