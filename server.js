var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var cheerio = require('cheerio');
var htmlparser = require('htmlparser2');
var bookresult = require('./models/bookresult');
var urls = require('./urls');

/* Serving the file when user arrives at the app webpage */
app.get('/', function(req, res){
  res.sendfile('index.html');
});

/* List all the events that are valid "on a connection" */
io.on('connection', function(socket){
	console.log("A client connected!");
	io.emit('response', "Connected to a scaling robot!");
	// On search event
	socket.on('connection', function(msg){
		console.log('connection: ' + msg);
	});

	// On message event
	socket.on('search', function(searchText){
		io.emit('message', searchText);
		console.log('search: ' + searchText);
		// TODO Add + between words in the search string
		var searchQuery = urls.searchQuery+searchText+'&l=en';
		var simpleSearchQuery = urls.simpleSearchQuery + searchText + '&searchCode=GKEY^*&limitTo=none&recCount=10&searchType=1&page.search.search.button=Search'

		// old school request
    	request({
		url: simpleSearchQuery,
		
		}, function(error, response, body) {
			if(!error && response.statusCode == 200) {
				console.log("Successful response");
				parseHtml(body);
			} else {
				console.log("Error is " + error);
			}
		}
		);


	});

// On disconnect event
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

/* Search result is in a div named resultListTextCell with 5 lines each corresponding to HoldingsLink, Author, Publisher, CallNumber and Status */
function parseHtml(body) {
	var bookResults = [];
	var holdingsLink, author, publisher, callNumber, status;

	$ = cheerio.load(body);

	$('.resultListTextCell').each(function() {
		console.log($(this).text());
	})

	var parser = new htmlparser.Parser({
		onopentag: function(name, attribs) {
			if(name == 'div' && attribs.class == 'resultListTextCell') {
				// console.log('Found a bookresult!');
			}
		},
		ontext: function(text) {
			// console.log('-->', text);
		},
		onclosetag:function(tagname) {

		}
	});
	parser.write(body);
	parser.end();
}

http.listen(4000, function(){
  console.log('listening on *:4000');
});
