module.exports = {
  fn: (main, message) => {
    if (message.guild) {
      main.prometheusMetrics.sqlCommands.labels('INSERT').inc();
      main.db.member_messages.create({
        user_id: message.author.id,
        guild_id: message.guild.id,
        channel_id: message.channel.id,
        message_id: message.id,
        char_count: message.content.length,
        word_count: (message.content.length) ? message.content.split(' ').length : 0,
        user_mention_count: message.mentions.members.size + message.mentions.roles.size + ((message.mentions.everyone) ? message.guild.memberCount : 0), // TODO: support @here
        attachment_count: message.attachments.size,
        timestamp: message.createdTimestamp,
      });
    }
  },
};
