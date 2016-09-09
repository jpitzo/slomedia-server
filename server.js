var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var path = require('path');
var cors = require('cors');
var _ = require('underscore');
var baseDir = "/data/server"

app.use(express.static('/data/media'));
app.use(cors());

// setup child proc for brightness
pmProc = require('child_process').fork(baseDir + '/powerprocess');

app.get('/pulse/:ss', function (req, res) {
  
  if(req.params.ss === 'start'){
    pmProc.send({action: 'start_pulse'});
  }
  else{
    pmProc.send({action: 'stop_pulse'});
  }
  
  res.send('Pulse set to ' + req.params.ss);
});

app.get('/pa/:pa', function (req, res) {
  pmProc.send({ action: 'pa', data: {value: req.params.pa == 1 ? 1 : 0}})
  res.send('Pulse Awake');
});

app.get('/pas/:pas', function (req, res) {
  pmProc.send({ action: 'pas', data: {value: req.params.pas == 1 ? 1 : 0}})
  res.send('Pulse Asleep!');
});

app.get('/noop/', function (req, res) {
  resp = pmProc.send({ action: 'noop', data: {}}, null, function(cbo){
    if (cbo !== null) {
        // An error happened!!
        console.log('error with noop: ' + cbo);
    }
  });
  res.send(resp);
});


setInterval(function(){
  resp = pmProc.send({ action: 'noop', data: {}}, null, function(cbo){
    if (cbo !== null) {
        // An error happened!!
        console.log('!!!error with noop: ' + cbo + ' @ ' + new Date());
    }
    else{
      console.log('noop send was: ' + cbo + ' @ ' + new Date());
    }
  });
  
  if (resp !== undefined) {
    console.log('!!!error with pmProc, Responded with: ' + resp + ' @ ' + new Date());
  }
  console.log("PmProc responds with: " + resp + ' @ ' + new Date());
},10000);

app.get('/cities/', function(req, res){

    res.json(fs.readdirSync(baseDir + '/public/media').filter(function(file) {
        return fs.statSync(path.join(baseDir, '/public/media', file)).isDirectory();
    }));
})

app.get('/media/:city([0-9A-z]+)?', function(req,res){
    var mediaDir = path.join(baseDir, '/public/media');

    var city = req.params.city;
    console.log(city);
    if (city) {

        if(fs.existsSync(path.join(mediaDir,city))){
            // Probably consider checking whether it's a dir
            // but since the fe is probably getting it from the list of sources should be all
            // good
            mediaDir += "/" + city;
        }

        // So, I think for now we'll just show the regular videos if
        // the city dir doesn't exist
    }

    files = fs.readdirSync(mediaDir);
    file_dict = {};


    for(var i = 0; i < files.length; i++){
      if(files[i].indexOf('_video.mp4') !== -1 || files[i].indexOf('_audio.mp3') !== -1){
        basename = files[i].replace('_video.mp4', '').replace('_audio.mp3','');
        if(file_dict[basename] === undefined){
          file_dict[basename] = {
            audio: null,
            video: null
          };
        }
        if (files[i].indexOf('_audio.mp3') !== -1){
            file_dict[basename]['audio'] = files[i];
        }
        if (files[i].indexOf('_video.mp4') !== -1){
            file_dict[basename]['video'] = files[i];
        }
      }
    }
    
    // Now we have all the files, let's make sure they all have both video and audio and then send 'em
    return_vals = []
    _.each(file_dict, function(v,i){
        if (v['audio'] !== null && v['video'] !== null) {
            return_vals.push([v['video'], v['audio']]);
        }
    });
    
    res.json(return_vals)
})

server.listen(3000, function () {
  console.log('Slosever listening on port 3000!');
});


// Socket management
var sockets = {};

io.on('connection', function(socket){
    // Setup powermate
    sockets[socket.id] = socket;

    socket.on('sync', function(data){
        pmProc.send({action: 'pa', data: {value: 1}});
        setTimeout(function(){
            pmProc.send({action: 'pa', data: {value: 0}});
        },3000);
    });
});

// Manage pmProc -> socket connection
pmProc.on('message', function(msg){
  // Check if it died
  if (msg.action === 'dead') {
    console.log('child died!!!');
    process.exit(1);
  }
  
  // Pass along messages to sockets
  Object.keys(sockets).forEach(function(key) {
    if (sockets[key].connected) {
        sockets[key].emit(msg.action, msg.data);
    }
    else{
        // Remove socket
        delete sockets[key];
    }
  });
});