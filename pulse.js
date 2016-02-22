var pulsing = false;
var interval = null;

process.on('message', function(msg){
    if (msg.action === 'start' && pulsing === false) {
        pulse(msg.powermate);
    }
    else if (msg.action === 'stop' && pulsing === true) {
        stop(msg.powermate);
    }
});

function pulse(powermate){
    if (interval) {
        clearInterval(interval);
    }
    
    var bright = 100;
    var direction = 'down';
    powermate.setBrightness(bright);
    
    setInterval(function(){
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
}

function stop(powermate) {
    if (interval) {
        clearInterval(interval);
    }
    
    powermate.setBrightness(100);
}