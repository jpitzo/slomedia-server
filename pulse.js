process.on('message', function(msg){
    console.log(msg);
    if (msg.action === 'start' && pulsing === false) {
        pulse(msg.powermate);
    }
    else if (msg.action === 'stop' && pulsing === true) {
        stop(msg.powermate);
    }
});

