module.exports = {
  fn: (main, MessageUpdate) => {
    if (MessageUpdate.isEmbedUpdate) {
      return;
    }

    if (MessageUpdate.message.author.bot || MessageUpdate.message.pinned || MessageUpdate.message.system || !MessageUpdate.message.guild) {
      return;
    }

    if (MessageUpdate.message.content.length === 0 && MessageUpdate.message.attachments.size === 0) {
      return;
    }

    return;

    main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
    main.db.member_messages.upsert({
      user_id: MessageUpdate.message.author.id,
      guild_id: MessageUpdate.message.guild.id,
      channel_id: MessageUpdate.message.channel.id,
      message_id: MessageUpdate.message.id,
      char_count: MessageUpdate.message.content.length,
      word_count: (MessageUpdate.message.content.length) ? MessageUpdate.message.content.split(' ').length : 0,
      user_mention_count: MessageUpdate.message.mentions.members.size + MessageUpdate.message.mentions.roles.size + ((MessageUpdate.message.mentions.everyone) ? MessageUpdate.message.guild.memberCount : 0), // TODO: support @here
      attachment_count: MessageUpdate.message.attachments.size,
      timestamp: MessageUpdate.message.createdTimestamp,
    });
  },
};
