const commands = {};

commands.say = {
  name: 'say',
  desc: 'says something in the current channel',
  args: ['text'],
  fn: (message, param) => {
    message.send(param);
  },
};

commands.csay = {
  name: 'csay',
  desc: 'says something in the specified channel',
  hide: true,
  owner: true,
  args: ['channel id', 'text'],
  fn: async (message, params, main) => {
    if (!main.bot.channels.get(params[0])) {
      return main.utils.argumentsError('csay', 0, 'Invalid channel ID (the bot needs to be on that server)');
    }

    const channel = main.bot.channels.get(params[0]);

    if (!channel.guild.members.get(main.bot.user.id).hasPermission('SEND_MESSAGES')) {
      return main.utils.argumentsError('csay', 0, 'Can not send the message to this channel. Missing `SEND_MESSAGES` permission!');
    }

    await channel.send(params[1]);

    message.send(`Message sent to channel #${channel.name} (${channel.id}) on server ${channel.guild.name} (${channel.guild.id})`);
  },
};

module.exports = commands;
