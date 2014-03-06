var SqsPlugin = require('../../index.js').SqsPlugin;
var assert = require('assert');
var _ = require('lodash');
var broadway = require('broadway');
var async = require('async');
var sqsOptions = require('../private-sqs-options-streams1.json');
var validate = require('../validate.js');

suite('Test Sqs Read Stream - Streams 1 interface', function() {

  this.timeout(120000);

  var app = {
    plugins: new broadway.App()
  };

  app.plugins.use(new SqsPlugin('sqs'), sqsOptions);

  setup(function(done) {

    app.plugins.init(function(err) {
      assert.ifError(err);

      var sqsClient = app.plugins.sqs.messageStream.sqsClient;
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
  });

  test('Read Stream', function(done) {
    var readStream = app.plugins.sqs.messageStream;
    var messageCount = 0;

    readStream.on('error', function(err) {
      assert.ifError(err);
    });

    readStream.on('data', function(msg) {
      messageCount++;
      // console.log(msg);
      validate(msg);
      app.plugins.sqs.ack(msg, function() { console.log('msg ack'); });
    });

    readStream.on('end', function() {
      assert.equal(messageCount, 10, 'Should have processed 10 messages');
      setTimeout(function() {
        done();
      }, 1000);
    });

  });

});
