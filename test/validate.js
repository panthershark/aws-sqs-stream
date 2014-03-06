var assert = require('assert');

module.exports = function(msg) {
  assert.ok(msg, 'Should have receive message');
  assert.ok(msg.ReceiptHandle, 'Message should have ReceiptHandle');
  assert.ok(msg.Body, 'Message should have Body');
};
