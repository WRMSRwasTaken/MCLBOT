const nconf = require('nconf');
const dotenv = require('dotenv');

dotenv.config();

nconf.use('memory');
nconf.argv().env('.');

global.env = process.env.NODE_ENV || 'production';

const winston = require('winston');
const winstonCommon = require('winston/lib/winston/common');
const pkg = require('./package.json');

nconf.set('loglevel', nconf.get('loglevel') || (global.env === 'production' ? 'info' : 'debug'));

// winston.transports.Console.prototype.log = function (level, message, meta, callback) {
//   const output = winstonCommon.log(Object.assign({}, this, {
//     level,
//     message,
//     meta,
//   }));
//
//   console[level in console ? level : 'log'](output);
//
//   setImmediate(callback, null, true);
// };

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: nconf.get('loglevel'),
  json: false,
  colorize: true,
  debugStdout: true,
  timestamp: true,
});

nconf.defaults({
  bot: {
    prefix: 'm!',
    shard: 'no',
  },
  prometheus: {
    port: '9400',
  },
  webserver: {
    listen: 8080,
    listenUmask: '666a',
  },
  database: {
    username: 'mclbot',
    // password: null,
    database: 'mclbot',
    host: '127.0.0.1',
    port: 3306,
    dialect: 'mysql',
  },
  redis: {
    // password: null,
    database: 0,
    host: '127.0.0.1',
    port: 6379,
    prefix: 'mclbot:',
  },
});

const main = {};

main.startTime = Date.now();

main.initialized = false;

const Discord = require('discord.js');

main.Discord = Discord;

main.api = new Discord.Client({
  messageCacheLifetime: 15 * 60,
  messageSweepInterval: 5 * 60,
  fetchAllMembers: false,
  disableEveryone: false,
});

if (main.api.shard && main.api.shard.count === 0) {
  main.api.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
}

if (!main.api.shard) {
  winston.info(' __  __  _____ _      ____   ____ _______');
  winston.info('|  \\/  |/ ____| |    |  _ \\ / __ \\__   __|');
  winston.info('| \\  / | |    | |    | |_) | |  | | | |');
  winston.info('| |\\/| | |    | |    |  _ <| |  | | | |');
  winston.info('| |  | | |____| |____| |_) | |__| | | |');
  winston.info('|_|  |_|\\_____|______|____/ \\____/  |_|');
  winston.info(`    --- main v${pkg.version} - api v${main.Discord.version} ---`);
  winston.info('');
  winston.info(`env: ${global.env}, loglevel: ${nconf.get('loglevel')}`);
}

const fs = require('fs');

if (!fs.existsSync('.env') && !main.api.shard) {
  winston.warn('No .env file found in current working directory root! Application is starting with default settings.');
}

if (!nconf.get('bot:token')) {
  winston.error('No token has been specified, this application can not function without it! Exiting.');
  process.exit(1);
}

if (!nconf.get('bot:owner') && !main.api.shard) {
  main.owner = [];
  winston.warn('No bot owner(s) has/have been specified! Admin commands will be unavailable!');
} else {
  main.owner = nconf.get('bot:owner').split(',');
}

if (!main.api.shard && nconf.get('bot:shard') === 'auto') {
  main.shardMaster = true;
}

function readyEvent(event) {
  main.mentionRegex = new RegExp(`^<@!?${main.api.user.id}>`);
  main.initialized = true;

  main.watchdog.start();

  winston.info(`${(main.api.shard) ? `Shard ${main.api.shard.id} now` : 'Now'} live in ${main.api.channels.size} channels on ${main.api.guilds.size} servers for a total of ${main.api.users.size} users.`);
}

function disconnectEvent(event) {
  winston.warn(`${(main.api.shard) ? `Shard ${main.api.shard.id} disconnected` : 'Disconnected'} from Discord API! Code:`, event.code);

  // if (event.code === 1000) { // CLOSE_NORMAL
  //   // In this case, Discord.js doesn't do auto reconnect so we need to reconnect for ourselves
  //   // That happens when the bot was online for too long
  //   // and nginx keepalive_requests were exhausted on discord's / cloudflare's side
  //
  //   winston.info('Reconnecting manually in 5 seconds...');
  //
  //   setTimeout(() => {
  //     main.api.login(nconf.get('bot:token'))
  //       .then(() => winston.info('Reconnected manually to Discord API.'))
  //       .catch((err) => {
  //         winston.error('Unable to connect to Discord API!', err);
  //         main.exit(1);
  //       });
  //   }, 5000);
  // }
}

if (!main.api.shard && !main.shardMaster) {
  winston.info('Bot is starting in standalone mode.');
}

