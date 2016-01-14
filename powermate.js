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
function getAllDevices()
{
    if (!allDevices) {
	allDevices = HID.devices(1917, 1040);
    }
    return allDevices;
}

function PowerMate(socket, index)
{
    if(!index){
        index = 0
    }

    this.socket = socket

    var powerMates = getAllDevices();
    if (!powerMates.length) {
        throw new Error("No PowerMates could be found");
    }
    if (index > powerMates.length || index < 0) {
        throw new Error("Index " + index + " out of range, only " + powerMates.length + " PowerMates found");
    }
    this.hid = new HID.HID(powerMates[index].path);
    this.position = 0;
    this.button = 0;
    this.hid.read(this.interpretData.bind(this));
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
        console.log(error);
    }
};

PowerMate.prototype.setLed = function(brightness) {
    this.hid.write([1, brightness]);
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

PowerMate.prototype.interpretData = function(error, data) {
    var button = data[0];
    if (button ^ this.button) {
        console.log('going to emit!')
        this.socket.emit('button', {'button': button ? 1 : 0});
        this.button = button;
    }
    var delta = data[1];
    if (delta) {
        if (delta & 0x80) {
            delta = -256 + delta;
        }
        this.position += delta;
        this.socket.emit('turn', {delta: delta, position: this.position });
    }

    console.log(this.button + "-" + this.position + "-" + delta)
    this.hid.read(this.interpretData.bind(this));
}

exports.PowerMate = PowerMate;
exports.deviceCount = function () { return getAllDevices().length; }