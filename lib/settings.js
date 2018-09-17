const nconf = require('nconf');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs-extra');

if (!process.argv[2]) {
  dotenv.config();
} else {
  try {
    fs.accessSync(path.resolve(process.cwd(), process.argv[2]));
    dotenv.config({path: path.resolve(process.cwd(), process.argv[2])});
  } catch (ex) {
    try {
      fs.accessSync(process.argv[2]);
      dotenv.config({path: process.argv[2]});
    } catch (ex2) {
      console.log('Invalid path to settings file provided! Exiting.');
      process.exit(1);
    }
  }
}

nconf.use('memory');
nconf.argv().env('.');

nconf.defaults({
  log: {
    level: 'info',
    apidebug: false,
  },
  bot: {
    prefix: '}',
    pipeChar: false, // pipes disabled for now, have to think more about it, possibly dropping this feature completely again
    shard: false, // true for auto sharding, false to force single process, or a number for a fixed count of shards
    selfbot: false, // selfbot is not fully supported right now and this may never change
    wdCheckInterval: 10000, // ms
    wdMaxPingTimestampDiff: 120000, // ms
    defaultCooldownActions: 5,
    defaultCooldownPeriod: 10, // Seconds
    redisCacheDefaultTTL: 300, // Seconds
    redisStoreTTL: 31557600, // Seconds
    maxDownloadFileSize: 10, // MB
    maxConcurrentImageJobs: 2,
    maxMessagesImageSearch: 20,
    deleteSettingsGraceTime: 86400, // Seconds
  },
  prometheus: {
    port: '9400',
  },
  webserver: {
    listen: 8080,
    listenUmask: 666,
  },
  database: {
    username: 'mclbot',
    password: 'mclbot',
    database: 'mclbot',
    host: '127.0.0.1',
    port: 5432,
    dialect: 'postgresql',
  },
  redis: {
    password: '',
    database: 0,
    host: '127.0.0.1',
    port: 6379,
    prefix: 'mclbot:',
  },
  influx: {
    username: 'root',
    password: 'root',
    database: 'mclbot',
    host: '127.0.0.1',
    port: 8086,
  },
});
