/*
         ____     __       ____     _____   ______
 /'\_/`\/\  _`\  /\ \     /\  _`\  /\  __`\/\__  _\
/\      \ \ \/\_\\ \ \    \ \ \ \ \\ \ \/\ \/_/\ \/
\ \ \__\ \ \ \/_/_\ \ \  __\ \  _ <'\ \ \ \ \ \ \ \
 \ \ \_/\ \ \ \ \ \\ \ \ \ \\ \ \ \ \\ \ \_\ \ \ \ \
  \ \_\\ \_\ \____/ \ \____/ \ \____/ \ \_____\ \ \_\
   \/_/ \/_/\/___/   \/___/   \/___/   \/_____/  \/_/

 */

import nconf from 'nconf';
import winston from 'winston';
import Discord from 'discord.js';
import childProcess from 'child_process';
import fs from 'fs-extra';
import { Redis} from 'ioredis'
import postgres from 'postgres';
import prettyMs from 'pretty-ms';

import {MCLBOTMain} from './definitions.js';

import AudioHelper from "./lib/audioHelper.js";
import BlacklistHelper from "./lib/blacklistHelper.js";
import CacheManager from "./lib/cacheManager.js";
import CooldownHelper from "./lib/cooldownHelper.js";
import CommandHandler from "./lib/commandHandler.js";
import GuildSettingsManager from "./lib/guildSettingsManager.js";
import PrefixHelper from "./lib/prefixHelper.js";

class MCLBOT {
  private main = {} as MCLBOTMain;
  async start(): Promise<void> {
    await this.loadAndCheckSettings();

    this.initBase();

    await this.loadModules();

    await this.initDB();

    await this.initializeModules();

    winston.info(`Startup completed in ${prettyMs(Date.now() - this.main.processStartTime)}. Connecting to Discord API...`);

    this.main.preConnectTime = Date.now();

    try {
      await this.main.api.login(nconf.get('bot:token'));
    } catch (ex) {
      winston.error('Unable to connect to Discord API! %s. Exiting...', ex.message);

      this.shutdown(1);
    }
  }

  async loadAndCheckSettings(): Promise<void> {
    try {
      await import('./settings.js');
    } catch (ex) {
      console.error('There was an error loading the settings file: %s Exiting.', ex.message);
      process.exit(1);
    }

    if (!nconf.get('bot:token')) {
      console.error('No token has been specified, this application can not function without it! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:prefix')) {
      console.error('No bot prefix has been specified, refusing to start without a default prefix set! Exiting.');
      process.exit(1);
    }

    if (!nconf.get('bot:owner')) {
      console.warn('No bot owner has been specified! Admin commands will be unavailable!');
    }
  }

  initBase(): void {
    winston.add(new winston.transports.Console({
      level: nconf.get('log:level'),
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.splat(),
        winston.format.simple(),
      ),
    }));

    process.on('SIGTERM', this.shutdown);
    process.on('SIGINT', this.shutdown);

    this.main.shutdown = this.shutdown;

    process.on('uncaughtException', (err) => {
      winston.error('Uncaught exception: %s', err.message);
    });

    process.on('unhandledRejection', (reason) => {
      winston.error('Uncaught promise Error: %s', reason);
    });

    this.main.ready = false;
    this.main.firstReady = false;

    try {
      this.main.version = childProcess.execSync('git rev-parse --short HEAD').toString().trim();
      this.main.longVersion = childProcess.execSync('git rev-parse HEAD').toString().trim();
      this.main.dirty = !!childProcess.execSync('git status -s').toString();
    } catch (ex) {
      this.main.version = 'N/A';
      this.main.longVersion = 'N/A';
      this.main.dirty = false;
    }

    this.main.Discord = Discord;

