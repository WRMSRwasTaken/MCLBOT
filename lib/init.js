const nconf = require('nconf');
const winston = require('winston');
const raven = require('raven');
const Discord = require('discord.js');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const Sequelize = require('sequelize');
const prettyMs = require('pretty-ms');
const Bull = require('bull');
const Bluebird = require('bluebird');

class Init {
  constructor(main) {
    this.main = main;

    this.main.processStartTime = Date.now();

    this.main.ready = false;

    try {
      this.main.version = childProcess.execSync('git rev-parse --short HEAD').toString().trim();
      this.main.longVersion = childProcess.execSync('git rev-parse HEAD').toString().trim();
      this.main.dirty = !!require('child_process').execSync('git status -s').toString();
    } catch (ex) {
      this.main.version = undefined;
      this.main.longVersion = undefined;
      this.main.dirty = undefined;
    }
  }

  loadSettings() {
    require('./settings.js');
  }

  initBase() {
    this.main.shutdown = async (code) => {
      this.main.isShuttingDown = true;

      if (this.main.shardMaster) {
        await this.main.shardManager.shutdown();

        return;
      }

      winston.info('Application shutdown requested.');

      setTimeout(() => {
        winston.warn('Shutdown timeout after 60 seconds. Going to exit the hard way.');

        process.exit(1337);
      }, 60000);

      try {
        if (this.main.jobQueue) {
          try {
            await new Bluebird(async (resolve) => {
              winston.debug('Stopping job queue system...');
              await this.main.jobQueue.pause(true);
              resolve();
            }).timeout(10000);
          } catch (ex) {
            winston.warn('Job queue system failed to shutdown gracefully!');
          }
        }

        winston.debug('Stopping tasks...');

        for (const taskName of Object.keys(this.main.tasks)) {
          clearInterval(this.main.tasks[taskName]);
        }

        if (this.main.ready) {
          winston.debug('Disconnecting from Discord API...');

          this.main.api.destroy();

          await Bluebird.delay(2000);
        }

        if (this.main.redis) {
          winston.debug('Disconnecting from Redis backend...');
          await this.main.redis.disconnect();
        }

        if (this.main.db) {
          winston.debug('Closing database ORM...');
          await this.main.db.sequelize.close();
        }
      } catch (ex) {
        winston.warn('Unclean shutdown detected! %s', ex.message);
        process.exit(code || 1);
        return;
      }

      winston.info('Shutdown complete. Exiting.');
      process.exit(code || 0);
    };

    process.on('SIGTERM', this.main.shutdown);
    process.on('SIGINT', this.main.shutdown);

    process.on('uncaughtException', (err) => {
      raven.captureException(err);
      winston.error('Uncaught exception: %s', err.message);
    });

    process.on('unhandledRejection', (reason) => {
      if (reason.message === 'Unknown Message') {
        return; // This seems to be a bug in d.js
      }

      if (reason.message === 'Stream isn\'t writeable and enableOfflineQueue options is false') {
        winston.warn('Cannot send commands to Redis, we\'re not connected');
        return;
      }

      raven.captureException(reason);
      winston.error('Uncaught promise Error: %s', reason.message);
    });

    this.main.Discord = Discord;

    this.main.api = new Discord.Client({
      messageCacheLifetime: 15 * 60,
      messageSweepInterval: 5 * 60,
      fetchAllMembers: false,
      disableEveryone: false,
    });

    this.main.api.main = this.main; // we need that circular reference in order to access the "main" object later

    this.main.api.on('shardError', e => winston.error(`[discord.js] ${e.message}`));
    this.main.api.on('warn', e => winston.warn(`[discord.js] ${e.message}`));

    if (nconf.get('log:apiDebug') === 'true') {
      this.main.api.on('debug', debug => winston.debug(debug));
    }

    if (this.main.api.shard && this.main.api.shard.count === 0) {
      this.main.api.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
    }

    if (!this.main.api.shard && nconf.get('bot:shards') && nconf.get('bot:shards') !== 'false') {
      this.main.shardMaster = true;
    }

    const shardPrefix = winston.format((info) => {
      if (this.main.api.shard || this.main.shardMaster) {
        let prefix;

        if (this.main.shardMaster) {
          prefix = '[Shard master]';
        } else {
          prefix = `[Shard ${this.main.api.shard.ids[0]}]`;
        }

        info.message = `${prefix} ${info.message}`;
      }

      return info;
    });

    winston.add(new winston.transports.Console({
      level: nconf.get('log:level'),
      format: winston.format.combine(
        shardPrefix(),
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
      ),
    }));

    if (nconf.get('sentrydsn')) {
      raven.config(nconf.get('sentrydsn'), {
        release: this.main.version,
      });
    } else {
      raven.config(false); // we need to set that explicitly
    }

    if (!this.main.api.shard) {
      winston.info('         _____    __       _____    _____   ______');
      winston.info(' /\'\\_/`\\/\\  __`\\ /\\ \\     /\\  __`\\ /\\  __`\\/\\__  _\\');
      winston.info('/\\      \\ \\ \\/\\_\\\\ \\ \\    \\ \\ \\ \\ \\\\ \\ \\/\\ \\/_/\\ \\/');
      winston.info('\\ \\ \\__\\ \\ \\ \\/_/_\\ \\ \\  __\\ \\  _ <\'\\ \\ \\ \\ \\ \\ \\ \\');
      winston.info(' \\ \\ \\_/\\ \\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\_\\ \\ \\ \\ \\');
      winston.info('  \\ \\_\\\\ \\_\\ \\____/ \\ \\____/ \\ \\____/ \\ \\_____\\ \\ \\_\\');
      winston.info('   \\/_/ \\/_/\\/___/   \\/___/   \\/___/   \\/_____/  \\/_/');
      winston.info('');
      winston.info(`This is MCLBOT starting on git commit ${(this.main.version) ? this.main.version : 'N/A'}${(this.main.dirty) ? ' (dirty)' : ''} with discord.js version ${this.main.Discord.version}`);
      winston.info('');
      winston.info(`loglevel: ${nconf.get('log:level')} ${(nconf.get('log:level') === 'debug') ? `{ apiDebug: ${nconf.get('log:apiDebug')} - sqlDebug: ${nconf.get('log:sqlDebug')} }` : ''}`);
    } else {
      winston.info('Starting up...');

      process.title = `MCLBOT - shard ${this.main.api.shard.ids[0]}`;
    }

    if (this.main.shardMaster && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      winston.warn('Sharding is enabled and selfbot mode is set! Disabling sharding.');
      this.main.shardMaster = false;
    }

    if (!this.main.api.shard && !this.main.shardMaster && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
      winston.info('Bot is starting in standalone mode.');

      process.title = 'MCLBOT';
    }

    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      winston.info('Bot is starting in selfbot mode.');

      winston.warn('discord.js removed selfbot support since v12, running this bot in selfbot mode might result in undesirable behaviour.');
      winston.warn('As Discord officially banned selfbots this is never going to get fixed and is even intended by the discord.js devs.');
    }
  }

  checkSettings() {
    if (!fs.existsSync('.env') && !this.main.api.shard) {
      winston.warn('No .env file found in current working directory root! Application is starting with default settings.');
    }

    if (!nconf.get('bot:token')) {
      winston.error('No token has been specified, this application can not function without it! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:prefix')) {
      winston.error('No bot prefix has been specified, refusing to start without a default prefix set! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:owner') && !this.main.api.shard && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
      winston.warn('No bot owner has been specified! Admin commands will be unavailable!');
    }
  }

  launchShards() {
    winston.info('Bot is starting in shard mode.');

    process.title = 'MCLBOT - shard master';

    const ShardingManager = require('../lib/shardingManager.js');

    this.main.shardManager = new ShardingManager(this.main);

    this.main.shardManager.launchShards();
  }

  async initSQL() {
    winston.debug('Initializing SQL ORM...');

    this.main.db = {};

    const sequelize = new Sequelize(nconf.get('database:database'), nconf.get('database:username'), nconf.get('database:password'), {
      host: nconf.get('database:host'),
      port: nconf.get('database:port'),
      dialect: 'postgresql',
      logging: (msg) => {
        if (nconf.get('log:sqlDebug') === 'true') {
          return winston.debug(msg);
        }

        return false;
      },
      dialectOptions: {
        application_name: (this.main.api.shard) ? `MCLBOT - shard ${this.main.api.shard.ids[0]}` : 'MCLBOT',
      },
      pool: {
        max: parseInt(nconf.get('database:maxPoolConnections'), 10),
      },
    });

    fs
      .readdirSync(path.resolve(__dirname, '../models'))
      .filter(file => file.slice(-3) === '.js')
      .forEach((file) => {
        const model = sequelize.import(path.resolve('./models', file));
        this.main.db[model.name] = model;
      });

    for (const modelName in this.main.db) {
      if (this.main.db[modelName].associate) {
        this.main.db[modelName].associate(this.main.db);
      }
    }

    this.main.db.Sequelize = Sequelize;
    this.main.db.sequelize = sequelize;

    try {
      await this.main.db.sequelize.authenticate();
      winston.debug('SQL ORM backend ready.');
    } catch (ex) {
      winston.error('Could not connect to the SQL database! %s', ex.message);
      process.exit(1);
    }
  }

  async initRedis() {
    winston.debug('Initializing Redis...');

    let sentinels;

    if (nconf.get('redis:sentinel:addresses')) {
      sentinels = [];

      for (const sentinelNode of nconf.get('redis:sentinel:addresses').split(',')) {
        const sentinelNodeData = sentinelNode.split(':');

        sentinels.push({
          host: sentinelNodeData[0],
          port: sentinelNodeData[1] || 26379,
        });
      }
    }

    this.main.redisSentinels = sentinels;

    this.main.redis = new Redis({
      host: nconf.get('redis:host'),
      port: nconf.get('redis:port'),
      password: nconf.get('redis:password'),
      db: nconf.get('redis:database'),
      keyPrefix: nconf.get('redis:prefix'),
      enableOfflineQueue: false,
      lazyConnect: true, // for connecting manually to get a promise resolve on successful connection
      sentinels,
      name: nconf.get('redis:sentinel:name'),
      retryStrategy() {
        return 5000;
      },
    });

    this.main.redis.on('connect', () => {
      winston.debug('Connected to Redis backend.');
    });

    this.main.redis.on('ready', () => {
      if (this.main.redisConnectionLost) {
        winston.info('Reconnected to Redis.');

        this.main.redisConnectionLost = false;

        if (this.main.jobQueue) {
          winston.debug('Resuming job queue processing...');

          this.main.jobQueue.resume(true); // Workaround for https://github.com/OptimalBits/bull/issues/1170
        }
      } else {
        winston.debug('Redis backend ready.');
      }
    });

    this.main.redis.on('close', () => {
      winston.warn('Lost connection to Redis backend! Reconnecting...');

      if (!this.main.redisConnectionLost) {
        this.main.redisConnectionLost = true;

        if (this.main.jobQueue) {
          winston.debug('Pausing job queue processing...');

          this.main.jobQueue.pause(true);
        }
      }
    });

    this.main.redis.on('error', e => winston.error(`[ioredis] ${e}`));

    try {
      await this.main.redis.connect();
    } catch (ex) {
      winston.error('Could not connect to the Redis backend! %s', ex.message);
      process.exit(1);
    }

    try {
      await this.main.redis.ping();
    } catch (ex) {
      winston.error('Could not ping the Redis backend! %s', ex.message);
      process.exit(1);
    }
  }

  async initJobQueue() {
    winston.debug('Initializing job queue system...');

    this.main.jobQueue = new Bull('MCLBOT', {
      redis: {
        host: nconf.get('redis:host'),
        port: nconf.get('redis:port'),
        password: nconf.get('redis:password'),
        db: nconf.get('redis:database'),
        sentinels: this.main.redisSentinels,
        name: nconf.get('redis:sentinel:name'),
        retryStrategy() {
          return 5000;
        },
      },
      prefix: `${nconf.get('redis:prefix')}queue`,
    });

    this.main.jobQueue.on('error', e => winston.error(`[Job Queue] ${e}`));

    await this.main.jobQueue.pause(true); // We need to pause the job queue sytem because we want to connect to the Discord gateway first to see of our token actually works before trying to do stuff via REST

    winston.debug('Job queue system initialized in paused state!');
  }

  async initModules() { // TODO: I think this should be more modular...
    winston.debug('Initializing modules...');

    try {
      const PrometheusExporter = require('../lib/prometheusExporter.js');

      this.main.prometheusExporter = new PrometheusExporter(this.main);
      this.main.prometheusExporter.init();

      const Webserver = require('../lib/webserver.js');

      this.main.webserver = new Webserver(this.main);
      this.main.webserver.start();

      const CacheManager = require('../lib/cacheManager.js');

      this.main.cacheManager = new CacheManager(this.main);

      const GuildSettingsManager = require('../lib/guildSettingsManager.js');

      this.main.guildSettingsManager = new GuildSettingsManager(this.main);

      const StringUtils = require('../lib/stringUtils.js');

      this.main.stringUtils = new StringUtils(this.main);

      const UserHelper = require('../lib/userHelper.js');

      this.main.userHelper = new UserHelper(this.main);

      const PrefixHelper = require('../lib/prefixHelper.js');

      this.main.prefixHelper = new PrefixHelper(this.main);

      const BlacklistHelper = require('../lib/blacklistHelper.js');

      this.main.blacklistHelper = new BlacklistHelper(this.main);

      const ImageHelper = require('../lib/imageHelper.js');

      this.main.imageHelper = new ImageHelper(this.main);

      const AudioHelper = require('../lib/audioHelper.js');

      this.main.audioHelper = new AudioHelper(this.main);

      const PaginationHelper = require('../lib/paginationHelper.js');

      this.main.paginationHelper = new PaginationHelper(this.main);

      const ConfirmationHelper = require('../lib/confirmationHelper.js');

      this.main.confirmationHelper = new ConfirmationHelper(this.main);

      const RedisScanner = require('../lib/redisScanner.js');

      this.main.redisScanner = new RedisScanner(this.main);

      const CooldownHelper = require('../lib/cooldownHelper.js');

      this.main.cooldownHelper = new CooldownHelper(this.main);

      const CommandHandler = require('../lib/commandHandler.js');

      this.main.commandHandler = new CommandHandler(this.main);

      const JobHelper = require('../lib/jobHelper.js');

      this.main.jobHelper = new JobHelper(this.main);

      const RPCHelper = require('../lib/rpcHelper.js');

      this.main.rpcHelper = new RPCHelper(this.main);

      const EventDebouncer = require('../lib/eventDebouncer.js');

      this.main.eventDebouncer = new EventDebouncer(this.main);

      const ChannelLogHelper = require('../lib/channelLogHelper.js');

      this.main.channelLogHelper = new ChannelLogHelper(this.main);

      const ResourceLoader = require('../lib/resourceLoader.js');

      this.main.resourceLoader = new ResourceLoader(this.main);

      const ConnectionManager = require('../lib/connectionManager.js');

      this.main.connectionManager = new ConnectionManager(this.main);
    } catch (ex) {
      winston.error('There was an error while initializing the modules! %s', ex.message);

      process.exit(1);
    }

    winston.debug('Loading bot resources...');
    await this.main.resourceLoader.loadTypeFiles();
    await this.main.resourceLoader.loadMiddlewareFiles();
    await this.main.resourceLoader.loadCommandFiles();
    await this.main.resourceLoader.loadTaskFiles();
    await this.main.resourceLoader.loadJobFiles();
    await this.main.resourceLoader.loadEventFiles();
  }

  async startShard() {
    await this.initRedis();
    await this.initSQL();

    await this.initJobQueue();

    await this.initModules();

    winston.info(`Startup completed in ${prettyMs(Date.now() - this.main.processStartTime)}. Connecting to Discord API...`);

    this.main.connectionManager.connectToDiscord();
  }
}

module.exports = Init;
