const nconf = require('nconf');
const dotenv = require('dotenv');
const winston = require('winston');
const Discord = require('discord.js');
const childProcess = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');
const Redis = require('ioredis');
const Influx = require('influx');

class Init {
  constructor(main) {
    this.main = main;

    this.main.startTime = Date.now();

    dotenv.config();

    nconf.use('memory');
    nconf.argv().env('.');

    global.env = process.env.NODE_ENV || 'production';

    this.main.initialized = false;
  }

  setDefaults() {
    nconf.defaults({
      bot: {
        prefix: 'm!',
        shard: 'no',
        respondUnknown: false,
      },
      prometheus: {
        port: '9400',
      },
      rpc: {
        port: '1337',
      },
      webserver: {
        listen: 8080,
        listenUmask: 666,
      },
      database: {
        username: 'mclbot',
        // password: null,
        database: 'mclbot',
        host: '127.0.0.1',
        port: 5432,
        dialect: 'postgresql',
      },
      redis: {
        // password: null,
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
  }

  initLog() {
    nconf.set('loglevel', nconf.get('loglevel') || (global.env === 'production' ? 'info' : 'debug'));

    winston.remove(winston.transports.Console);
    winston.add(winston.transports.Console, {
      level: nconf.get('loglevel'),
      json: false,
      colorize: true,
      debugStdout: true,
      timestamp: true,
    });

    winston.debug('Logging initialized.');
  }

  initAPI() {
    this.main.Discord = Discord;

    this.main.api = new Discord.Client({
      messageCacheLifetime: 15 * 60,
      messageSweepInterval: 5 * 60,
      fetchAllMembers: false,
      disableEveryone: false,
    });

    if (this.main.api.shard && this.main.api.shard.count === 0) {
      this.main.api.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
    }

    winston.debug(`Discord.js version ${this.main.Discord.version} initialized.`);

    try {
      this.main.version = childProcess.execSync('git rev-parse --short HEAD').toString().trim();
    } catch (ex) {
      winston.warn('Could not get GIT version information!');
      this.main.version = 'N/A';
    }
  }

  printLogo() {
    winston.info('         ____     __       ____     _____   ______');
    winston.info(' /\'\\_/`\\/\\  _`\\  /\\ \\     /\\  _`\\  /\\  __`\\/\\__  _\\');
    winston.info('/\\      \\ \\ \\/\\_\\\\ \\ \\    \\ \\ \\ \\ \\\\ \\ \\/\\ \\/_/\\ \\/');
    winston.info('\\ \\ \\__\\ \\ \\ \\/_/_\\ \\ \\  __\\ \\  _ <\'\\ \\ \\ \\ \\ \\ \\ \\');
    winston.info(' \\ \\ \\_/\\ \\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\_\\ \\ \\ \\ \\');
    winston.info('  \\ \\_\\\\ \\_\\ \\____/ \\ \\____/ \\ \\____/ \\ \\_____\\ \\ \\_\\');
    winston.info('   \\/_/ \\/_/\\/___/   \\/___/   \\/___/   \\/_____/  \\/_/');
    winston.info(`         --- core: ${this.main.version} - api: ${this.main.Discord.version} ---`);
    winston.info('');
    winston.info(`env: ${global.env}, loglevel: ${nconf.get('loglevel')}`);
  }

  checkSettings() {
    if (!fs.existsSync('.env') && !this.main.api.shard) {
      winston.warn('No .env file found in current working directory root! Application is starting with default settings.');
    }

    if (!nconf.get('bot:token')) {
      winston.error('No token has been specified, this application can not function without it! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:owner') && !this.main.api.shard) {
      this.main.owner = [];
      winston.warn('No bot owner(s) has/have been specified! Admin commands will be unavailable!');
    } else {
      this.main.owner = nconf.get('bot:owner').split(',');
    }
  }

  initBase() {
    this.main.shutdown = async (code) => {
      winston.info('Application shutdown requested.');

      try {
        winston.debug('Disconnecting from Discord API...');
        await this.main.api.destroy();

        this.main.webserver.exit();

        winston.debug('Disconnecting from Redis backend...');
        await this.main.redis.disconnect();

        winston.debug('Closing database ORM...');
        await this.main.db.sequelize.close();
      } catch (ex) {
        winston.warn('Unclean shutdown detected!', ex.message);
        process.exit(code || 1);
        return;
      }

      winston.info('Shutdown complete. Exiting.');
      process.exit(code || 0);
    };

    process.on('SIGTERM', this.main.shutdown);
    process.on('SIGINT', this.main.shutdown);
    process.on('uncaughtException', (err) => {
      winston.error(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} uncaught` : 'Uncaught'} exception`, err);
    });

    process.on('unhandledRejection', (err) => {
      winston.error(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} uncaught` : 'Uncaught'} promise Error`, err);
    });

    if (!this.main.api.shard && nconf.get('bot:shard') === 'auto') {
      this.main.shardMaster = true;
    }

    if (!this.main.api.shard && !this.main.shardMaster) {
      winston.info('Bot is starting in standalone mode.');
    }
  }

  createRPCSocket() {
    net.createServer((socket) => {
      winston.debug('RPC socket connection from:', socket.remoteAddress);

      socket.on('data', async (data) => {
        try {
          const answer = await eval(data.toString());
          socket.write(`${JSON.stringify(answer)}${os.EOL}`);
        } catch (ex) {
          winston.error('RPC socket error:', ex.message);
        }
      });

      socket.on('end', () => {
        winston.debug('RPC socket disconnect from:', socket.remoteAddress);
      });
    }).listen(nconf.get('rpc:port'));
    winston.info('RPC socket listening on port:', nconf.get('rpc:port'));
  }

  launchShards() {
    winston.info('Bot is starting in shard mode.');

    process.title = 'MCLBOT - shard master';

    const shardManager = new Discord.ShardingManager(process.argv[1], {
      token: nconf.get('bot:token'),
    });

    shardManager.on('launch', (shard) => {
      winston.debug('Launching shard:', shard.id);
    });

    shardManager.spawn();
  }

  async initSQL() {
    winston.debug('Initializing SQL ORM...');
    this.main.db = require('../models/index.js');

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
      retryStrategy() {
        return 5000;
      },
    });

