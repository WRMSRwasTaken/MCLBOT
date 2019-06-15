module.exports = {
  fn: (main, oldMessage, newMessage) => {
    if (newMessage.author.bot || newMessage.pinned || newMessage.system || !newMessage.guild) {
      return;
    }

    if (newMessage.content.length !== 0 && newMessage.attachments.size !== 0) {
      main.prometheusMetrics.sqlCommands.labels('UPDATE').inc();
      main.db.member_messages.upsert({
        user_id: newMessage.author.id,
        guild_id: newMessage.guild.id,
        channel_id: newMessage.channel.id,
        message_id: newMessage.id,
        char_count: newMessage.content.length,
        word_count: (newMessage.content.length) ? newMessage.content.split(' ').length : 0,
        user_mention_count: newMessage.mentions.members.size + newMessage.mentions.roles.size + ((newMessage.mentions.everyone) ? newMessage.guild.memberCount : 0), // TODO: support @here
        attachment_count: newMessage.attachments.size,
        timestamp: newMessage.createdTimestamp,
      });
    }
  },
};
