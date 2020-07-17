/* Copyright 2019 Confluent Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * =============================================================================
 *
 * Produce messages to Confluent Cloud
 * Using the node-rdkafka client for Apache Kafka
 *
 * =============================================================================
 */

const Kafka = require('node-rdkafka');
const avro = require('avsc');
const fs = require('fs');
const { configFromCli } = require('./config');

const ERR_TOPIC_ALREADY_EXISTS = 36;

function ensureTopicExists(config) {
  const kafkaConfig = {
    'bootstrap.servers': config['bootstrap.servers']
  };
  if (!!config['sasl.username'] && !!config['sasl.password']) {
    kafkaConfig['sasl.username'] = config['sasl.username'];
    kafkaConfig['sasl.password'] = config['sasl.password'];
    kafkaConfig['security.protocol'] = 'SASL_SSL';
    kafkaConfig['sasl.mechanisms'] = 'PLAIN';
  }
  const adminClient = Kafka.AdminClient.create(kafkaConfig);

  return new Promise((resolve, reject) => {
    adminClient.createTopic({
      topic: config.topic,
      num_partitions: 1,
      replication_factor: 1
    }, (err) => {
      if (!err) {
        console.log(`Created topic ${config.topic}`);
        return resolve();
      }

      if (err.code === ERR_TOPIC_ALREADY_EXISTS) {
        return resolve();
      }

      return reject(err);
    });
  });
}

function buildAvroMessage(avroParser, message) {
  const data = JSON.parse(message);
  avroParser.isValid(data, {
    errorHook : function(path, any, type){
      throw new Error(`Invalid Field '${path}' type ${type.toString()} : ${any}`);
    }
  });

  const avroMsg = avroParser.toBuffer(data);
  const msg = Buffer.alloc(avroMsg.length + 5);
  msg.writeUInt8(0);
  // FIXME: make ensureTopicExists return schema Id
  msg.writeUInt32BE(1 /* schema Id */, 1);
  avroMsg.copy(msg, 5);
  return msg;
}

function createProducer(config, onDeliveryReport) {
  const kafkaConfig = {
    'bootstrap.servers': config['bootstrap.servers']
  };
  if (!!config['sasl.username'] && !!config['sasl.password']) {
    kafkaConfig['sasl.username'] = config['sasl.username'];
    kafkaConfig['sasl.password'] = config['sasl.password'];
    kafkaConfig['security.protocol'] = 'SASL_SSL';
    kafkaConfig['sasl.mechanisms'] = 'PLAIN';
  }
  const producer = new Kafka.Producer(kafkaConfig);

  return new Promise((resolve, reject) => {
    producer
      .on('ready', () => resolve(producer))
      .on('delivery-report', onDeliveryReport)
      .on('event.error', (err) => {
        console.warn('event.error', err);
        reject(err);
      });
    producer.connect();
  });
}

async function produceExample() {
  const config = await configFromCli();

  if (config.usage) {
    return console.log(config.usage);
  }

  await ensureTopicExists(config);

  const producer = await createProducer(config, (err, report) => {
    if (err) {
      console.warn('Error producing', err)
    } else {
      const {topic, partition, value} = report;
      console.log(`Successfully produced record to topic "${topic}" partition ${partition} ${value}`);
    }
  });

  let value;
  if (!!config.schema) {
    const avroParser = avro.Type.forSchema(JSON.parse(fs.readFileSync(config.schema).toString()));
    value = buildAvroMessage(avroParser, fs.readFileSync(config.value).toString());
  } else {
    value = Buffer.from(config.value);
  }

  console.log(`publish key: ${config.key}, value: ${value}`);
  producer.produce(config.topic, -1, value, config.key);

  producer.flush(10000, () => {
    producer.disconnect();
  });
}

produceExample()
  .catch((err) => {
    console.error(`Something went wrong:\n${err}`);
    process.exit(1);
  });
