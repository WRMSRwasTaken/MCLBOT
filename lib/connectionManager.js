const winston = require('winston');
const nconf = require('nconf');
const XRegExp = require('xregexp');
const prettyMs = require('pretty-ms');

class ConnectionManager {
  constructor(main) {
    this.main = main;

    main.api.on('ready', this.onReady.bind(this));
    main.api.on('shardDisconnected', this.onShardDisconnected.bind(this));
    main.api.on('shardReconnecting', this.onShardReconnecting.bind(this));
    main.api.on('shardResumed', this.onShardResumed.bind(this));

    this.firstReady = false;
    this.preConnectTime = false;
  }

  async onReady() {
    this.main.onlineTime = Date.now();
    this.main.ready = true;

    if (!this.firstReady) {
      this.firstReady = true;

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

      this.main.mentionRegex = XRegExp(`^<@!?${this.main.api.user.id}>`);

      winston.debug('Starting job queue processing...');

      await this.main.jobQueue.resume(true);

      await this.main.channelLogHelper.checkLogChannel();

      this.main.resourceLoader.startTasks();

      winston.info(`Ready event has been fired after ${prettyMs(Date.now() - this.preConnectTime)}. Now live in ${this.main.api.channels.size} channels on ${this.main.api.guilds.size} servers.`);
    } else {
      winston.warn('It looks like the previous session was invalidated. This could mean that Discord is / was having an outage / problems again.');

      winston.info(`Resumed connection to Discord API after ${prettyMs(Date.now() - this.preConnectTime)}. Could not replay events due to session invalidation.`);
    }

    this.main.channelLogHelper.sendLogMessage('ready', {
      readyDuration: Date.now() - this.preConnectTime,
    });
  }

  async onShardDisconnected(event) {
    if (this.main.isShuttingDown) {
      return;
    }

    this.main.channelLogHelper.sendLogMessage('disconnect', {
      event,
    });

    this.main.ready = false;
    winston.error('Disconnected from Discord API! Code: %d. Exiting...', event.code);

    this.main.shutdown(1);
  }

  async onShardReconnecting() {
    this.preConnectTime = Date.now();

    if (!this.main.ready) {
      return;
    }

    this.main.ready = false;

    this.main.channelLogHelper.sendLogMessage('reconnecting');

    winston.warn('Lost connection to Discord API! Reconnecting...');
  }

  async onShardResumed(replayed) {
    if (!this.firstReady) {
      winston.error('Resumed event has been fired although there was no ready event before! Exiting...'); // yes this already happened when MCLBOT tried to log in while Discord had problems

      return this.main.shutdown(1);
    }

    this.main.ready = true;
    this.main.onlineTime = Date.now();

    winston.info(`Resumed connection to Discord API after ${prettyMs(Date.now() - this.preConnectTime)}. Replayed ${replayed} event(s).`);

    return this.main.channelLogHelper.sendLogMessage('resumed', {
      replayed,
      reconnectDuration: Date.now() - this.preConnectTime,
    });
  }

  async connectToDiscord() {
    this.preConnectTime = Date.now();

    try {
      await this.main.api.login(nconf.get('bot:token'));
    } catch (ex) {
      winston.error('Unable to connect to Discord API! %s. Exiting...', ex.message);

      this.main.shutdown(1);
    }
  }
}

module.exports = ConnectionManager;
