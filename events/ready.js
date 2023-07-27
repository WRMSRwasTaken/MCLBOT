const winston = require('winston');
const nconf = require('nconf');
const XRegExp = require('xregexp');
const prettyMs = require('pretty-ms');

module.exports = {
  fn: async (main) => {
    main.onlineTime = Date.now();
    main.ready = true;

    if (!main.firstReady) {
      main.firstReady = true;

      if (!main.api.user.bot) {
        winston.error('The token provided is not a bot token! Exiting.');

        main.shutdown(1);

        return;
      }

      main.mentionRegex = XRegExp(`^<@!?${main.api.user.id}>`);

      await main.channelLogHelper.checkLogChannel();

      main.resourceLoader.startTasks();

      winston.info(`Ready event has been fired after ${prettyMs(Date.now() - main.preConnectTime)}. Now live in ${main.api.channels.size} channels on ${main.api.guilds.size} servers.`);
    } else {
      winston.warn('It looks like the previous session was invalidated. This could mean that Discord is / was having an outage / problems again.');

      winston.info(`Resumed connection to Discord API after ${prettyMs(Date.now() - main.preConnectTime)}. Could not replay events due to session invalidation.`);
    }

    main.channelLogHelper.sendLogMessage('ready', {
      readyDuration: Date.now() - main.preConnectTime,
    });
  },
};
