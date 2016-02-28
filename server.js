var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
var cors = require('cors');
var _ = require('underscore');

app.use(express.static('/data/media'));
app.use(cors());

// setup child proc for brightness
pmProc = require('child_process').fork('/data/server/powerprocess');

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
  console.log(resp);
  res.send(resp);
});


setInterval(function(){
  resp = pmProc.send({ action: 'noop', data: {}}, null, function(cbo){
    if (cbo !== null) {
        // An error happened!!
        console.log('!error with noop: ' + cbo + ' @ ' + new Date());
    }
    else{
      console.log('noop send was: ' + cbo + ' @ ' + new Date());
    }
  });
  console.log("PmProc responds with: " + resp + ' @ ' + new Date());
},5000);


app.get('/media/', function(req,res){
    files = fs.readdirSync('/data/server/public/media');
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