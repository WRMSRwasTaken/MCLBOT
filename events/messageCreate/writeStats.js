module.exports = {
  fn: (main, MessageCreate) => {
    if (MessageCreate.message.author.bot || MessageCreate.message.pinned || MessageCreate.message.system || !MessageCreate.message.guild) {
      return;
    }

    if (MessageCreate.message.content.length === 0 && MessageCreate.message.attachments.size === 0) {
      return;
    }

    return;

    main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
    main.db.member_messages.create({
      user_id: MessageCreate.message.author.id,
      guild_id: MessageCreate.message.guild.id,
      channel_id: MessageCreate.message.channel.id,
      message_id: MessageCreate.message.id,
      char_count: MessageCreate.message.content.length,
      word_count: (MessageCreate.message.content.length) ? MessageCreate.message.content.split(' ').length : 0,
      user_mention_count: MessageCreate.message.mentions().members.size + MessageCreate.message.mentions().roles.size + ((MessageCreate.message.mentions().everyone) ? MessageCreate.message.guild.memberCount : 0), // TODO: support @here
      attachment_count: MessageCreate.message.attachments.size,
      timestamp: MessageCreate.message.createdTimestamp,
    });
  },
};
