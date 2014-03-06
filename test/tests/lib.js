var SqsStream = require('../../index.js').SqsStream;
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var MemoryStream = require('memory-stream');
var sqsOptions = require('../private-sqs-options.json');
var validate = require('../validate.js');
var AWS = require('aws-sdk');

suite('Test Sqs Read Stream - Library Mode', function() {

  this.timeout(120000);

  var sqsClient = new AWS.SQS(sqsOptions.awsConfig);

  setup(function(done) {

    var inserts = _.map(_.range(10), function() {

      return function(cb) {

        sqsClient.sendMessage({
          MessageBody: 'message ' + Math.random(),
          QueueUrl: sqsOptions.QueueUrl,
          DelaySeconds: 0,
        }, cb);
      };
    });

    async.parallel(inserts, done);

  });

  test('Read Stream', function(done) {
    var readStream = new SqsStream(sqsOptions);
    var writeStream = new MemoryStream({
      objectMode: true
    });

    readStream.on('error', function(err) {
      assert.ifError(err);
    });

    readStream.on('message', function(msg) {
      console.log(msg);

      sqsClient.deleteMessage({
          QueueUrl: sqsOptions.QueueUrl,
          ReceiptHandle: msg.ReceiptHandle
        }, function() { console.log('msg ack'); });
    });

    writeStream.on('finish', function() {
      var messages = writeStream.get();

      messages.forEach(validate);
      assert.equal(messages.length, 10, 'Should have processed 10 messages');

      setTimeout(function() {
        done();
      }, 1000);

    });

    readStream.pipe(writeStream);

  });

});
