module.exports = {
  desc: 'says something in the specified channel',
  hide: true,
  owner: true,
  arguments: [
    {
      label: 'channel id',
      type: 'string',
    },
    {
      label: 'message',
      type: 'string',
      infinite: true,
    },
  ],
  fn: async (ctx, channelid, text) => {
    const channel = ctx.main.api.channels.get(channelid);

    if (!channel) {
      return ctx.main.stringUtils.argumentsError(ctx, 0, 'Invalid channel ID (the bot needs to be on that server)');
    }

    if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
      return ctx.main.stringUtils.argumentsError('csay', 0, 'Can not send the message to this channel. Missing `SEND_MESSAGES` permission');
    }

    const cmsg = await channel.send(text);
    ctx.message.replies.push(cmsg);

    return ctx.reply(`Message sent to channel \`#${channel.name}\` (ID: ${channel.id}) on server \`${channel.guild.name}\` (ID: ${channel.guild.id})`);
  },
};
