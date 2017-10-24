const channelRegex = new RegExp('^(?:<#)?([0-9]+)>?$');

module.exports = {
  parse: (value, argument, context) => {
    const channelRegexExec = channelRegex.exec(value);

    if (channelRegexExec) {
      const mentionedChannel = context.guild.channels.get(channelRegexExec[1]);
      if (mentionedChannel) {
        return mentionedChannel;
      }
      throw new Error('Unknown channel supplied.');
    }

    const channelMatches = context.guild.channels.filter((channel) => {
      if (channel.name.toLowerCase().includes(value.toLowerCase())) {
        return true;
      }

      return false;
    });

    if (channelMatches.length === 1) {
      return channelMatches[0];
    }

    if (channelMatches.length === 0) {
      throw new Error('No channels have been found.');
    }

    throw new Error('Multiple channels have been found Please be more specific.');
  },
};
