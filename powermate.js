// Interface to Griffin PowerMate

// Received data from the PowerMate contains the state of the button
// in the first byte and the turning direction, if any, in the second
// byte.  The second byte is encoded as a signed integer.  Data sent
// to the PowerMate contains zero in the first byte and the brightness
// of the LED in the second byte.

var HID = require('node-hid');
var util = require('util');
var events = require('events');

var REPORT_ID = 0;
var REPORT_LENGTH = 9;

var SET_STATIC_BRIGHTNESS = 0x01;
var SET_PULSE_ASLEEP = 0x02;
var SET_PULSE_AWAKE = 0x03;
var SET_PULSE_MODE = 0x04;

var allDevices;
var powermateObject = null;

function getAllDevices()
{
    if (!allDevices) {
	allDevices = HID.devices(1917, 1040);
    }
    return allDevices;
}

function PowerMate(process, powerlog)
{
    this.log = powerlog;
    var powerMates = getAllDevices();
    if (!powerMates.length) {
        throw new Error("No PowerMates could be found");
    }
    
    // This can't be called twice or the second call will wonk out
    if (powermateObject === null) {
        powermateObject = new HID.HID(powerMates[0].path);
    }
    this.hid = powermateObject;
    this.position = 0;
    this.button = 0;
    this.lastRead = null;
    //this.hid.read(this.interpretData.bind(this));
    
    this.hid.on("data", this.interpretData.bind(this));
    this.hid.on("error", function(error){
        this.log("@Got a pmate error!!: " + error);
    });
    
    this.process = process;
}

util.inherits(PowerMate, events.EventEmitter);

PowerMate.prototype._sendCommand = function(/* command [, args ...]*/) {
  var command = arguments[0];
  var featureReport = [REPORT_ID, 0x41, 1, command, 0, 0, 0, 0, 0];

  for (var i = 1; i < arguments.length; i++) {
    featureReport[i + 4] = arguments[i];
  }

    try{
        this.hid.sendFeatureReport(featureReport);
    }
    catch(error){
        
        this.log("Send command error:" + error);
    }
};

PowerMate.prototype.setLed = function(brightness) {
    this.hid.write([1, brightness]);
}

PowerMate.prototype.close = function(){
    if (this.hid) {
        this.hid.close();
    }
}

PowerMate.prototype.setBrightness = function(brightness, callback) {
  this._sendCommand(SET_STATIC_BRIGHTNESS, brightness);

  if(callback) {
    callback();
  }
};

PowerMate.prototype.setPulseAsleep = function(pulseAsleep, callback) {
  this._sendCommand(SET_PULSE_ASLEEP, pulseAsleep ? 1 : 0);

  if(callback) {
    callback();
  }
};

PowerMate.prototype.setPulseAwake = function(pulseAwake, callback) {
  this._sendCommand(SET_PULSE_AWAKE, pulseAwake ? 1 : 0);

  if(callback) {
    callback();
  }
};

PowerMate.prototype.interpretData = function(data) {
    this.log(data);
    try {
        var button = data[0];
        if (button ^ this.button) {
            if (button === 1) {
                this.process.send({ action: 'buttonDown', data: {}});
            }
            else{
                this.process.send({ action: 'buttonUp', data: {}});
            }
            
            this.button = button;
        }
        var delta = data[1];
        if (delta) {
            if (delta & 0x80) {
                delta = -256 + delta;
            }
            this.position += delta;
            this.process.send({ action: 'turn', data: {delta: delta, position: this.position }});
        }
    } catch(e) {
        this.log("Read Error" + e);
    }
    
    this.lastRead = new Date();
}

exports.PowerMate = PowerMate;
exports.deviceCount = function () { return getAllDevices().length; }