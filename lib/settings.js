const nconf = require('nconf');
const dotenv = require('dotenv');

dotenv.config();

nconf.use('memory');
nconf.argv().env('.');

nconf.defaults({
  log: {
    level: 'info',
    commands: false,
    apiDebug: false,
    sqlDebug: false,
  },
  bot: {
    prefix: '}',
    stealth: true, // disables command invokation for non-bot owners
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
    userAgentString: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36',
  },
  prometheus: {
    port: '9400',
  },
  webserver: {
    listen: 3000,
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
