const nconf = require('nconf');
const winston = require('winston');
const raven = require('raven');
const Discord = require('discord.js');
const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const Influx = require('influx');
const Sequelize = require('sequelize');
const prettyMs = require('pretty-ms');
const XRegExp = require('xregexp');
const Bull = require('bull');
const Bluebird = require('bluebird');

class Init {
  constructor(main) {
    this.main = main;

    this.main.startTime = Date.now();

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
      if (this.main.shardMaster) {
        await this.main.shardManager.shutdown();

        return;
      }

      winston.info('Application shutdown requested.');

      try {
        if (this.main.jobQueue) {
          try {
            await new Bluebird(async (resolve, reject) => {
              winston.debug('Stopping job queue system...');
              await this.main.jobQueue.pause(true);
              resolve();
            }).timeout(10000);
          } catch (ex) {
            winston.warn('Job queue system failed to shutdown gracefully!');
          }
        }

        if (this.main.ready) {
          winston.debug('Disconnecting from Discord API...');
          await this.main.api.destroy();
        }

        if (this.main.webserver) {
          this.main.webserver.exit();
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

    this.main.api.on('error', e => winston.error(`[discord.js] ${e}`));
    this.main.api.on('warn', e => winston.warn(`[discord.js] ${e}`));

    if (nconf.get('log:apiDebug') === 'true') {
      this.main.api.on('debug', debug => winston.debug(debug));
    }

    if (this.main.api.shard && this.main.api.shard.count === 0) {
      this.main.api.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
    }

    if (!this.main.api.shard && nconf.get('bot:shard') && nconf.get('bot:shard') !== 'false') {
      this.main.shardMaster = true;
    }

    const shardPrefix = winston.format((info) => {
      if (this.main.api.shard || this.main.shardMaster) {
        let prefix;

        if (this.main.shardMaster) {
          prefix = '[Shard master]';
          process.title = 'MCLBOT - shard master';
        } else {
          prefix = `[Shard ${this.main.api.shard.id}]`;
          process.title = `MCLBOT - shard ${this.main.api.shard.id}`;
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
    }

    if (this.main.shardMaster && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      winston.warn('Sharding is enabled and selfbot mode is set! Disabling sharding.');
      this.main.shardMaster = false;
    }

    if (!this.main.api.shard && !this.main.shardMaster && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
      winston.info('Bot is starting in standalone mode.');
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
      dialect: nconf.get('database:dialect'),
      logging: (msg) => {
        if (nconf.get('log:sqlDebug') === 'true') {
          return winston.debug(msg);
        }

        return false;
      },
      operatorsAliases: false, // https://github.com/sequelize/sequelize/issues/8417
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

        winston.debug('Resuming job queue processing...');

        this.main.jobQueue.resume(true); // If a Redis failover has occurred, it seems that bull somehow gets stuck and causes high CPU usage. Pausing the queue and resuming it seems to work as workaround.
      } else {
        winston.debug('Redis backend ready.');
      }
    });

    this.main.redis.on('close', () => {
      winston.warn('Lost connection to Redis backend! Reconnecting...');

      if (!this.main.redisConnectionLost) {
        winston.debug('Pausing job queue processing...');

        this.main.redisConnectionLost = true;

        this.main.jobQueue.pause(true);
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

  async initInflux() {
    winston.debug('Initializing InfluxDB...');

    this.main.Influx = Influx;

    this.main.influx = new Influx.InfluxDB({
      host: nconf.get('influx:host'),
      port: nconf.get('influx:port'),
      username: nconf.get('influx:username'),
      password: nconf.get('influx:password'),
      database: nconf.get('influx:database'),
      schema: [
        {
          measurement: 'member_message',
          fields: {
            message_id: Influx.FieldType.STRING,
            char_count: Influx.FieldType.INTEGER,
            word_count: Influx.FieldType.INTEGER,
            user_mention_count: Influx.FieldType.INTEGER,
            attachment_count: Influx.FieldType.INTEGER,
          },
          tags: ['guild_id', 'user_id', 'channel_id'],
        },
        {
          measurement: 'member_status',
          fields: {
            online: Influx.FieldType.INTEGER,
            idle: Influx.FieldType.INTEGER,
            dnd: Influx.FieldType.INTEGER,
            offline: Influx.FieldType.INTEGER,
            total: Influx.FieldType.INTEGER,
          },
          tags: ['guild_id'],
        },
        {
          measurement: 'member_join',
          fields: {
            user_id: Influx.FieldType.STRING,
          },
          tags: ['guild_id'],
        },
        {
          measurement: 'member_leave',
          fields: {
            user_id: Influx.FieldType.STRING,
          },
          tags: ['guild_id'],
        },
      ],
    });
  }

  async initModules() { // TODO: I think this should be more modular...
    winston.debug('Initializing modules...');

    try {
      const PrometheusExporter = require('../lib/prometheusExporter.js');

      this.main.prometheusExporter = new PrometheusExporter(this.main);
      this.main.prometheusExporter.init();

      // const Webserver = require('../lib/webserver.js');
      //
      // this.main.webserver = new Webserver(this.main);
      // this.main.webserver.init();

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

      const ChannelLogHelper = require('../lib/channelLogHelper.js');

      this.main.channelLogHelper = new ChannelLogHelper(this.main);

      const ResourceLoader = require('../lib/resourceLoader.js');

      this.main.resourceLoader = new ResourceLoader(this.main);
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
  }

  async connectToDAPI() {
    this.main.api.on('ready', async () => {
      if (!this.main.api.user.bot && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
        winston.error('The token provided is not a bot token and selfbot mode has not been enabled. Exiting.');

        this.main.shutdown(1);

        return;
      }

      if (this.main.api.user.bot && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
        winston.error('The token provided is a bot token, but selfbot mode has been enabled. Exiting.');

        this.main.shutdown(1);

        return;
      }

      winston.info(`Ready event has been fired after ${prettyMs(Date.now() - this.main.startedTime)}.`);

      this.main.mentionRegex = XRegExp(`^<@!?${this.main.api.user.id}>`);

      this.main.connectTime = Date.now();
      this.main.ready = true;
      this.main.firstReady = true;
      this.main.cancelConnectLoop = true;

      winston.debug('Starting job queue processing...');

      await this.main.jobQueue.resume(true);

      if (!this.main.readyEventFired) { // When Discord is having problems, it is going to send the READY event instead of a RESUME event sometimes after a reconnection when the session got invalidated
        winston.info('Registering event handlers and starting tasks...');

        await this.main.resourceLoader.loadEventFiles();

        this.main.resourceLoader.startTasks();

        this.main.readyEventFired = true;
      }

      await this.main.channelLogHelper.checkLogChannel();

      this.main.channelLogHelper.sendLogMessage('ready', {
        readyDuration: Date.now() - this.main.startedTime,
      });

      winston.info(`Now live in ${this.main.api.channels.size} channels on ${this.main.api.guilds.size} servers.`);
    });

    this.main.api.on('disconnect', (event) => {
      if (!this.main.ready) {
        return;
      }

      this.main.channelLogHelper.sendLogMessage('disconnect', {
        event,
      });

      this.main.ready = false;
      winston.warn('Disconnected from Discord API! Code: %d', event.code);

      this.main.shutdown(1);
    });

    this.main.api.on('reconnecting', () => {
      if (!this.main.ready) {
        return;
      }

      this.main.ready = false;
      this.main.disconnectTime = Date.now();

      this.main.channelLogHelper.sendLogMessage('reconnecting');

      winston.warn('Lost connection to Discord API! Reconnecting...');
    });

    this.main.api.on('resumed', (replayed) => {
      if (!this.main.firstReady) {
        winston.info('Resumed event has been fired although there was no ready event before!');

        return;
      }

      this.main.ready = true;
      this.main.connectTime = Date.now();

      this.main.channelLogHelper.sendLogMessage('resumed', {
        replayed,
        reconnectDuration: this.main.connectTime - this.main.disconnectTime,
      });

      winston.info(`Resumed connection to Discord API after ${prettyMs(this.main.connectTime - this.main.disconnectTime)}. Replayed ${replayed} event(s).`);
    });

    winston.info(`Startup completed in ${prettyMs(Date.now() - this.main.startTime)}. Connecting to Discord API...`);

    this.main.startedTime = Date.now();

    this.main.cancelConnectLoop = false;

    this.main.reconnectRetries = 0;

    while (!this.main.cancelConnectLoop) {
      try {
        await this.main.api.login(nconf.get('bot:token'));

        this.main.cancelConnectLoop = true;
      } catch (ex) {
        if (ex.message === 'The connection to the gateway timed out.') {
          this.main.reconnectRetries += 1;

          if (this.main.reconnectRetries >= 10) {
            // Discord.js seems to get into a "stuck" state where it fails to reconnect or connect at all
            // when the Discord API came up again after having problems but it still keeps timing out, so we're just exiting here to (hopefully) restart the bot externally.
            winston.error('Unable to connect to the Discord API after 10 retries, giving up.');

            this.main.cancelConnectLoop = true;

            this.main.shutdown(1);
          } else {
            winston.error('Timeout while trying to connect to to the Discord API! Trying again in 60 seconds...');

            await Bluebird.delay(60000);
          }
        } else {
          winston.error('Unable to connect to Discord API! %s', ex.message);

          this.main.cancelConnectLoop = true;

          this.main.shutdown(1);
        }
      }
    }
  }

  async startShard() {
    await this.initRedis();
    await this.initSQL();
    // await this.initInflux();
    await this.initJobQueue();

    await this.initModules();

    this.connectToDAPI();
  }
}

module.exports = Init;
