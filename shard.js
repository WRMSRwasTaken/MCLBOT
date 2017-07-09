const nconf = require('nconf');
const dotenv = require('dotenv');

dotenv.config();

nconf.use('memory');
nconf.argv().env('.');

global.env = process.env.NODE_ENV || 'production';

const winston = require('winston');
const pkg = require('./package.json');

const loglevel = nconf.get('loglevel') || (global.env === 'production' ? 'info' : 'debug');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: loglevel,
  json: false,
  colorize: true,
  debugStdout: true,
  timestamp: true,
});

const Discord = require('discord.js');

const shardManager = new Discord.ShardingManager('app.js', {
  token: nconf.get('bot:token'),
});

shardManager.on('launch', (shard) => {
  winston.info('Launched shard:', shard.id);
});

shardManager.spawn();

