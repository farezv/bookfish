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
		// Add '+' between words in the search string
		searchText = searchText.replace(/\s/g, "+");
		console.log('search: ' + searchText);
		// Build url
		var searchQuery = urls.searchQuery+searchText+'&l=en';
		var simpleSearchQuery = urls.simpleSearchQuery + searchText + '&searchCode=GKEY^*&limitTo=none&recCount=10&searchType=1&page.search.search.button=Search'

		// old school request
    	request({
		url: simpleSearchQuery,
		
		}, function(error, response, body) {
			if(!error && response.statusCode == 200) {
				console.log("Successful response");
				var bookresults = parseHtml(body);
				socket.emit('results', bookresults);
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
	var br, searchTitle, bibId, author, publisher, callNumber, status;

	$ = cheerio.load(body);

	$('.resultListTextCell').each(function() {
		// Constructing search result object by parsing various metadata
		searchTitle = $(this).find('.line1Link').text();
		// Only care about bibId since the rest of the url can be constructed when needed
		bibId = $(this).find('a').attr('href');
		bibId = bibId.substr(bibId.lastIndexOf('=') + 1);
		
		author = $(this).find('.line2Link').text();
		author = author.replace("Author:", "");

		publisher = $(this).find('.line3Link').text();
		publisher = publisher.replace("Publisher:", "");
		
		// Ideally, line 4 is the Call Number line
		var line4 = $(this).find('.line4Link').text();
		callNumber = checkStringPrefix(line4.trim(), 'Call Number');
		callNumber = callNumber.replace("Call Number:", "");
		// but when it's not, line 4 is the Status line
		if(callNumber == ' ') {
			status = line4;
		} else status = $(this).find('.line5Link').text();
		status = status.replace("Status, Library Location:", "");
		
		// Finally create book result object
		br = new bookresult(searchTitle.trim(), bibId.trim(), author.trim(), publisher.trim(), callNumber.trim(), status.trim());
		bookResults.push(br);
	});

	console.log(bookResults);
	return bookResults;
}

/* Check to see if the dataString contains keyword in the beginning.  */
function checkStringPrefix(dataString, keyword) {
	// console.log('dataString: ' + dataString + ' & keyword: ' + keyword);
	// console.log(dataString.substr(0, keyword.length));
	if(dataString.substr(0, keyword.length) == keyword) {
		return dataString;
	} else return ' ';
}

http.listen(process.env.PORT || 4000, function(){
  console.log('listening on *:4000');
});
