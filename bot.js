/*
         ____     __       ____     _____   ______
 /'\_/`\/\  _`\  /\ \     /\  _`\  /\  __`\/\__  _\
/\      \ \ \/\_\\ \ \    \ \ \ \ \\ \ \/\ \/_/\ \/
\ \ \__\ \ \ \/_/_\ \ \  __\ \  _ <'\ \ \ \ \ \ \ \
 \ \ \_/\ \ \ \ \ \\ \ \ \ \\ \ \ \ \\ \ \_\ \ \ \ \
  \ \_\\ \_\ \____/ \ \____/ \ \____/ \ \_____\ \ \_\
   \/_/ \/_/\/___/   \/___/   \/___/   \/_____/  \/_/

 */

const nconf = require('nconf');
const winston = require('winston');
const raven = require('raven');
const Discord = require('discord.js');
const childProcess = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const Redis = require('ioredis');
const Sequelize = require('sequelize');
const prettyMs = require('pretty-ms');
const Bluebird = require('bluebird');

const main = {};

class MCLBOT {
  async start() {
    this.loadAndCheckSettings();

    this.initBase();

    await this.loadModules();

    await this.initRedis();

    await this.initSQL();

    await this.initializeModules();

    winston.info(`Startup completed in ${prettyMs(Date.now() - main.processStartTime)}. Connecting to Discord API...`);

    main.preConnectTime = Date.now();

    try {
      await main.api.login(nconf.get('bot:token'));
    } catch (ex) {
      winston.error('Unable to connect to Discord API! %s. Exiting...', ex.message);

      this.shutdown(1);
    }
  }

  loadAndCheckSettings() {
    try {
      require(path.resolve(__dirname, 'settings.js'));
    } catch (ex) {
      winston.error('There was an error loading the settings file: %s Exiting.', ex.message);
      process.exit(1);
    }

    if (!nconf.get('bot:token')) {
      winston.error('No token has been specified, this application can not function without it! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:prefix')) {
      winston.error('No bot prefix has been specified, refusing to start without a default prefix set! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:owner') && (!nconf.get('bot:selfbot') || nconf.get('bot:selfbot') === 'false')) {
      winston.warn('No bot owner has been specified! Admin commands will be unavailable!');
    }
  }

  initBase() {
    process.on('SIGTERM', this.shutdown);
    process.on('SIGINT', this.shutdown);

    main.shutdown = this.shutdown;

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

    main.processStartTime = Date.now();

    main.ready = false;
    main.firstReady = false;

    try {
      main.version = childProcess.execSync('git rev-parse --short HEAD').toString().trim();
      main.longVersion = childProcess.execSync('git rev-parse HEAD').toString().trim();
      main.dirty = !!require('child_process').execSync('git status -s').toString();
    } catch (ex) {
      main.version = undefined;
      main.longVersion = undefined;
      main.dirty = undefined;
    }

    main.Discord = Discord;

    main.api = new Discord.Client({
      messageCacheLifetime: 15 * 60,
      messageSweepInterval: 5 * 60,
      fetchAllMembers: false,
      disableEveryone: false,
      shards: nconf.get('bot:shard') ? parseInt(nconf.get('bot:shard'), 10) : undefined,
      shardCount: nconf.get('bot:shardcount') ? parseInt(nconf.get('bot:shardcount'), 10) : undefined,
    });

    // main.api.main = main; // we need that circular reference in order to access the "main" object later

    main.api.on('shardError', (e) => winston.error(`[discord.js] ${e.message}`));
    main.api.on('warn', (e) => winston.warn(`[discord.js] ${e.message}`));
    main.api.on('rateLimit', (rateLimitInfo) => winston.warn(`Ratelimit: ${rateLimitInfo.method} ${rateLimitInfo.path} ${rateLimitInfo.limit}`));

    if (nconf.get('log:apiDebug') === 'true') {
      main.api.on('debug', (debug) => winston.debug(debug));
    }

    // if (!main.api.shard && nconf.get('bot:shards') && nconf.get('bot:shards') !== 'false') {
    //   main.shardMaster = true;
    // }

    winston.add(new winston.transports.Console({
      level: nconf.get('log:level'),
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
      ),
    }));

    if (nconf.get('sentrydsn')) {
      raven.config(nconf.get('sentrydsn'), {
        release: main.version,
      });
    } else {
      raven.config(false); // we need to set that explicitly
    }

    winston.info('         _____    __       _____    _____   ______');
    winston.info(' /\'\\_/`\\/\\  __`\\ /\\ \\     /\\  __`\\ /\\  __`\\/\\__  _\\');
    winston.info('/\\      \\ \\ \\/\\_\\\\ \\ \\    \\ \\ \\ \\ \\\\ \\ \\/\\ \\/_/\\ \\/');
    winston.info('\\ \\ \\__\\ \\ \\ \\/_/_\\ \\ \\  __\\ \\  _ <\'\\ \\ \\ \\ \\ \\ \\ \\');
    winston.info(' \\ \\ \\_/\\ \\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\_\\ \\ \\ \\ \\');
    winston.info('  \\ \\_\\\\ \\_\\ \\____/ \\ \\____/ \\ \\____/ \\ \\_____\\ \\ \\_\\');
    winston.info('   \\/_/ \\/_/\\/___/   \\/___/   \\/___/   \\/_____/  \\/_/');
    winston.info('');
    winston.info(`This is MCLBOT starting on git commit ${(main.version) ? main.version : 'N/A'}${(main.dirty) ? ' (dirty)' : ''} with discord.js version ${main.Discord.version}`);
    winston.info('');
    winston.info(`loglevel: ${nconf.get('log:level')} ${(nconf.get('log:level') === 'debug') ? `{ apiDebug: ${nconf.get('log:apiDebug')} - sqlDebug: ${nconf.get('log:sqlDebug')} }` : ''}`);

