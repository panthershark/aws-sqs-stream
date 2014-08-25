var _ = require('lodash');
var AWS = require('aws-sdk');
var Readable = require('stream').Readable;
var util = require('util');

var BasePlugin = require('mixdown-app').Plugin;

var SqsStream = function(opt) {
  Readable.call(this, _.extend(opt, {
    objectMode: true
  }));

  this.sqsClient = new AWS.SQS(opt.awsConfig);
  this.messageBuffer = [];

  this.params = _.pick(opt, 'QueueUrl', 'AttributeNames', 'MaxNumberOfMessages', 'VisibilityTimeout', 'WaitTimeSeconds');

};
util.inherits(SqsStream, Readable);

var push = function() {
  while (this.messageBuffer.length > 0) {
    var msg = this.messageBuffer.splice(0, 1)[0];
    this.emit('message', msg);
    this.push(msg);
  };
};

SqsStream.prototype._read = function() {
  var self = this;

  // push all current messages
  push.call(self);

  // if the queue is empty, then kick off a new message request.
  self.sqsClient.receiveMessage(self.params, function(err, data) {
    if (err && err.statusCode != 200) {
      self.emit('error', err);
    } else if (data.Messages && data.Messages.length) {
      self.messageBuffer = self.messageBuffer.concat(data.Messages);
      push.call(self);
    } else {
      self.push(null);
      self.emit('close');
    }
  });
};

var SqsPlugin = function(namespace) {
  namespace = namespace || 'sqs';

  var options = {};

  this.attach = function(opt) {
    options = opt;

    var self =
      this[namespace] = {

        sqsClient: null,

        // @param msg: the content of the message
        sendMessage: function(msg, callback) {

          self.sqsClient.sendMessage({
            MessageBody: msg,
            QueueUrl: options.QueueUrl,
            DelaySeconds: 0
          }, callback);

        },

        messageStream: function() {
          return new SqsStream(options);
        },

        // reject calls changeMessageVisibility which puts the message back in the queue and makes it available for receive again.
        reject: function(message, callback) {

          return self.sqsClient.changeMessageVisibility({
            QueueUrl: options.QueueUrl,
            ReceiptHandle: message.ReceiptHandle,
            VisibilityTimeout: 0
          }, callback);
        },

        // ack calls deleteMessage to remove from the queue.  ack only fires delete which will remove the message from the queue.
        ack: function(message, callback) {

          return self.sqsClient.deleteMessage({
            QueueUrl: options.QueueUrl,
            ReceiptHandle: message.ReceiptHandle
          }, callback);
        }

      };

  };

  this.init = function(done) {
    this[namespace].sqsClient = new AWS.SQS(options.awsConfig);
    done();
  };
}

var SqsMixdownApp = BasePlugin.extend({
  init: function(options) {
    this._super(options);
    this.sqsClient = new AWS.SQS(options.awsConfig);
  },
  sendMessage: function(msg, callback) {
    var self = this;
    self.sqsClient.sendMessage({
      MessageBody: msg,
      QueueUrl: self._options.QueueUrl,
      DelaySeconds: 0
    }, callback);

  },

  messageStream: function() {
    var self = this;
    return new SqsStream(self._options);
  },

  // reject calls changeMessageVisibility which puts the message back in the queue and makes it available for receive again.
  reject: function(message, callback) {
    var self = this;

    return self.sqsClient.changeMessageVisibility({
      QueueUrl: self._options.QueueUrl,
      ReceiptHandle: message.ReceiptHandle,
      VisibilityTimeout: 0
    }, callback);
  },

  // ack calls deleteMessage to remove from the queue.  ack only fires delete which will remove the message from the queue.
  ack: function(message, callback) {
    var self = this;

    return self.sqsClient.deleteMessage({
      QueueUrl: self._options.QueueUrl,
      ReceiptHandle: message.ReceiptHandle
    }, callback);
  },
  _setup: function(done) {
    done();
  }
});

module.exports = {
  SqsStream: SqsStream,
  SqsPlugin: SqsPlugin,
  SqsMixdownApp: SqsMixdownApp
};