    this.main.redis.on('ready', () => {
      winston.debug(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} connected` : 'Connected'} to Redis backend.`);
    });
    this.main.redis.on('close', () => {
      winston.warn(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} lost` : 'Lost'} connection to Redis backend! Reconnecting in 5 seconds...`);
    });

    try {
      await this.main.redis.ping();
    } catch (ex) {
      winston.error('Could not connect to the Redis backend!');
      process.exit(1);
    }
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
          tags: ['server_id', 'user_id', 'channel_id'],
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
          tags: ['server_id'],
        },
        {
          measurement: 'member_join',
          fields: {
            user_id: Influx.FieldType.STRING,
          },
          tags: ['server_id'],
        },
        {
          measurement: 'member_leave',
          fields: {
            user_id: Influx.FieldType.STRING,
          },
          tags: ['server_id'],
        },
      ],
    });
  }

  initModules() {
    winston.debug('Initializing modules...');

    const PrometheusExporter = require('../lib/prometheusExporter.js');

    this.main.prometheusExporter = new PrometheusExporter(this.main);
    this.main.prometheusExporter.init();

    const Webserver = require('../lib/webserver.js');

    this.main.webserver = new Webserver(this.main);
    this.main.webserver.init();

    const Watchdog = require('../lib/watchdog.js');

    this.main.watchdog = new Watchdog(this.main);

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

    const CommandHandler = require('../lib/commandHandler.js');

    this.main.commandHandler = new CommandHandler(this.main);

    const ResourceLoader = require('../lib/resourceLoader.js');

    this.main.resourceLoader = new ResourceLoader(this.main);

    winston.debug('Loading bot resources...');
    this.main.resourceLoader.loadCommandFiles();
    this.main.resourceLoader.loadEventFiles();
    this.main.resourceLoader.loadTaskFiles();
    this.main.resourceLoader.generateHelpPages();
  }

  connectToDAPI() {
    this.main.api.on('ready', (event) => {
      this.main.mentionRegex = new RegExp(`^<@!?${this.main.api.user.id}>`);
      this.main.initialized = true;

      this.main.watchdog.start();

      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} now` : 'Now'} live in ${this.main.api.channels.size} channels on ${this.main.api.guilds.size} servers for a total of ${this.main.api.users.size} users.`);
    });

    this.main.api.on('disconnect', (event) => {
      winston.warn(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} disconnected` : 'Disconnected'} from Discord API! Code:`, event.code);
    });

    this.main.api.on('reconnecting', () => {
      winston.warn(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} lost` : 'Lost'} connection to Discord API! Reconnecting...`);
    });

    this.main.api.on('resumed', (replayed) => {
      winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} resumed` : 'Resumed'} connection to Discord API. Replayed ${replayed} events.`);
    });

    this.main.api.on('error', e => winston.error(e));
    this.main.api.on('warn', e => winston.warn(e));
    // this.main.api.on('debug', e => winston.debug(e));

    winston.info(`${(this.main.api.shard) ? `Shard ${this.main.api.shard.id} startup` : 'Startup'} completed. Connecting to Discord API...`);
    this.main.api.login(nconf.get('bot:token'))
      .catch((err) => {
        winston.error('Unable to connect to Discord API!', err);
        this.main.shutdown(1);
      });
  }

  async startShard() {
    if (this.main.api.shard) {
      winston.info(`Shard ${this.main.api.shard.id} starting up...`);
    }

    process.title = `MCLBOT${(this.main.api.shard) ? ` - shard ${this.main.api.shard.id}` : ''}`;

    await this.initSQL();
    await this.initRedis();
    await this.initInflux();

    this.initModules();

    this.connectToDAPI();
  }
}

module.exports = Init;
