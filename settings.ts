import nconf from 'nconf';
import dotenv from 'dotenv';

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
    stealth: false, // disables command invokation for non-bot owners
    pipeChar: false, // pipes disabled for now, have to think more about it, possibly dropping this feature completely again
    shards: false, // number of shards to spawn, or false for single process mode
    waitForReady: true, // false to disable waiting for previously spawned shard to become ready before spawning another one
    wdCheckInterval: 10000, // ms
    wdMaxPingTimestampDiff: 120000, // ms
    defaultCooldownActions: 5,
    defaultCooldownPeriod: 10, // Seconds
    redisCacheDefaultTTL: 300, // Seconds
    redisStoreTTL: 31557600, // Seconds
    maxDownloadFileSize: 10, // MB
    maxConcurrentImageJobs: 2,
    maxMessagesSearch: 50,
    deleteSettingsGraceTime: 86400, // Seconds
    userAgentString: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:67.0) Gecko/20100101 Firefox/67.0',
  },
  fapi: {
    address: 'https://fapi.wrmsr.io',
  },
  prometheus: {
    port: 9400,
  },
  webserver: {
    port: 3000,
    address: '0.0.0.0',
    trustproxy: 'uniquelocal',
  },
  database: {
    username: 'mclbot',
    password: 'mclbot',
    database: 'mclbot',
    host: '127.0.0.1',
    port: 5432,
    maxPoolConnections: 100,
  },
  redis: {
    password: '',
    database: 0,
    host: '127.0.0.1',
    port: 6379,
    prefix: 'mclbot:',
  },
});

export {};
