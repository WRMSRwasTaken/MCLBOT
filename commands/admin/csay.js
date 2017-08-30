module.exports = {
  desc: 'says something in the specified channel',
  // hide: true,
  owner: true,
  args: '<channel:channel> <string:text...>',
  fn: async (ctx, channel, text) => {
    // if (!main.api.channels.get(params[0])) {
    //   return main.stringUtils.argumentsError('csay', 0, 'Invalid channel ID (the bot needs to be on that server)');
    // }

    // const channel = main.api.channels.get(params[0]);

    if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
      return ctx.main.stringUtils.argumentsError('csay', 0, 'Can not send the message to this channel. Missing `SEND_MESSAGES` permission!');
    }

    const cmsg = await channel.send(text);
    ctx.message.replies.push(cmsg);

    ctx.send(`Message sent to channel \`#${channel.name}\` (ID: ${channel.id}) on server \`${channel.guild.name}\` (ID: ${channel.guild.id})`);
  },
};
