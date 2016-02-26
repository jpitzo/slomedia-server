// Process to manage powermate.js
var fs = require('fs');
var util = require('util');

process.on('exit', function () {
    process.send({action: 'dead', data: {}});
});

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
    else if (action === 'noop') {
        return "fingernails";
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
    
    powermate.setPulseAwake(1);
    pulsing = true;
    return;
    
    if (pulse_interval) {
        clearInterval(pulse_interval);
    }

    pulsing = true;
}

function stop_pulse() {
    if (pulse_interval) {
        clearInterval(pulse_interval);
    }
    
    if (pulsing === false) {
        return;
    }
    
    powermate.setPulseAwake(0);
    
    powermate.setBrightness(100);
    pulsing = false;
}