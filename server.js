var express = require('express');
var app = express();
var server = require('http').Server(app);
var pm = require('./powermate');
var io = require('socket.io')(server);
var fs = require('fs');
var cors = require('cors');
var _ = require('underscore');
var powermate;

app.use(express.static('/data/media'));
app.use(cors());

app.get('/brightness/:bright', function (req, res) {
  console.log(1*req.params.bright)

  powermate.setBrightness(1*req.params.bright)
  res.send('Hello World!');
});

app.get('/pa/:pa', function (req, res) {
  powermate.setPulseAwake(req.params.pa == 1 ? 1 : 0)
  res.send('Pulse Awake');

});

app.get('/pas/:pas', function (req, res) {
  powermate.setPulseAsleep(req.params.pas == 1 ? 1 : 0)
  res.send('Pulse Asleep!');
});

app.get('/videos/', function(req,res){
    res.json(fs.readdirSync('/data/server/public/videos'));
});

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
  console.log('Example app listening on port 3000!');
});

io.on('connection', function(socket){
    // Setup powermate
    
    powermate = new pm.PowerMate(socket)

    socket.on('sync', function(data){
        console.log('here!!');
        powermate.setPulseAwake(1)
        setTimeout(function(){
            powermate.setPulseAwake(0);
            powermate.setBrightness(255);
        },3000);
    })
})