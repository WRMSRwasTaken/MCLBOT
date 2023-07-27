module.exports = {
  description: 'prints information about a channel',
  alias: ['channelinfo', 'c'],
  guildOnly: true,
  arguments: [
    {
      label: 'channel',
      type: 'channel',
      optional: true,
    },
  ],
  fn: async (ctx, channel) => {
    const embed = new ctx.main.Discord.MessageEmbed();

    embed.author = {
      name: channel.name,
    };

    embed.addField('ID', channel.id, true);

    embed.addField('Members', channel.members.size, true);

    embed.addField('nsfw', (channel.nsfw) ? 'yes' : 'no', true);

    if (channel.topic) {
      embed.addField('Topic', channel.topic);
    }

    if (channel.lastMessageID && channel.id !== ctx.channel.id) {
      const message = channel.messages.get(channel.lastMessageID);

      if (message) {
        embed.addField('Last messageCreate', ctx.main.stringUtils.formatUnixTimestamp(message.createdTimestamp));
      }
    }

    embed.addField('Created', ctx.main.stringUtils.formatUnixTimestamp(channel.createdTimestamp));

    ctx.reply({
      embed,
    });
  },
};