    this.main.api = new Discord.Client({
      intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildModeration,
        Discord.GatewayIntentBits.GuildBans,
        Discord.GatewayIntentBits.GuildEmojisAndStickers,
        Discord.GatewayIntentBits.GuildIntegrations,
        Discord.GatewayIntentBits.GuildWebhooks,
        Discord.GatewayIntentBits.GuildInvites,
        Discord.GatewayIntentBits.GuildVoiceStates,
        Discord.GatewayIntentBits.GuildPresences,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildMessageReactions,
        Discord.GatewayIntentBits.GuildMessageTyping,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.DirectMessageReactions,
        Discord.GatewayIntentBits.DirectMessageTyping,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.GuildScheduledEvents,
      ],
      messageCacheLifetime: 15 * 60,
      messageSweepInterval: 5 * 60,
      fetchAllMembers: false,
      disableEveryone: false,
      shards: nconf.get('bot:shard') ? parseInt(nconf.get('bot:shard'), 10) : undefined,
      shardCount: nconf.get('bot:shardcount') ? parseInt(nconf.get('bot:shardcount'), 10) : undefined,
    });

    // main.api.main = main; // we need that circular reference in order to access the "main" object later

    // this.main.api.on('shardError', (e) => winston.error(`[discord.js] ${e.message}`));
    // main.api.on('warn', (e) => winston.warn(`[discord.js] ${e.message}`));
    // main.api.on('rateLimit', (rateLimitInfo) => winston.warn(`Ratelimit: ${rateLimitInfo.method} ${rateLimitInfo.path} ${rateLimitInfo.limit}`));
    //
    // if (nconf.get('log:apiDebug') === 'true') {
    //   main.api.on('debug', (debug) => winston.debug(debug));
    // }

    // if (!main.api.shard && nconf.get('bot:shards') && nconf.get('bot:shards') !== 'false') {
    //   main.shardMaster = true;
    // }

    winston.info('         _____    __       _____    _____   ______');
    winston.info(' /\'\\_/`\\/\\  __`\\ /\\ \\     /\\  __`\\ /\\  __`\\/\\__  _\\');
    winston.info('/\\      \\ \\ \\/\\_\\\\ \\ \\    \\ \\ \\ \\ \\\\ \\ \\/\\ \\/_/\\ \\/');
    winston.info('\\ \\ \\__\\ \\ \\ \\/_/_\\ \\ \\  __\\ \\  _ <\'\\ \\ \\ \\ \\ \\ \\ \\');
    winston.info(' \\ \\ \\_/\\ \\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\ \\ \\\\ \\ \\_\\ \\ \\ \\ \\');
    winston.info('  \\ \\_\\\\ \\_\\ \\____/ \\ \\____/ \\ \\____/ \\ \\_____\\ \\ \\_\\');
    winston.info('   \\/_/ \\/_/\\/___/   \\/___/   \\/___/   \\/_____/  \\/_/');
    winston.info('');
    winston.info(`This is MCLBOT starting on git commit ${(this.main.version) ? this.main.version : 'N/A'}${(this.main.dirty) ? ' (dirty)' : ''}`);
    winston.info('');
    winston.info(`loglevel: ${nconf.get('log:level')} ${(nconf.get('log:level') === 'debug') ? `{ apiDebug: ${nconf.get('log:apiDebug')} - sqlDebug: ${nconf.get('log:sqlDebug')} }` : ''}`);

    process.title = 'MCLBOT';
  }

  async initDB() {
    winston.debug('Initializing PostgreSQL...');

    this.main.pg = postgres({
      host: nconf.get('database:host'),
      port: nconf.get('database:port'),
      database: nconf.get('database:database'),
      username: nconf.get('database:username'),
      password: nconf.get('database:password'),
      prepare: false, // needed for pgbouncer transaction pooling mode
      connection: {
        application_name: 'MCLBOT',
      },
      max: parseInt(nconf.get('database:maxPoolConnections'), 10),
      debug: (_, query) => {
        if (nconf.get('log:sqlDebug') === 'true') {
          winston.debug(query);
        }
      },
    });

    winston.debug('Initializing Redis...');

    // let sentinels;
    //
    // if (nconf.get('redis:sentinel:addresses')) {
    //   sentinels = [];
    //
    //   for (const sentinelNode of nconf.get('redis:sentinel:addresses').split(',')) {
    //     const sentinelNodeData = sentinelNode.split(':');
    //
    //     sentinels.push({
    //       host: sentinelNodeData[0],
    //       port: sentinelNodeData[1] || 26379,
    //     });
    //   }
    // }
    //
    // main.redisSentinels = sentinels;

    this.main.redis = new Redis({
      host: nconf.get('redis:host'),
      port: nconf.get('redis:port'),
      password: nconf.get('redis:password'),
      db: nconf.get('redis:database'),
      keyPrefix: nconf.get('redis:prefix'),
      enableOfflineQueue: false,
      lazyConnect: true, // for connecting manually to get a promise resolve on successful connection
      name: nconf.get('redis:sentinel:name'),
      retryStrategy() {
        return 5000;
      },
    });

    this.main.redis.on('connect', () => {
      winston.debug('Connected to Redis backend.');
    });

    this.main.redis.on('ready', () => {
      winston.info('Redis ready.');
    });

    this.main.redis.on('close', () => {
      winston.warn('Disconnected from Redis.');
    });

    this.main.redis.on('error', (e) => winston.error(`[ioredis] ${e}`));

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

  async loadModules(): Promise<void> {
    winston.debug('Loading bot modules...');

    this.main.modules.audioHelper = new AudioHelper();
    this.main.modules.blacklistHelper = new BlacklistHelper(this.main);
    this.main.modules.cacheManager = new CacheManager(this.main);
    this.main.modules.cooldownHelper = new CooldownHelper(this.main);
    this.main.modules.commandHandler = new CommandHandler(this.main);
    this.main.modules.prefixHelper = new PrefixHelper(this.main);
    this.main.modules.guildSettingsManager = new GuildSettingsManager(this.main);

    // const modulesDir = await fs.readdir('./lib');
    //
    // for (const module of modulesDir) {
    //   if (module.slice(-3) === '.js') {
    //     const moduleName = module.substring(0, module.lastIndexOf('.'));
    //
    //     try {
    //       const newModule = await import(`./lib/${module}`);
    //       this.main.modules[moduleName] = new newModule.default(this.main)
    //
    //       winston.debug('Bot module loaded: %s', newModule.default.name());
    //     } catch (ex) {
    //       winston.error(`Error loading module ${moduleName}: ${ex.message}`);
    //       process.exit(1);
    //     }
    //   }
    // }
  }

  async initializeModules(): Promise<void> {
    for (const [moduleName, module] of Object.entries(this.main)) {
      if (module && typeof module.initializeModule === 'function') {
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

  async shutdown(code = 0) {
    MCLBOTMain.isShuttingDown = true;

    winston.info('Application shutdown requested.');

    setTimeout(() => {
      winston.warn('Shutdown timeout after 60 seconds. Going to exit the hard way.');

      process.exit(1337);
    }, 60000);

    try {
      winston.debug('Stopping tasks...');

      for (const taskName of Object.keys(MCLBOTMain.runningTasks)) {
        clearInterval(MCLBOTMain.runningTasks[taskName]);
      }

      if (MCLBOTMain.ready) {
        winston.debug('Disconnecting from Discord API...');

        MCLBOTMain.api.destroy();

        await Bluebird.delay(2000);
      }

      if (MCLBOTMain.redis) {
        winston.debug('Disconnecting from Redis backend...');
        await MCLBOTMain.redis.disconnect();
      }

      if (MCLBOTMain.db) {
        winston.debug('Closing database ORM...');
      }
    } catch (ex) {
      winston.warn('Unclean shutdown detected! %s', ex.message);
      process.exit(code || 1);
      return;
    }

    winston.info('Shutdown complete. Exiting.');
    process.exit(0);
  }
}

new MCLBOT().start();
