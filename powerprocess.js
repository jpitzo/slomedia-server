// Process to manage powermate.js
var fs = require('fs');
var util = require('util');

process.on('exit', function () {
    process.send({action: 'dead', data: {}});
});

var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;

powerlog = function(d) { //
  log_file.write(util.format(d) + '\n');
  console.log(util.format(d) + '\n')
};

powerlog('Powerprocess process running @ ' + new Date());

var pm = require('./powermate');
var powermate = null;
var pulsing = false;
var pulse_interval = null;

// Setup powermate
powermate = new pm.PowerMate(process, powerlog);

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
        var lr = powermate.lastRead;
        powerlog(lr);
        
        if (powermate.lastRead) {
            var now = new Date();
        
            var diff = now.getTime() - lr.getTime();
            powerlog("Difference is: " + diff);
            
            if (diff > 5) {
                powerlog('timedout!!')
            }
        }
    }
});

process.on("disconnect", function () {

  // Cleanup activities go here...
  powerlog('closing pmate!!');
  powermate.close();

  // Then shutdown.
  powerlog('shutting down');
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