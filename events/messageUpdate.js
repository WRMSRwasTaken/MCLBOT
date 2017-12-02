module.exports = {
  fn: (main, oldMessage, newMessage) => {
    if (newMessage.guild && !newMessage.author.bot) {
      main.prometheusMetrics.influxWrites.inc();

      main.influx.query(`delete from member_message where message_id = ${main.Influx.escape.stringLit(newMessage.id)}`);

      main.prometheusMetrics.influxWrites.inc();

      main.influx.writePoints([
        {
          measurement: 'member_message',
          tags: {
            guild_id: newMessage.guild.id,
            user_id: newMessage.author.id,
            channel_id: newMessage.channel.id,
          },
          fields: {
            message_id: newMessage.id,
            char_count: newMessage.content.length,
            word_count: (newMessage.content.length) ? newMessage.content.split(' ').length : 0,
            user_mention_count: newMessage.mentions.members.size + newMessage.mentions.roles.size + ((newMessage.mentions.everyone) ? newMessage.guild.memberCount : 0),
            attachment_count: newMessage.attachments.size,
          },
        },
      ]);
    }

    main.commandHandler.handleMessageEvent(oldMessage, newMessage);
  },
};
