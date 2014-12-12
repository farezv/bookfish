var express = require('express');
var router = express.Router();
var http = require('http').Server(express);
var io = require('socket.io')(http);
var scraperjs = require('scraperjs');
var request = require('request');

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
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
        // TODO Add + between words in the search string
        var scrapeSearchResult = 'http://ubc.summon.serialssolutions.com/api/search?q='+msg+'&l=en';
        var scrapeHoldingsInfo = 'http://webcat1.library.ubc.ca/vwebv/holdingsInfo?bibId=7245108'

        // old school request
        request({
                url: scrapeSearchResult,
                headers: {
                    'User-Agent': 'firefox'
                }
            }, function(error, response, body) {
                if(!error && response.statusCode == 200) {
                    console.log("Response body is " + body);
                } else {
                    console.log("Error is " + error);
                }
            }
        );

        var options = {
            method: 'GET',
            url: scrapeHoldingsInfo,
            followAllRedirects: false,
            jar: true
        };

        scraperjs.DynamicScraper.create(scrapeHoldingsInfo)
            // stops the promise chain
            .onError(function(err) {
                console.log("Error is " + err);
            })
            .then(function(utils) {
                console.log("Scraper response is " + utils.scraper.response);
            })
            .scrape(function($) {
                return $(".title a").map(function() {
                    return $(this).text();
                }).get();
            }, function(news) {
                console.log(news);
            });

    });

// On disconnect event
    socket.on('disconnect', function(){
        console.log('user disconnected');
    });
});


module.exports = router;
