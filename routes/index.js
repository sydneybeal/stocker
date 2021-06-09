var config = require('../config');
var express = require("express");
var async = require('async');
var moment = require('moment');
var router = express.Router();
var twit = require('twit');
var y = require('yahoo-finance');
var dotenv = require('dotenv').config('../.env')

var t = new twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
  strictSSL:            true,     // optional - requires SSL certificates to be valid.
});

var twitterData = []
var yfinanceData = []
var max_id;

// Root route
router.get("/", (req, res) => {
	res.render("home");
});

async function getAllTwits(q, count, max_id){
	console.log("in all twits");
    var totalCount = 0;
    var tweets = [];
    var resultsExist, maxid, isEqualsToLocation, andLocation, err;
    maxid = max_id
    do {
        var qResults = await t.get('search/tweets', {q: q, count:count, max_id: maxid});
        tweetResults = qResults.data;
        for (var i = 0; i < tweetResults.statuses.length; i++) {
					tweet = tweetResults.statuses[i];
					tweetToAdd = {
					    createDate: tweet.created_at,
					    user: tweet.user.screen_name,
					    text: tweet.text,
					    id: tweet.id
					};
					tweets.push(tweetToAdd);
				}
        totalCount += tweetResults.statuses.length
        if(tweetResults.search_metadata.next_results != null){
            resultsExist = tweetResults.search_metadata.next_results
            isEqualsToLocation = resultsExist.indexOf('=')
            andLocation = resultsExist.indexOf('&')
            maxid = resultsExist.substring(isEqualsToLocation+1,andLocation)
        } else {
            resultsExist = tweetResults.search_metadata.next_results;
        }
    }
    while (!((resultsExist == null) | (totalCount > 4000)));
    return tweets;
}

// search logic
router.post("/search", (req,res) => {
	function callback(error, data, cb) {
    if(error)
      return cb(true);
    console.log("in callback");
    // console.log(data);

    cb(null, data);//instead of sending data directly to view, send it to async callback to merge it latter
  }

  var searchTerm = req.body.ticker;
	console.log(searchTerm);

	var tasks = {
		twitterData: function (cb) {
			q = '$' + searchTerm + ' since:2021-06-07 -filter:retweets';
			count = 100;
			getAllTwits(q, count, max_id).then(tweets => {
			    callback(null, tweets, cb);
			}).catch(e => {
			    // error
			    console.log(e);
			});
		},
		yfinanceData: function (cb) {
			y.quote({
			  symbol: searchTerm,
			  modules: [ 'price', 'summaryDetail' ] // see the docs for the full list
			}, function (err, quotes) {
			  callback(err, quotes, cb);
			});
		}
	};

	async.parallel(tasks, function (err,resp) {
		console.log(resp.twitterData[1]);
		console.log(resp.yfinanceData);
		console.log("t data is object? " + (typeof resp.twitterData == 'object'));
		console.log("t data has length? " + (resp.twitterData.length > 0));
		console.log("y data is object? " + (typeof resp.yfinanceData == 'object'));
		console.log("y data not null? " + (resp.yfinanceData !== undefined));
		if(err) {
			console.log("if 1");
			res.render("home");
		}
		else if (
			(typeof resp.twitterData == 'object' && resp.twitterData.length == 0) & 
			(typeof resp.yfinanceData == 'object' && resp.yfinanceData === undefined)) {
			console.log("if 2");
			twitterData = resp.twitterData;
			yfinanceData = resp.yfinanceData;
			res.render("home", {twitterData: twitterData, yfinanceData: yfinanceData});
		}
		// console.log(resp);
		else {
			console.log("if 3");
			twitterData = resp.twitterData;
			yfinanceData = resp.yfinanceData;
			res.render("home", {twitterData: twitterData, yfinanceData: yfinanceData});
		};
	});

	// OLD CODE
			// t.get('search/tweets',
			// 		{ q: '$' + searchTerm + ' since:2021-06-03 -filter:retweets', count: 100, max_id: min_id},
			// 		function(err, data) {
			// 	console.log(tweets.length);
			// 	for (var i = 0; i < data.statuses.length; i++) {
			// 		tweet = data.statuses[i];
			// 		// console.log(tweet.id);
			// 		tweetToAdd = {
			// 		    createDate: tweet.created_at,
			// 		    user: tweet.user.screen_name,
			// 		    text: tweet.text,
			// 		    id: tweet.id
			// 		};
			// 		// console.log(tweetToAdd.id);
			// 		if (tweetToAdd.id < min_id) {
			// 			min_id = tweetToAdd.id;
			// 		};
			// 		tweets.push(tweetToAdd);
			// 		// console.log(tweets);
			// 	};
			// 	console.log("Min id overall: " + min_id);
			// 	callback(err, tweets, cb);
			// });
			// };

	// OLD CODE
	// console.log(req.body.ticker);
	// var searchTerm = req.body.ticker;
	// console.log(searchTerm);
	// t.get('search/tweets', { q: '$' + searchTerm + ' since:2021-05-25 -filter:retweets', count: 10 }, function(err, data, response) {
	//   if(typeof data == 'object' && data) {
	//   	twitterData = data.statuses;
	// 		console.log(twitterData);
	// 		res.render("home", {twitterData});
	//   } else {
	//   	res.render("home");
	//   }
	// })
});

module.exports = router;