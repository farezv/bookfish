var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// Serving the file when user arrives at the app webpage
app.get('/', function(req, res){
  res.sendfile('index.html');
});

// List all the events that are valid "on a connection"
io.on('connection', function(socket){
	console.log("A client connected!");
	io.emit('response', "Connected to a scaling robot!");
// On search event
	socket.on('search', function(msg){
		io.emit('search', msg);
		console.log('search: ' + msg);
	});

// On message event
	socket.on('message', function(msg){
		io.emit('result', msg);
		console.log('message: ' + msg);
	});

// On disconnect event
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