if (main.shardMaster) {
  winston.info('Bot is starting in shard mode.');

  process.title = 'MCLBOT - shard master';

  const shardManager = new Discord.ShardingManager('bot.js', {
    token: nconf.get('bot:token'),
  });

  shardManager.on('launch', (shard) => {
    winston.debug('Launching shard:', shard.id);
  });

  shardManager.spawn();
} else {
  if (main.api.shard) {
    winston.info(`Shard ${main.api.shard.id} starting up...`);
  }

  process.title = `MCLBOT${(main.api.shard) ? ` - shard ${main.api.shard.id}` : ''}`;

  winston.debug('Initializing database ORM...');
  main.db = require('./models/index.js');

  winston.debug('Connecting to Redis...');

  const Redis = require('ioredis');

  main.redis = new Redis({
    host: nconf.get('redis:host'),
    port: nconf.get('redis:port'),
    password: nconf.get('redis:password'),
    db: nconf.get('redis:database'),
    keyPrefix: nconf.get('redis:prefix'),
    retryStrategy(times) {
      return 5000;
    },
  });

  main.redis.on('ready', (event) => {
    winston.debug(`${(main.api.shard) ? `Shard ${main.api.shard.id} connected` : 'Connected'} to Redis backend.`);
  });

  main.redis.on('close', (event) => {
    winston.warn(`${(main.api.shard) ? `Shard ${main.api.shard.id} lost` : 'Lost'} connection to Redis backend! Reconnecting in 5 seconds...`);
  });

  winston.debug('Initializing modules...');

  const PrometheusExporter = require('./lib/prometheusExporter.js');

  main.prometheusExporter = new PrometheusExporter(main);
  main.prometheusExporter.init();

  const Webserver = require('./lib/webserver.js');

  main.webserver = new Webserver(main);
  main.webserver.init();

  const Watchdog = require('./lib/watchdog.js');

  main.watchdog = new Watchdog(main);

  const StringUtils = require('./lib/stringUtils.js');

  main.stringUtils = new StringUtils(main);

  const UserHelper = require('./lib/userHelper.js');

  main.userHelper = new UserHelper(main);

  const PrefixHelper = require('./lib/prefixHelper.js');

  main.prefixHelper = new PrefixHelper(main);

  const BlacklistHelper = require('./lib/blacklistHelper.js');

  main.blacklistHelper = new BlacklistHelper(main);

  const ImageHelper = require('./lib/imageHelper.js');

  main.imageHelper = new ImageHelper(main);

  const AudioHelper = require('./lib/audioHelper.js');

  main.audioHelper = new AudioHelper(main);

  const PaginationHelper = require('./lib/paginationHelper.js');

  main.paginationHelper = new PaginationHelper(main);

  const CommandHandler = require('./lib/commandHandler.js');

  main.commandHandler = new CommandHandler(main);

  const ResourceLoader = require('./lib/resourceLoader.js');

  main.resourceLoader = new ResourceLoader(main);

  winston.debug('Loading bot resources...');
  main.resourceLoader.loadCommandFiles();
  main.resourceLoader.loadEventFiles();
  // main.resourceLoader.loadTaskFiles();
  main.resourceLoader.generateHelpPages();

  main.api.on('ready', readyEvent);
  main.api.on('disconnect', disconnectEvent);
  main.api.on('reconnecting', () => {
    winston.warn(`${(main.api.shard) ? `Shard ${main.api.shard.id} lost` : 'Lost'} connection to Discord API! Reconnecting...`);
  });
  main.api.on('resume', (replayed) => {
    winston.info(`${(main.api.shard) ? `Shard ${main.api.shard.id} resumed` : 'Resumed'} connection to Discord API. Replayed ${replayed} events.`);
  });

  main.api.on('error', e => winston.error(e));
  main.api.on('warn', e => winston.warn(e));
  // main.api.on('debug', e => winston.debug(e));

  winston.info(`${(main.api.shard) ? `Shard ${main.api.shard.id} startup` : 'Startup'} completed. Connecting to Discord API...`);
  main.api.login(nconf.get('bot:token'))
    .catch((err) => {
      winston.error('Unable to connect to Discord API!', err);
      main.shutdown(1);
    });
}

process.on('uncaughtException', (err) => {
  const errorMsg = err.stack.replace(new RegExp(`${__dirname}\/`, 'g'), './');
  winston.error(`${(main.api.shard) ? `Shard ${main.api.shard.id} uncaught` : 'Uncaught'} exception`, errorMsg);
});

process.on('unhandledRejection', (err) => {
  winston.error(`${(main.api.shard) ? `Shard ${main.api.shard.id} uncaught` : 'Uncaught'} promise Error`, err);
});

main.shutdown = function (code) {
  winston.info('Application shutdown requested.');
  main.webserver.exit();

  winston.info('Shutdown complete. Exiting.');
  process.exit(code || 0);
};

process.on('SIGTERM', main.shutdown);
process.on('SIGINT', main.shutdown);
