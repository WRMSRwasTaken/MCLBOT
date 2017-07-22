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

const Discord = require('discord.js');

const bot = new Discord.Client({
  autoReconnect: true,
  messageCacheLifetime: 15 * 60,
  messageSweepInterval: 5 * 60,
  fetchAllMembers: true,
  disableEveryone: true,
});

if (bot.shard && bot.shard.count === 0) {
  bot.shard = undefined; // PM2 fork mode gets recognized as shard id 0 with total shard count of 0
}

if (!bot.shard) {
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

winston.info(`${(bot.shard) ? `Shard ID: ${bot.shard.id} of total: ${bot.shard.count} starting` : 'Starting'} up - env: ${global.env}, loglevel: ${nconf.get('loglevel')}`);

process.title = 'MCLBOT';

nconf.defaults({
  bot: {
    prefix: '!',
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

main.bot = bot;
main.Discord = Discord;

main.startTime = Date.now();

if (!nconf.get('bot:owner')) {
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
});

main.redis.on('ready', (event) => {
  winston.info('Connected to Redis backend.');
});

main.redis.on('close', (event) => {
  winston.warn('Connection to Redis backend lost! Reconnecting in 5 seconds...');
});

const Utils = require('./lib/utils.js');

main.utils = new Utils(main);

const PrefixHelper = require('./lib/prefixHelper.js');

main.prefixHelper = new PrefixHelper(main);

const ResourceLoader = require('./lib/resourceLoader.js');

main.resourceLoader = new ResourceLoader(main);

main.resourceLoader.loadCommandFiles();
main.resourceLoader.loadEventFiles();

const CommandHandler = require('./lib/commandHandler.js');

main.commandHandler = new CommandHandler(main);

function readyEvent(event) {
  main.mentionRegex = new RegExp(`^<@!?${main.bot.user.id}> `);

  winston.info(`Connected to Discord API: ${(bot.shard) ? `Shard ID: ${bot.shard.id} of total: ${bot.shard.count} now` : 'Now'} live in ${bot.channels.size} channels on ${bot.guilds.size} servers for a total of ${bot.users.size} users. My ID is: ${bot.user.id} - ready for commands!`);
}

function disconnectEvent(event) {
  winston.warn('Disconnected from Discord API! Code:', event.code);

  if (event.code === 1000) { // CLOSE_NORMAL
    // In this case, Discord.js doesn't do auto reconnect so we need to reconnect for ourselves
    // That happens when the bot was online for too long
    // and nginx keepalive_requests were exhausted on discord's / cloudflare's side

    winston.info('Reconnecting manually in 5 seconds...');

    setTimeout(() => {
      bot.login(nconf.get('bot:token'))
        .then(() => winston.info('Reconnected manually to Discord API.'))
        .catch((err) => {
          winston.error('Unable to connect to Discord API!', err);
          process.exit(1);
        });
    }, 5000);
  }
}

bot.on('ready', readyEvent);
bot.on('disconnect', disconnectEvent);

bot.on('error', e => winston.error(e));
bot.on('warn', e => winston.warn(e));

bot.login(nconf.get('bot:token'))
  .catch((err) => {
    winston.error('Unable to connect to Discord API!', err);
    process.exit(1);
  });

process.on('uncaughtException', (err) => {
  const errorMsg = err.stack.replace(new RegExp(`${__dirname}\/`, 'g'), './');
  winston.error('Uncaught Exception', bot.user, errorMsg);
});

process.on('unhandledRejection', (err) => {
  winston.error('Uncaught Promise Error', bot.user, err);
});
