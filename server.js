var express = require('express');
var app = express()
var server = require('http').Server(app)
var pm = require('./powermate')
var io = require('socket.io')(server)
var fs = require('fs');
var cors = require('cors')
var powermate;

app.use(express.static('public'));
app.use(cors());

app.get('/brightness/:bright', function (req, res) {
  console.log(1*req.params.bright)

  powermate.setBrightness(1*req.params.bright)
  res.send('Hello World!');
});

app.get('/pa/:pa', function (req, res) {
  console.log(req.params)
  powermate.setPulseAwake(req.params.pa == 1 ? 1 : 0)
  res.send('Pulse Awake');

});

app.get('/pas/:pas', function (req, res) {
    console.log(req.params)
  powermate.setPulseAsleep(req.params.pas == 1 ? 1 : 0)
  res.send('Pulse Asleep!');
});

app.get('/videos/', function(req,res){
    res.json(fs.readdirSync('./public/videos'));
});

server.listen(3000, function () {
  console.log('Example app listening on port 3000!');
})

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