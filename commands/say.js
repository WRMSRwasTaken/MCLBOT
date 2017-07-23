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
    if (!main.api.channels.get(params[0])) {
      return main.utils.argumentsError('csay', 0, 'Invalid channel ID (the bot needs to be on that server)');
    }

    const channel = main.api.channels.get(params[0]);

    if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
      return main.utils.argumentsError('csay', 0, 'Can not send the message to this channel. Missing `SEND_MESSAGES` permission!');
    }

    const cmsg = await channel.send(params[1]);
    message.replies.push(cmsg);

    message.send(`Message sent to channel \`#${channel.name}\` (ID: ${channel.id}) on server \`${channel.guild.name}\` (ID: ${channel.guild.id})`);
  },
};

module.exports = commands;
