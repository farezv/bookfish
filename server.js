var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var scraperjs = require('scraperjs');
var request = require('request');

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
		io.emit('searching', msg);
		console.log('scraping: ' + msg);

		var scrapeUrl = 'http://ubc.summon.serialssolutions.com/search?s.cmd=addFacetValueFilters%28ContentType%2CNewspaper+Article%3At%29&spellcheck=true&s.q=hackers+and+painters';
		// scrapeUrl = msg.toString();

		var options = {
    		method: 'GET',
    		url: scrapeUrl,
    		followAllRedirects: false,
    		jar: true
  		};

		// scraperjs.DynamicScraper.create()
		// .request(options)
		// // stops the promise chain
		// .onError(function(err) {
		// 	console.log("Error is " + err);
		// })
		// .then(function(utils) {
  //   	console.log("Scraper response is " + utils.scraper.response);
  //   	})
	 //    .scrape(function($) {
	 //        return $(".title a").map(function() {
	 //            return $(this).text();
	 //        }).get();
	 //    }, function(news) {
	 //        console.log(news);
	 //    });

	    // old school request
	    	request({
			url: scrapeUrl,
			headers: {
				'User-Agent': 'firefox'
			}
			}, function(error, response, body) {
				if(!error && response.statusCode == 200) {
					console.log("Response body is " + body);
				} else {
					console.log(error);
				}
			}
			);
	});

// On disconnect event
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

http.listen(4000, function(){
  console.log('listening on *:4000');
});