    process.title = 'MCLBOT';

    if (nconf.get('bot:selfbot') && nconf.get('bot:selfbot') && nconf.get('bot:selfbot') !== 'false') {
      winston.info('Bot is starting in selfbot mode.');

      winston.warn('discord.js removed selfbot support since v12, running this bot in selfbot mode might result in undesirable behaviour.');
      winston.warn('As Discord officially banned selfbots this is never going to get fixed and is even intended by the discord.js devs.');
    }
  }

  async initSQL() {
    winston.debug('Initializing SQL ORM...');

    main.db = {};

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
        application_name: 'MCLBOT',
      },
      pool: {
        max: parseInt(nconf.get('database:maxPoolConnections'), 10),
      },
    });

    fs
      .readdirSync(path.resolve(__dirname, './models'))
      .filter((file) => file.slice(-3) === '.js')
      .forEach((file) => {
        const model = sequelize.import(path.resolve('./models', file));
        main.db[model.name] = model;
      });

    for (const modelName in main.db) {
      if (main.db[modelName].associate) {
        main.db[modelName].associate(main.db);
      }
    }

    main.db.Sequelize = Sequelize;
    main.db.sequelize = sequelize;

    try {
      await main.db.sequelize.authenticate();
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

    main.redisSentinels = sentinels;

    main.redis = new Redis({
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

    main.redis.on('connect', () => {
      winston.debug('Connected to Redis backend.');
    });

    main.redis.on('ready', () => {
      if (main.redisConnectionLost) {
        winston.info('Reconnected to Redis.');

        main.redisConnectionLost = false;
      } else {
        winston.debug('Redis backend ready.');
      }
    });

    main.redis.on('close', () => {
      winston.warn('Lost connection to Redis backend! Reconnecting...');

      if (!main.redisConnectionLost) {
        main.redisConnectionLost = true;
      }
    });

    main.redis.on('error', (e) => winston.error(`[ioredis] ${e}`));

    try {
      await main.redis.connect();
    } catch (ex) {
      winston.error('Could not connect to the Redis backend! %s', ex.message);
      process.exit(1);
    }

    try {
      await main.redis.ping();
    } catch (ex) {
      winston.error('Could not ping the Redis backend! %s', ex.message);
      process.exit(1);
    }
  }

  async loadModules() {
    winston.debug('Loading bot modules...');

    const modulesDir = await fs.readdir(path.resolve(__dirname, './lib'));

    for (const module of modulesDir) {
      if (module.slice(-3) === '.js') {
        const moduleName = module.substring(0, module.lastIndexOf('.'));

        try {
          const NewModule = require(path.resolve(__dirname, './lib', module));

          // TODO: put those modules in main.modules.<module name>
          main[moduleName] = new NewModule(main);

          winston.debug('Bot module loaded: %s', moduleName);
        } catch (ex) {
          winston.error(`Error loading module ${moduleName}: ${ex.message}`);
          process.exit(1);
        }
      }
    }
  }

  async initializeModules() {
    for (const [moduleName, module] of Object.entries(main)) {
      if (typeof module.initializeModule === 'function') {
        try {
          await module.initializeModule();

          winston.debug('Bot module initialized: %s', moduleName);
        } catch (ex) {
          winston.error(`Error initializing module ${moduleName}: ${ex.message}`);
          process.exit(1);
        }
      }
    }
  }

  async shutdown(code) {
    main.isShuttingDown = true;

    winston.info('Application shutdown requested.');

    setTimeout(() => {
      winston.warn('Shutdown timeout after 60 seconds. Going to exit the hard way.');

      process.exit(1337);
    }, 60000);

    try {
      winston.debug('Stopping tasks...');

      for (const taskName of Object.keys(main.runningTasks)) {
        clearInterval(main.runningTasks[taskName]);
      }

      if (main.ready) {
        winston.debug('Disconnecting from Discord API...');

        main.api.destroy();

        await Bluebird.delay(2000);
      }

      if (main.redis) {
        winston.debug('Disconnecting from Redis backend...');
        await main.redis.disconnect();
      }

      if (main.db) {
        winston.debug('Closing database ORM...');
        await main.db.sequelize.close();
      }
    } catch (ex) {
      winston.warn('Unclean shutdown detected! %s', ex.message);
      process.exit(code || 1);
      return;
    }

    winston.info('Shutdown complete. Exiting.');
    process.exit(code || 0);
  }
}

new MCLBOT().start();
