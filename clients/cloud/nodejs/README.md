# Overview

Produce messages to and consume messages from [Confluent Cloud](https://www.confluent.io/confluent-cloud/?utm_source=github&utm_medium=demo&utm_campaign=ch.examples_type.community_content.clients-ccloud) using the [ node-rdkafka client for Apache Kafka](https://github.com/Blizzard/node-rdkafka).

# Prerequisites

* [Node.js](https://nodejs.org/) version 8.6 or higher installed on your machine.
* [OpenSSL](https://www.openssl.org) version 1.0.2.
* Install npm dependencies.
```bash
$ cd clients/nodejs
$ npm install
```
_Note: Users of macOS 10.13 (High Sierra) and above should heed [node-rdkafka's additional configuration instructions related to OpenSSL](https://github.com/Blizzard/node-rdkafka/blob/56c31c4e81f2a042666160338ad65dc4f8f2d87e/README.md#mac-os-high-sierra--mojave) before running `npm install`._

* Access to a [Confluent Cloud](https://www.confluent.io/confluent-cloud/?utm_source=github&utm_medium=demo&utm_campaign=ch.examples_type.community_content.clients-ccloud) cluster.
* Local file with configuration parameters to connect to your Confluent Cloud instance ([how do I find those?](https://docs.confluent.io/current/cloud/using/config-client.html#librdkafka-based-c-clients?utm_source=github&utm_medium=demo&utm_campaign=ch.examples_type.community_content.clients-ccloud)). Format the file as follows:
```bash
$ cat $HOME/.ccloud/example.config
bootstrap.servers=<broker-1,broker-2,broker-3>
sasl.username=<api-key-id>
sasl.password=<secret-access-key>
```

# Example 1: Hello World!

In this example, the producer writes Kafka data to a topic in Confluent Cloud. 
Each record has a key representing a username (e.g. `alice`) and a value of a count, formatted as json (e.g. `{"count": 0}`).
The consumer reads the same topic from Confluent Cloud and keeps a rolling sum of the counts as it processes each record.

1. Run the producer, passing in arguments for (a) the local file with configuration parameters to connect to your Confluent Cloud instance and (b) the topic name:
```bash
$ node producer.js -f $HOME/.ccloud/example.config -t test1 -k key -v value
Created topic test1
```

2. Run the consumer, passing in arguments for (a) the local file with configuration parameters to connect to your Confluent Cloud instance and (b) the same topic name as used above. Verify that the consumer received all the messages:
```bash
$ node consumer.js -f $HOME/.ccloud/example.config -t test1
Consuming messages from test1
```

## Consume message with Avro

```bash
$ node consumer.js -f $HOME/.ccloud/example.config -t test1 -s /path/to/message/schema
```

## Produce message with Avro

```bash
$ node producer.js -f $HOME/.ccloud/example.config -t test1 -s /path/to/message/schema -k your_event_key -v /path/to/your/event/data
```

> The value (`-v`) is expected to be a path to a json file if schema (`-s`) is given.

