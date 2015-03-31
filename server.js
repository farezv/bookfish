var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var cheerio = require('cheerio');
var htmlparser = require('htmlparser2');
var bookresult = require('./models/bookresult');
var bookresultdetail = require('./models/bookresultdetail');
var locinfo = require('./models/locinfo');
var urls = require('./urls');
var redis = require('redis');
var redisClient;

/* Serving the file when user arrives at the app webpage */
app.get('/', function(req, res){
  res.sendfile('index.html');
});

/* List all the events that are valid "on a connection" */
io.on('connection', function(socket){
  // On connection, record client type
	socket.on('connection', function(msg){
		console.log('connection: ' + msg);
    // figure out if cache is alive
    if(redisClient == null) setupCache();
	});

	// On message event
	socket.on('search', function(searchText) {

    // Cache searchText
    if(redisClient != null) redisClient.set(searchText, "", redis.print); // blank values for now

		// Add '+' between words in the search string and save the original search terms
		if(typeof(searchText) == 'string') {
	      searchText = searchText.replace(/\s/g, "+");
	    } else var searchTextPage = searchText;

		var simpleSearchQuery = buildOriginalSearchUrl(searchText);
	    var isHoldingsInfo = false;

	    // If the message is a holdingsInfo url, we're scraping a bookResult's details
	    if(searchText.indexOf('holdingsInfo') > -1) {
	    	simpleSearchQuery = searchText;
	    	isHoldingsInfo = true;
	    }
	    // If the message is a url, we're using it and scraping the next page
	    else if(searchText.indexOf('http') > -1 ) {
	      simpleSearchQuery = searchText;
	    } else socket.emit('next', simpleSearchQuery);
	    console.log(simpleSearchQuery);
	    
	    request({
			url: simpleSearchQuery,
			}, function(error, response, body) {
				if(!error && response.statusCode == 200) {
					console.log("html received!");
					if(isHoldingsInfo) {
						var bookResultDetails = getBookResultDetails(body);
						socket.emit('details', bookResultDetails);
					} else {
						var bookresults = getBookResults(body);
						socket.emit('results', bookresults);
						var loadNext = getNextUrl(body);
						if(!(typeof loadNext === 'number') && loadNext.indexOf('recCount') > -1) {
							// do nothing
						} else if(typeof loadNext === 'number') socket.emit('next', false);
					}	
				} else {
					console.log("Error is " + error);
				}
	    });
	});

// On disconnect event
	socket.on('disconnect', function(){
		console.log('user disconnected');
	});
});

/* Build search url  */
function buildOriginalSearchUrl(searchText) {
  return urls.simpleSearchQuery + searchText + '&searchCode=GKEY^*&limitTo=none&recCount=10&searchType=1&page.search.search.button=Search'
}

/* Setup cache */
function setupCache() {
  if (process.env.REDISCLOUD_URL) {
   var redisURL = require('url').parse(process.env.REDISCLOUD_URL);
   redisClient = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
   redisClient.auth(redisURL.auth.split(":")[1]);
  } else {
    redisClient = redis.createClient();
    redisClient.on('error', function (err) {
      console.log('Error ' + err);
    });
  }
}

/* Search result is in a div named resultListTextCell with 5 lines each corresponding to HoldingsLink, Author, Publisher, CallNumber and Status */
function getBookResults(body) {
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

	//console.log(bookResults);
	return bookResults;
}


/* Parses the book result details into clean json */
function getBookResultDetails(body) {
	var bookResultDetails;
	var locInfoLines, location, callNum, numItems, status, locInfos, summary, notes, contents;
	locInfoLines = [];
	locInfos = [];

	$ = cheerio.load(body);

	// Build location info
	$('.displayHoldings').each(function() {
		while(!location || !callNum || !numItems || !status) {
			$(this).find('.bibTag').each(function(){	
				var key = $(this).find('.fieldLabelSpan').text();
				if(key.indexOf('Location:') > -1) {
					location = $(this).find('.subfieldData').text().trim().replace("Where is this?", "");
				}
				else if(key.indexOf('Call Number:') > -1) {
					callNum = $(this).find('.subfieldData').text().trim();
				}
				else if(key.indexOf('Number of Items:') > -1) {
					numItems = $(this).find('.subfieldData').text().trim();
				}
				else if(key.indexOf('Status:') > -1) {
					status = $(this).find('.subfieldData').text().trim();
				}
			});	
		} 
				var li = new locinfo(location, callNum, numItems, status);
				location = null;
				callNum = null;
				numItems = null;
				status = null;
				console.log(li);
				locInfos.push(li);
	});
	
	// Build summary, notes and contents
	$('.bibTag').each(function(){
		var key = $(this).find('.fieldLabelSpan').text();
		if(key.indexOf('Summary') > -1) {
			summary = $(this).find('.subfieldData').text().trim();
		}
		else if(key.indexOf('Notes') > -1) {
			notes = $(this).find('.subfieldData').text().trim();
		}
		else if(key.indexOf('Contents') > -1) {
			contents = $(this).find('.subfieldData').text().trim();
		}
	});

	bookResultDetails = new bookresultdetail(locInfos, summary, notes, contents);
	return bookResultDetails;

}

/* Removes non alpha numeric characters */
function cleanString(line) {
	return line.replace("[","").replace("]","").replace("\"","").replace("'","");
}

function getNextUrl(body) {
  $ = cheerio.load(body);
  return urls.baseSearchUrl + $('.jumpBarTabRight').find('a').attr('href');
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
