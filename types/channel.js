const XRegExp = require('xregexp');
const winston = require('winston');

const channelRegex = XRegExp('^(<#)?(?<channelID>\\d+)>?$');

module.exports = {
  parse: (value, argument, context) => {
    winston.debug('Trying to get a channel from supplied string: %s', value);

    const channelResult = XRegExp.exec(value, channelRegex);

    if (channelResult) { // channel mention or raw channel id
      winston.debug('Is mention or channel id! Getting channel from guild channel list...');

      const mentionedChannel = context.guild.channels.get(channelResult.channelID);

      if (mentionedChannel) {
        return mentionedChannel;
      }

      winston.debug('Channel mention or channel id could not be found in the current guild!');
      throw new Error('Unknown channel supplied');
    }

    winston.debug('Not a channel mention or channel id! Searching guild text channel list...');

    const channelMatches = context.guild.channels
      .filter(channel => channel.type === 'text' && channel.name.toUpperCase().includes(value.toUpperCase()));

    winston.debug('Text channels found: %d', channelMatches.size);

    if (channelMatches.size === 1) {
      return channelMatches.first();
    }

    if (channelMatches.size === 0) {
      throw new Error('No channels have been found');
    }

    throw new Error('Multiple channels have been found, please be more specific');
  },

  default: context => context.channel,
};
