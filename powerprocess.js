// Process to manage powermate.js
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

console.log('forked process running');

var pm = require('./powermate');
var powermate = null;
var pulsing = false;
var pulse_interval = null;

// Setup powermate
powermate = new pm.PowerMate(process);

// Let's make sure the brightness is always at 100 to start
powermate.setBrightness(100);

process.on('message', function(msg){
    var action = msg.action;
    
    if (action === 'start_pulse') {
        start_pulse();
    }
    else if (action === 'stop_pulse') {
        stop_pulse();
    }
    else if (action === 'pa') {
        powermate.setPulseAwake(msg.data.value);
    }
    else if (action === 'pas') {
        powermate.setPulseAsleep(msg.data.value);
    }
});

process.on("disconnect", function () {

  // Cleanup activities go here...
  console.log('closing pmate!!');
  powermate.close();

  // Then shutdown.
  console.log('shutting down');
  process.exit(0);
});

function start_pulse(){
    if (pulsing === true) {
        return;
    }
    
    if (pulse_interval) {
        clearInterval(pulse_interval);
    }
    
    var bright = 100;
    var direction = 'down';
    powermate.setBrightness(bright);
    
    pulse_interval = setInterval(function(){
      if (direction === 'down') {
          bright += -1;
      }
      else{
        bright += 1;
      }
      
      if (bright === 100) {
          direction = 'down';
      }
      else if (bright === 0) {
          direction = 'up';
      }
      powermate.setBrightness(bright);
    },20);
    
    pulsing = true;
}

function stop_pulse() {
    if (pulse_interval) {
        clearInterval(pulse_interval);
    }
    
    if (pulsing === false) {
        return;
    }
    
    powermate.setBrightness(100);
    pulsing = false;
}