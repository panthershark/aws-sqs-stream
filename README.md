aws-sqs-stream
==============

AWS SQS library written using node.js streams.


# Usage: Library

```
var SqsStream = require('aws-sqs-stream').SqsStream;

var sqsOptions = {
  "awsConfig": {
    "accessKeyId": "STRING",
    "secretAccessKey": "STRING",
    "region": "us-east-1"
  },
  "QueueUrl": "https://sqs.us-east-1.amazonaws.com/#######/STRING",
  "QueueOptions":  {
    "MaxNumberOfMessages": 10,
    "WaitTimeSeconds": 4,
    "VisibilityTimeout": 15
  }
};

var readStream = new SqsStream(sqsOptions)
var writeStream = new MemoryStream({ objectMode: true });
var sqsClient = new AWS.SQS(sqsOptions.awsConfig);

readStream.on('message', function(msg) {

  sqsClient.deleteMessage({
    QueueUrl: sqsOptions.QueueUrl,
    ReceiptHandle: msg.ReceiptHandle
  }, function() { 
    console.log('msg ack'); 
  });

});

writeStream.on('finish', function() {
  console.log(writeStream.get());
});

readStream.pipe(writeStream);
```

# Usage: Broadway/Mixdown plugin

```
var broadway = require('broadway');
var SqsPlugin = require('aws-sqs-stream').SqsPlugin;
var sqsOptions = {
  "awsConfig": {
    "accessKeyId": "STRING",
    "secretAccessKey": "STRING",
    "region": "us-east-1"
  },
  "QueueUrl": "https://sqs.us-east-1.amazonaws.com/#######/STRING",
  "QueueOptions":  {
    "MaxNumberOfMessages": 10,
    "WaitTimeSeconds": 4,
    "VisibilityTimeout": 15
  }
};

var app = {
  plugins: new broadway.App()
};

// attach the broadway/mixdown plugin
app.plugins.use(new SqsPlugin('sqs'), sqsOptions);

// call init to setup the sqsClient
app.plugins.init(function(err) {
  
  var readStream = app.plugins.sqs.messageStream();
  var writeStream = new MemoryStream({ objectMode: true });

  readStream.on('message', function(msg) {
    app.plugins.sqs.ack(msg, function() { console.log('msg ack'); });
  });

  writeStream.on('finish', function() {
    console.log(writeStream.get());
  });

  readStream.pipe(writeStream);
});

```

