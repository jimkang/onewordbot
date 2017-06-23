#!/usr/bin/env node

var wakeupServer = require('./wakeup-server');

var Twit = require('twit');
var probable = require('probable');
var canIChimeIn = require('can-i-chime-in')({
  extraWordsToAvoid: [
    'porn',
    'rt',
    'videos'
  ]
});
var splitToWords = require('split-to-words');
var iscool = require('iscool')();

var hashtagRegex = /#/;
var linkRegex = /https*:\/\//i;

var twit = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET  
});

var stream;


function startStreaming() {
  console.log('Starting streaming.')
  stream = twit.stream('statuses/sample', {});
  stream.on('tweet', inspectTweet);
  stream.on('error', handleStreamError);
}

function inspectTweet(incomingTweet) {
  if (tweetIsUsable(incomingTweet)) {
    
    // Don't tweet too much.
    if (probable.roll(20) > 0) {
      return;
    }
    var words = splitToWords(incomingTweet.text);
    if (words.length === 1) {
      var word = words[0];
      if (iscool(word)) {
        if (process.env.VERBOSE === 'on') {
          console.log('retweeting:', word);
        }
        if (process.env.DRY !== 'on') {
          twit.post('statuses/retweet/' + incomingTweet.id_str, { id: incomingTweet.id_str }, handleError);
        }
      }
    }

  }
  // else if (process.env.VERBOSE === 'on') {
  //   console.log('Not using:', incomingTweet.text);
  // }
}


function handleError(error, data) {
  if (error) {
    logError(error);

    if (data) {
      console.log('Data associated with error:', data);
    }
  }
  else {
    console.log('Posted without error.');
  }
}

function logError(error) {
  console.log(error, error.stack);
}

function handleStreamError(error) {
  logError(error);
  stream.stop();
  startStreaming();
}

//function stripLinks(s) {
//  return s.replace(/https*:\/\/.*\b/g, '');
//}

function isNotAReply(tweet) {
  // Can get fancier later.
  return tweet.text.charAt(0) !== '@';
}

function tweetIsUsable(incomingTweet) {
  return incomingTweet.lang === 'en' &&
    canIChimeIn(incomingTweet.text) &&
    isNotAReply(incomingTweet) &&
    !incomingTweet.text.match(hashtagRegex) &&
    !incomingTweet.text.match(linkRegex);
}

startStreaming();

//function logAlive() {
//  console.log('Still alive.');
//}

//setInterval(logAlive, 60 * 60 * 1000);
wakeupServer.listen(process.env.PORT);
