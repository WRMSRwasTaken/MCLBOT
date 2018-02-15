module.exports = {
  fn: (main, message) => {
    if (message.guild) {
      main.prometheusMetrics.influxWrites.inc();

      main.influx.writePoints([
        {
          measurement: 'member_message',
          tags: {
            guild_id: message.guild.id,
            user_id: message.author.id,
            channel_id: message.channel.id,
          },
          fields: {
            message_id: message.id,
            char_count: message.content.length,
            word_count: (message.content.length) ? message.content.split(' ').length : 0,
            user_mention_count: message.mentions.members.size + message.mentions.roles.size + ((message.mentions.everyone) ? message.guild.memberCount : 0),
            attachment_count: message.attachments.size,
          },
        },
      ]);

      main.prometheusMetrics.redisWrites.inc();

      main.redis.set(`member_last_message:${message.guild.id}:${message.author.id}`, message.createdTimestamp, 'EX', 31557600);
    }

    main.commandHandler.handleMessageEvent(message);

    // TODO: REPL CODE HERE
  },
};
