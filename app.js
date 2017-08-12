const nconf = require('nconf');
const dotenv = require('dotenv');

dotenv.config();

nconf.use('memory');
nconf.argv().env('.');

global.env = process.env.NODE_ENV || 'production';

const winston = require('winston');
const pkg = require('./package.json');

nconf.set('loglevel', nconf.get('loglevel') || (global.env === 'production' ? 'info' : 'debug'));

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: nconf.get('loglevel'),
  json: false,
  colorize: true,
  debugStdout: true,
  timestamp: true,
});

const main = {};

const Discord = require('discord.js');

main.api = new Discord.Client({
  messageCacheLifetime: 15 * 60,
  messageSweepInterval: 5 * 60,
  fetchAllMembers: true,
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
  winston.info(`            --- v${pkg.version} ---`);
  winston.info('');
}

const fs = require('fs');

if (!fs.existsSync('.env')) {
  winston.warn('No .env file found in current working directory root! Application is starting with default settings.');
}

if (!nconf.get('bot:token')) {
  winston.error('No token has been specified, this application can not function without it! Exiting.');
  process.exit(1);
}

winston.info(`${(main.api.shard) ? `Shard ID: ${main.api.shard.id} of total: ${main.api.shard.count} starting` : 'Starting'} up - env: ${global.env}, loglevel: ${nconf.get('loglevel')}`);

process.title = 'MCLBOT';

nconf.defaults({
  bot: {
    prefix: 'm!',
  },
  prometheus: {
    port: '9400',
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

main.initialized = false;

main.Discord = Discord;

main.startTime = Date.now();

if (!nconf.get('bot:owner')) {
  main.owner = [];
  winston.warn('No bot owner(s) has/have been specified! Admin commands will be unavailable!');
} else {
  main.owner = nconf.get('bot:owner').split(',');
}

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
  stringNumbers: false,
});

main.redis.on('ready', (event) => {
  winston.info(`${(main.api.shard) ? `Shard ID: ${main.api.shard.id} connected` : 'Connected'} to Redis backend.`);
});

main.redis.on('close', (event) => {
  winston.warn(`${(main.api.shard) ? `Shard ID: ${main.api.shard.id} lost ` : 'Lost'} connection to Redis backend! Reconnecting in 5 seconds...`);
});

winston.debug('Initializing modules...');

const PrometheusExporter = require('./lib/prometheusExporter.js');

main.prometheusExporter = new PrometheusExporter(main);
main.prometheusExporter.init();

const Watchdog = require('./lib/watchdog.js');

main.watchdog = new Watchdog(main);

const Utils = require('./lib/utils.js');

main.utils = new Utils(main);

const UserHelper = require('./lib/userHelper.js');

main.userHelper = new UserHelper(main);

const PrefixHelper = require('./lib/prefixHelper.js');

main.prefixHelper = new PrefixHelper(main);

const BlacklistHelper = require('./lib/blacklistHelper.js');

main.blacklistHelper = new BlacklistHelper(main);

const ImageHelper = require('./lib/imageHelper.js');

main.imageHelper = new ImageHelper(main);

const PaginationHelper = require('./lib/paginationHelper.js');

main.paginationHelper = new PaginationHelper(main);

const CommandHandler = require('./lib/commandHandler.js');

main.commandHandler = new CommandHandler(main);

const ResourceLoader = require('./lib/resourceLoader.js');

main.resourceLoader = new ResourceLoader(main);

winston.debug('Loading bot resources...');
main.resourceLoader.loadCommandFiles();
main.resourceLoader.loadEventFiles();
main.resourceLoader.loadTaskFiles();

function readyEvent(event) {
  main.mentionRegex = new RegExp(`^<@!?${main.api.user.id}>`);
  main.initialized = true;

  main.watchdog.start();

  winston.info(`Connected to Discord API: ${(main.api.shard) ? `Shard ID: ${main.api.shard.id} of total: ${main.api.shard.count} now` : 'Now'} live in ${main.api.channels.size} channels on ${main.api.guilds.size} servers for a total of ${main.api.users.size} users. My ID is: ${main.api.user.id} - ready for commands!`);
}

function disconnectEvent(event) {
  winston.warn('Disconnected from Discord API! Code:', event.code);

  if (event.code === 1000) { // CLOSE_NORMAL
    // In this case, Discord.js doesn't do auto reconnect so we need to reconnect for ourselves
    // That happens when the bot was online for too long
    // and nginx keepalive_requests were exhausted on discord's / cloudflare's side

    winston.info('Reconnecting manually in 5 seconds...');

    setTimeout(() => {
      main.api.login(nconf.get('bot:token'))
        .then(() => winston.info('Reconnected manually to Discord API.'))
        .catch((err) => {
          winston.error('Unable to connect to Discord API!', err);
          process.exit(1);
        });
    }, 5000);
  }
}

main.api.on('ready', readyEvent);
main.api.on('disconnect', disconnectEvent);
main.api.on('reconnecting', () => {
  winston.info('Reconnecting to Discord API...');
});

main.api.on('error', e => winston.error(e));
main.api.on('warn', e => winston.warn(e));
main.api.on('debug', e => winston.debug(e));

winston.info('Connecting to the Discord API...');
main.api.login(nconf.get('bot:token'))
  .catch((err) => {
    winston.error('Unable to connect to Discord API!', err);
    process.exit(1);
  });

process.on('uncaughtException', (err) => {
  const errorMsg = err.stack.replace(new RegExp(`${__dirname}\/`, 'g'), './');
  winston.error('Uncaught Exception', main.api.user, errorMsg);
});

process.on('unhandledRejection', (err) => {
  winston.error('Uncaught Promise Error', main.api.user, err);
});
