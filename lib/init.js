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
      winston.info('Application shutdown requested.');

      try {
        winston.debug('Stopping job queue system...');
        await this.main.jobQueue.pause(true);

        winston.debug('Disconnecting from Discord API...');
        await this.main.api.destroy();

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

    this.main.api.on('error', e => winston.error(`[discord.js] ${e}`));
    this.main.api.on('error', e => winston.error(e));
    this.main.api.on('warn', e => winston.warn(`[discord.js] ${e}`));

    if (nconf.get('log:apiDebug') === 'true') {
      this.main.api.on('debug', debug => winston.debug(debug));
    }

    if (this.main.api.shard && this.main.api.shard.count === 0) {
      this.main.api.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
    }

    if (!this.main.api.shard && nconf.get('bot:shard')) {
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

    if (this.main.shardMaster && nconf.get('bot:selfbot')) {
      winston.warn('Sharding is enabled and selfbot mode is set! Disabling sharding.');
      this.main.shardMaster = false;
    }

    if (!this.main.api.shard && !this.main.shardMaster && !nconf.get('bot:selfbot')) {
      winston.info('Bot is starting in standalone mode.');
    }

    if (nconf.get('bot:selfbot')) {
      winston.info('Bot is starting in selfbot mode.');
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

    if (!nconf.get('bot:owner') && !this.main.api.shard && !nconf.get('bot:selfbot')) {
      winston.warn('No bot owner has been specified! Admin commands will be unavailable!');
    }
  }

  launchShards() {
    winston.info('Bot is starting in shard mode.');

    const shardManager = new Discord.ShardingManager(process.argv[1], {
      token: nconf.get('bot:token'),
    });

    shardManager.on('launch', (shard) => {
      winston.debug('Launching shard: %s', shard.id);
    });

    shardManager.spawn((nconf.get('bot:shard') === true) ? 'auto' : nconf.get('bot:shard'));
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
      winston.error('Could not connect to the SQL database!');
      process.exit(1);
    }
  }

  async initRedis() {
    winston.debug('Initializing Redis...');

    this.main.redis = new Redis({
      host: nconf.get('redis:host'),
      port: nconf.get('redis:port'),
      password: nconf.get('redis:password'),
      db: nconf.get('redis:database'),
      keyPrefix: nconf.get('redis:prefix'),
      enableOfflineQueue: false,
      lazyConnect: true, // for connecting manually to get a promise resolve on successful connection
      retryStrategy() {
        return 5000;
      },
    });

    this.main.redis.on('ready', () => {
      winston.debug('Connected to Redis backend.');
    });

    this.main.redis.on('close', () => {
      winston.warn('Lost connection to Redis backend! Reconnecting in 5 seconds...');
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
      },
      prefix: `${nconf.get('redis:prefix')}queue`,
    });

    await this.main.jobQueue.pause(true);

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
    await this.main.resourceLoader.generateHelpPages();
  }

  async connectToDAPI() {
    this.main.api.on('ready', async () => {
      if (!this.main.api.user.bot && !nconf.get('bot:selfbot')) {
        winston.error('The token provided is not a bot token and selfbot mode has not been enabled. Exiting.');

        this.main.shutdown(1);

        return;
      }

      if (this.main.api.user.bot && nconf.get('bot:selfbot')) {
        winston.error('The token provided is a bot token, but selfbot mode has been enabled. Exiting.');

        this.main.shutdown(1);

        return;
      }

      winston.info(`Ready event has been fired after ${(Date.now() - this.main.startedTime) / 1000} second(s).`);

      this.main.mentionRegex = XRegExp(`^<@!?${this.main.api.user.id}>`);

      this.main.connectTime = Date.now();

      this.main.ready = true;

      winston.debug('Starting job queue processing...');

      await this.main.jobQueue.resume(true);

      if (!this.main.readyEventFired) { // When Discord is having problems, it is going to send the READY event instead of a RESUME event sometimes after a reconnection when the session got invalidated
        winston.info('Registering event handlers and starting tasks...');

        await this.main.resourceLoader.loadEventFiles();

        this.main.resourceLoader.startTasks();

        this.main.readyEventFired = true;
      }

      winston.info(`Now live in ${this.main.api.channels.size} channels on ${this.main.api.guilds.size} servers.`);

      if (nconf.get('bot:logchannel')) { // This is broken when sharded
        winston.debug('Checking log channel permissions...');

        const logChannel = this.main.api.channels.get(nconf.get('bot:logchannel'));

        if (!logChannel) {
          winston.warn('Invalid log channel! Logging will be disabled!');
          nconf.set('bot:logchannel', null);
          return;
        }

        if (!logChannel.permissionsFor(logChannel.guild.me).has('SEND_MESSAGES')) {
          winston.warn('Permissions missing for specified log channel! Logging will be disabled!');
          nconf.set('bot:logchannel', null);
          return;
        }

        winston.debug('Log channel permissions looking good, logging enabled.');
      }
    });

    this.main.api.on('disconnect', (event) => {
      this.main.ready = false;
      winston.warn('Disconnected from Discord API! Code: %d', event.code);

      winston.debug('Pausing job queue processing due to Discord API connection loss...');

      this.main.jobQueue.pause(true);
    });

    this.main.api.on('reconnecting', () => {
      this.main.ready = false;
      this.main.disconnectTime = Date.now();

      winston.warn('Lost connection to Discord API! Reconnecting...');

      winston.debug('Pausing job queue processing due to Discord API connection loss...');

      this.main.jobQueue.pause(true);
    });

    this.main.api.on('resumed', (replayed) => {
      this.main.ready = true;
      this.main.connectTime = Date.now();

      winston.info(`Resumed connection to Discord API after ${prettyMs(this.main.connectTime - this.main.disconnectTime)}. Replayed ${replayed} event(s).`);

      winston.debug('Resuming job queue processing...');

      this.main.jobQueue.resume(true);
    });

    winston.info(`Startup completed in ${(Date.now() - this.main.startTime) / 1000} second(s). Connecting to Discord API...`);

    this.main.startedTime = Date.now();

    let cancelConnectLoop = false;

    while (!cancelConnectLoop) {
      try {
        await this.main.api.login(nconf.get('bot:token'));

        cancelConnectLoop = true;
      } catch (ex) {
        if (ex.message === 'The connection to the gateway timed out.') {
          winston.error('Timeout while trying to connect to to the Discord API! Trying again in 10 seconds...');

          await Bluebird.delay(10000);
        } else {
          winston.error('Unable to connect to Discord API! %s', ex.message);

          cancelConnectLoop = true;

          this.main.shutdown(1);
        }
      }
    }
  }

  async startShard() {
    await this.initRedis();
    await this.initSQL();
    await this.initInflux();
    await this.initJobQueue();

    await this.initModules();

    this.connectToDAPI();
  }
}

module.exports = Init;
