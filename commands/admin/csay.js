module.exports = {
  description: 'Says something in the specified channel',
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
      return ctx.main.stringUtils.argumentError(ctx, 0, 'Invalid channel ID (the bot needs to be on that server)');
    }

    if (!channel.permissionsFor(channel.guild.me).has('SEND_MESSAGES')) {
      return ctx.main.stringUtils.argumentError('csay', 0, 'Can not send the message to this channel. Missing `SEND_MESSAGES` permission');
    }

    const cmsg = await channel.send(text);
    ctx.replies.push(cmsg);

    return ctx.reply(`Message sent to channel <#${channel.id}> (ID: ${channel.id}) on server \`${channel.guild.name}\` (ID: ${channel.guild.id})`);
  },
};
