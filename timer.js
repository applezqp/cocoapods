var child_process = require('child_process'),
    fs = require('fs');
var utils = require('./utils');

var time = 24*60*60*1000;
var today, file, retry = 0; 

function logger(line) {
  fs.appendFile('log/' + file, line + '\n', function(error){});
}

function createProcess() {
  var process = child_process.fork('./data.js');
  process.on('message', function(obj){
    var line = '';
    switch (obj.type) {
      case 'error':
        logger(new Date() + ' ' + obj.title + ': ' + JSON.stringify(obj.content));
        process.kill();
        break;
      case 'start':
        logger('====================');
        logger(obj.type + ': ' + new Date());
        break
      case 'end':
        logger(obj.type + ': ' + new Date());
        logger('====================');
        process.kill();
        break
      case 'timeout':
        logger(obj.title + ': ' + retry);
        process.kill();
        retry ++;
        if(retry < 10) start();
        break;
    }
  });
}

function start() {
  today = new Date();
  file = today.getFullYear() + '-' + (today.getMonth()+1)  + '-' + today.getDate() + '.log';
  retry = 0;
  createProcess();
}

start(); 
setInterval(function(){
  start();
}, time);
